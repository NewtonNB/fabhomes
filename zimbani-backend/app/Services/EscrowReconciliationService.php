<?php

namespace App\Services;

use App\Models\EscrowReconciliation;
use App\Models\EscrowReconciliationItem;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\MilestonePaymentRelease;
use App\Models\Project;
use App\Models\User;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Exception;

class EscrowReconciliationService
{
    /**
     * Create an Escrow Account Reconciliation record and execute automated matching.
     */
    public function createReconciliation(SavingsAccount $account, array $data, User $user): EscrowReconciliation
    {
        return DB::transaction(function () use ($account, $data, $user) {
            $statementDate = $data['statement_date'] ?? now()->toDateString();
            $statementBalance = round(floatval($data['statement_balance']), 2);
            $bookBalance = round(floatval($account->fresh()->current_balance), 2);
            $variance = round($statementBalance - $bookBalance, 2);

            $status = abs($variance) < 0.01 ? 'reconciled' : 'variance_detected';

            $reconciliation = EscrowReconciliation::create([
                'savings_account_id' => $account->id,
                'project_id' => $data['project_id'] ?? $account->project_id,
                'institution_name' => $data['institution_name'] ?? 'Stanbic Bank Uganda - Escrow Division',
                'statement_reference' => $data['statement_reference'] ?? null,
                'statement_date' => $statementDate,
                'statement_balance' => $statementBalance,
                'book_balance' => $bookBalance,
                'variance_amount' => $variance,
                'currency' => $data['currency'] ?? $account->currency ?? 'USD',
                'status' => $status,
                'notes' => $data['notes'] ?? null,
                'reconciled_by' => $user->id,
                'reconciled_at' => now(),
                'created_by' => $user->id,
            ]);

            // Auto-match items from internal ledger transactions & releases
            $externalItems = $data['external_items'] ?? [];
            $this->autoMatchItems($reconciliation, $externalItems, $user);

            // Audit activity
            Activity::log(
                'escrow_reconciliation_created',
                "Created Escrow Reconciliation {$reconciliation->reconciliation_number} for Account {$account->account_number} (Variance: {$reconciliation->currency} {$reconciliation->variance_amount})",
                $reconciliation,
                $user
            );

            return $reconciliation->load(['items', 'savingsAccount', 'project', 'reconciledBy']);
        });
    }

    /**
     * Auto-match transactions, payments, and external bank entries.
     */
    public function autoMatchItems(EscrowReconciliation $reconciliation, array $externalItems, User $user): void
    {
        $account = $reconciliation->savingsAccount;
        if (!$account) {
            return;
        }

        $matchedCount = 0;
        $unmatchedCount = 0;

        // 1. Fetch recent transactions for this savings/escrow account
        $transactions = Transaction::where('account_id', $account->id)
            ->whereDate('transaction_date', '<=', $reconciliation->statement_date)
            ->latest('transaction_date')
            ->take(50)
            ->get();

        // 2. Fetch milestone releases disbursed or authorized from this escrow account
        $releases = MilestonePaymentRelease::where('savings_account_id', $account->id)
            ->whereIn('status', ['authorized', 'disbursed'])
            ->get();

        // Match external lines if provided
        if (!empty($externalItems)) {
            foreach ($externalItems as $ext) {
                $extAmount = round(floatval($ext['amount']), 2);
                $extRef = $ext['reference'] ?? null;
                $extType = $ext['type'] ?? 'deposit_matched';

                // Attempt to match with a transaction
                $matchedTxn = $transactions->first(function ($txn) use ($extAmount, $extRef) {
                    $matchesAmount = abs(abs(floatval($txn->amount)) - abs($extAmount)) < 0.01;
                    $matchesRef = $extRef && ($txn->reference_number === $extRef || str_contains($txn->description ?? '', $extRef));
                    return $matchesAmount || $matchesRef;
                });

                if ($matchedTxn) {
                    EscrowReconciliationItem::create([
                        'escrow_reconciliation_id' => $reconciliation->id,
                        'transaction_id' => $matchedTxn->id,
                        'item_type' => $extType,
                        'external_reference' => $extRef ?? $matchedTxn->reference_number,
                        'external_date' => $ext['date'] ?? $reconciliation->statement_date,
                        'statement_amount' => $extAmount,
                        'ledger_amount' => abs(floatval($matchedTxn->amount)),
                        'variance' => 0.00,
                        'status' => 'matched',
                        'notes' => 'Auto-matched by transaction reference/amount.',
                    ]);
                    $matchedCount++;
                } else {
                    EscrowReconciliationItem::create([
                        'escrow_reconciliation_id' => $reconciliation->id,
                        'item_type' => $extType === 'deposit_matched' ? 'deposit_in_transit' : 'unexplained_variance',
                        'external_reference' => $extRef,
                        'external_date' => $ext['date'] ?? $reconciliation->statement_date,
                        'statement_amount' => $extAmount,
                        'ledger_amount' => 0.00,
                        'variance' => $extAmount,
                        'status' => 'unmatched',
                        'notes' => 'External line not matched with internal ledger.',
                    ]);
                    $unmatchedCount++;
                }
            }
        } else {
            // Baseline matching from internal ledger
            foreach ($transactions->take(15) as $txn) {
                $amount = abs(floatval($txn->amount));
                $type = floatval($txn->amount) >= 0 ? 'deposit_matched' : 'disbursement_matched';

                EscrowReconciliationItem::create([
                    'escrow_reconciliation_id' => $reconciliation->id,
                    'transaction_id' => $txn->id,
                    'item_type' => $type,
                    'external_reference' => $txn->reference_number ?? $txn->transaction_number,
                    'external_date' => $txn->transaction_date ? $txn->transaction_date->toDateString() : $reconciliation->statement_date,
                    'statement_amount' => $amount,
                    'ledger_amount' => $amount,
                    'variance' => 0.00,
                    'status' => 'matched',
                    'notes' => 'Verified against internal ledger transaction ' . $txn->transaction_number,
                ]);
                $matchedCount++;
            }

            // If there is an unresolved variance, record it as a reconciliation variance item
            if (abs($reconciliation->variance_amount) >= 0.01) {
                EscrowReconciliationItem::create([
                    'escrow_reconciliation_id' => $reconciliation->id,
                    'item_type' => $reconciliation->variance_amount > 0 ? 'deposit_in_transit' : 'timing_difference',
                    'external_reference' => 'VARIANCE-' . now()->format('Ymd'),
                    'external_date' => $reconciliation->statement_date,
                    'statement_amount' => $reconciliation->statement_balance,
                    'ledger_amount' => $reconciliation->book_balance,
                    'variance' => $reconciliation->variance_amount,
                    'status' => 'unmatched',
                    'notes' => 'Net statement variance detected. Pending bank charge verification or deposit in transit.',
                ]);
                $unmatchedCount++;
            }
        }

        $reconciliation->update([
            'matched_items_count' => $matchedCount,
            'unmatched_items_count' => $unmatchedCount,
            'status' => $unmatchedCount === 0 && abs($reconciliation->variance_amount) < 0.01 ? 'reconciled' : 'variance_detected',
        ]);
    }

    /**
     * Resolve an individual reconciliation variance item.
     */
    public function resolveVarianceItem(EscrowReconciliationItem $item, array $resolutionData, User $user): EscrowReconciliationItem
    {
        return DB::transaction(function () use ($item, $resolutionData, $user) {
            $item->update([
                'status' => 'resolved',
                'notes' => ($item->notes ? $item->notes . "\n" : '') . "[Resolved by {$user->name} on " . now()->toDateTimeString() . "]: " . ($resolutionData['notes'] ?? 'Variance reconciled with supporting voucher.'),
                'resolved_by' => $user->id,
                'resolved_at' => now(),
            ]);

            $reconciliation = $item->reconciliation;
            $remainingUnmatched = $reconciliation->items()->where('status', 'unmatched')->count();

            $newStatus = $remainingUnmatched === 0 ? 'reconciled' : 'variance_detected';
            $reconciliation->update([
                'unmatched_items_count' => $remainingUnmatched,
                'matched_items_count' => $reconciliation->items()->whereIn('status', ['matched', 'resolved'])->count(),
                'status' => $newStatus,
            ]);

            return $item->fresh(['resolvedBy']);
        });
    }

    /**
     * Approve and sign-off on an Escrow Reconciliation.
     */
    public function approveReconciliation(EscrowReconciliation $reconciliation, User $user, ?string $notes = null): EscrowReconciliation
    {
        return DB::transaction(function () use ($reconciliation, $user, $notes) {
            if ($reconciliation->status === 'approved') {
                throw ValidationException::withMessages([
                    'reconciliation' => ['This escrow reconciliation is already approved and finalized.'],
                ]);
            }

            $reconciliation->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'notes' => ($reconciliation->notes ? $reconciliation->notes . "\n" : '') .
                    "[Approved by {$user->name} on " . now()->toDateTimeString() . "]" . ($notes ? ": {$notes}" : ''),
            ]);

            Activity::log(
                'escrow_reconciliation_approved',
                "Approved Escrow Reconciliation {$reconciliation->reconciliation_number} by {$user->name}",
                $reconciliation,
                $user
            );

            return $reconciliation->fresh(['items', 'approvedBy', 'reconciledBy', 'savingsAccount']);
        });
    }

    /**
     * Get reconciliation history and statistics for a specific escrow/savings account.
     */
    public function getAccountReconciliations(SavingsAccount $account): array
    {
        $reconciliations = EscrowReconciliation::where('savings_account_id', $account->id)
            ->with(['reconciledBy:id,name', 'approvedBy:id,name'])
            ->latest('statement_date')
            ->get();

        $latestApproved = $reconciliations->firstWhere('status', 'approved');

        return [
            'account_id' => $account->id,
            'account_number' => $account->account_number,
            'current_book_balance' => (float) $account->current_balance,
            'currency' => $account->currency,
            'last_reconciled_date' => $latestApproved ? $latestApproved->statement_date->toDateString() : null,
            'total_reconciliations' => $reconciliations->count(),
            'reconciled_count' => $reconciliations->whereIn('status', ['reconciled', 'approved'])->count(),
            'variance_count' => $reconciliations->where('status', 'variance_detected')->count(),
            'reconciliations' => $reconciliations,
        ];
    }

    /**
     * Get project-level escrow portfolio reconciliation summary across all client accounts.
     */
    public function getProjectEscrowReconciliationSummary(Project $project): array
    {
        $accounts = SavingsAccount::where('project_id', $project->id)->get();
        $accountIds = $accounts->pluck('id');

        $reconciliations = EscrowReconciliation::whereIn('savings_account_id', $accountIds)->get();

        $totalEscrowBalance = $accounts->sum('current_balance');
        $totalTargetEscrow = $accounts->sum('target_amount');
        $totalVariance = $reconciliations->where('status', 'variance_detected')->sum('variance_amount');

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'accounts_count' => $accounts->count(),
            'total_escrow_book_balance' => round((float) $totalEscrowBalance, 2),
            'total_target_escrow' => round((float) $totalTargetEscrow, 2),
            'total_variance' => round((float) $totalVariance, 2),
            'reconciliations_count' => $reconciliations->count(),
            'reconciled_percentage' => $accounts->count() > 0 
                ? round(($reconciliations->whereIn('status', ['reconciled', 'approved'])->count() / $accounts->count()) * 100, 1) 
                : 100.0,
            'accounts' => $accounts->map(function ($acc) {
                $latestRec = EscrowReconciliation::where('savings_account_id', $acc->id)->latest('statement_date')->first();
                return [
                    'id' => $acc->id,
                    'uuid' => $acc->uuid,
                    'account_number' => $acc->account_number,
                    'client_name' => $acc->client ? $acc->client->full_name : 'Escrow Fund',
                    'current_balance' => (float) $acc->current_balance,
                    'currency' => $acc->currency,
                    'status' => $acc->status,
                    'last_reconciliation_status' => $latestRec ? $latestRec->status : 'never_reconciled',
                    'last_reconciliation_date' => $latestRec ? $latestRec->statement_date->toDateString() : null,
                    'variance' => $latestRec ? (float) $latestRec->variance_amount : 0.00,
                ];
            }),
        ];
    }
}
