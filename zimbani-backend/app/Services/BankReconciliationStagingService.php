<?php

namespace App\Services;

use App\Models\BankReconciliationBatch;
use App\Models\BankStatementEntry;
use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BankReconciliationStagingService
{
    /**
     * Create a new Bank Statement Reconciliation Batch.
     */
    public function createBatch(array $data, ?int $userId = null): BankReconciliationBatch
    {
        return BankReconciliationBatch::create([
            'bank_name' => $data['bank_name'] ?? 'Stanbic Bank Uganda',
            'account_number' => $data['account_number'] ?? '9030018274619',
            'currency' => $data['currency'] ?? 'UGX',
            'statement_period_start' => $data['statement_period_start'] ?? now()->startOfMonth()->toDateString(),
            'statement_period_end' => $data['statement_period_end'] ?? now()->endOfMonth()->toDateString(),
            'opening_balance' => $data['opening_balance'] ?? 50000000.00,
            'closing_balance' => $data['closing_balance'] ?? 50000000.00,
            'reconciled_by' => $userId,
            'status' => 'uploaded',
        ]);
    }

    /**
     * Seed a realistic demo statement batch with 10 statement entries for testing.
     */
    public function seedDemoBatch(?int $userId = null): BankReconciliationBatch
    {
        return DB::transaction(function () use ($userId) {
            // Find or create sample confirmed payments to match
            $recentPayments = Payment::where('status', 'confirmed')->latest()->take(4)->get();

            $batch = BankReconciliationBatch::create([
                'bank_name' => 'Stanbic Bank Uganda Ltd',
                'account_number' => '9030018274619',
                'currency' => 'UGX',
                'statement_period_start' => now()->startOfMonth()->toDateString(),
                'statement_period_end' => now()->toDateString(),
                'opening_balance' => 45000000.00,
                'closing_balance' => 74525000.00,
                'status' => 'uploaded',
                'reconciled_by' => $userId,
            ]);

            $runningBalance = 45000000.00;
            $totalCredits = 0.00;
            $totalDebits = 0.00;

            // Line 1-4: Exact Reference matches from recent payments
            foreach ($recentPayments as $idx => $p) {
                $ref = $p->reference_number ?: $p->payment_number;
                $runningBalance += (float) $p->amount;
                $totalCredits += (float) $p->amount;

                BankStatementEntry::create([
                    'batch_id' => $batch->id,
                    'bank_transaction_id' => 'STB-FT-' . rand(1000000, 9999999),
                    'value_date' => $p->payment_date ?: now()->subDays(2)->toDateString(),
                    'booking_date' => now()->toDateString(),
                    'narration' => "COLLECTION {$p->payment_method} REF: {$ref}",
                    'entry_type' => 'credit',
                    'amount' => $p->amount,
                    'currency' => 'UGX',
                    'running_balance' => $runningBalance,
                    'matching_status' => 'unmatched',
                ]);
            }

            // Line 5: Mobile Money Bulk Sweep (MTN MoMo)
            $momoSweepAmount = 8500000.00;
            $runningBalance += $momoSweepAmount;
            $totalCredits += $momoSweepAmount;
            BankStatementEntry::create([
                'batch_id' => $batch->id,
                'bank_transaction_id' => 'MTN-SWEEP-' . rand(100000, 999999),
                'value_date' => now()->subDays(3)->toDateString(),
                'narration' => 'MTN MOBILE MONEY ESCROW SETTLEMENT SWEEP #9824',
                'entry_type' => 'credit',
                'amount' => $momoSweepAmount,
                'currency' => 'UGX',
                'running_balance' => $runningBalance,
                'matching_status' => 'unmatched',
            ]);

            // Line 6: Airtel Money Bulk Sweep
            $airtelAmount = 6200000.00;
            $runningBalance += $airtelAmount;
            $totalCredits += $airtelAmount;
            BankStatementEntry::create([
                'batch_id' => $batch->id,
                'bank_transaction_id' => 'AIRTEL-SWEEP-' . rand(100000, 999999),
                'value_date' => now()->subDays(4)->toDateString(),
                'narration' => 'AIRTEL MONEY DISBURSEMENT CLEARING SWEEP',
                'entry_type' => 'credit',
                'amount' => $airtelAmount,
                'currency' => 'UGX',
                'running_balance' => $runningBalance,
                'matching_status' => 'unmatched',
            ]);

            // Line 7: Diaspora Bank Wire (Stanbic EFT)
            $wireAmount = 15000000.00;
            $runningBalance += $wireAmount;
            $totalCredits += $wireAmount;
            BankStatementEntry::create([
                'batch_id' => $batch->id,
                'bank_transaction_id' => 'BOU-EFT-' . rand(1000000, 9999999),
                'value_date' => now()->subDays(1)->toDateString(),
                'narration' => 'RTGS INWARD REMITTANCE: KATO MUKASA PLOT 42',
                'entry_type' => 'credit',
                'amount' => $wireAmount,
                'currency' => 'UGX',
                'running_balance' => $runningBalance,
                'matching_status' => 'unmatched',
            ]);

            // Line 8: Bank Maintenance Ledger Fee (Debit)
            $feeAmount = 75000.00;
            $runningBalance -= $feeAmount;
            $totalDebits += $feeAmount;
            BankStatementEntry::create([
                'batch_id' => $batch->id,
                'bank_transaction_id' => 'BNK-FEE-' . rand(10000, 99999),
                'value_date' => now()->toDateString(),
                'narration' => 'STANBIC MONTHLY CORPORATE ACCOUNT SERVICE CHARGE',
                'entry_type' => 'debit',
                'amount' => $feeAmount,
                'currency' => 'UGX',
                'running_balance' => $runningBalance,
                'matching_status' => 'unmatched',
            ]);

            // Line 9: Unmatched Direct Over-the-Counter Deposit
            $unmatchedDeposit = 4500000.00;
            $runningBalance += $unmatchedDeposit;
            $totalCredits += $unmatchedDeposit;
            BankStatementEntry::create([
                'batch_id' => $batch->id,
                'bank_transaction_id' => 'OTC-DEP-' . rand(100000, 999999),
                'value_date' => now()->toDateString(),
                'narration' => 'BRANCH CASH DEPOSIT: TELLER 04 KAMPALA MAIN',
                'entry_type' => 'credit',
                'amount' => $unmatchedDeposit,
                'currency' => 'UGX',
                'running_balance' => $runningBalance,
                'matching_status' => 'unmatched',
            ]);

            $entriesCount = $batch->entries()->count();
            $batch->update([
                'closing_balance' => $runningBalance,
                'total_credits' => $totalCredits,
                'total_debits' => $totalDebits,
                'total_entries_count' => $entriesCount,
                'unmatched_entries_count' => $entriesCount,
                'variance_amount' => round($runningBalance - 45000000.00 - ($totalCredits - $totalDebits), 2),
            ]);

            return $batch->fresh('entries');
        });
    }

    /**
     * Automated Rule-Based Statement Reconciliation Engine.
     */
    public function autoReconcileBatch(string|int $batchId, ?int $userId = null): BankReconciliationBatch
    {
        return DB::transaction(function () use ($batchId, $userId) {
            $batch = BankReconciliationBatch::where('id', $batchId)
                ->orWhere('uuid', $batchId)
                ->firstOrFail();

            $entries = $batch->entries()->where('matching_status', 'unmatched')->get();

            foreach ($entries as $entry) {
                // Rule 1: Exact Reference Match in narration
                $matchedPayment = null;
                $matchedIntent = null;
                $matchingRule = null;
                $confidence = 0;

                // Extract potential tokens from narration
                preg_match_all('/(PAY-[A-Z0-9-]+|INT-[A-Z0-9-]+|TXN-[A-Z0-9-]+)/', $entry->narration, $matches);
                $tokens = $matches[0] ?? [];

                foreach ($tokens as $token) {
                    $matchedPayment = Payment::where('payment_number', $token)
                        ->orWhere('reference_number', $token)
                        ->first();

                    if ($matchedPayment) {
                        $matchingRule = 'exact_reference';
                        $confidence = 100;
                        break;
                    }

                    $matchedIntent = PaymentIntent::where('intent_reference', $token)->first();
                    if ($matchedIntent && $matchedIntent->payment_id) {
                        $matchedPayment = Payment::find($matchedIntent->payment_id);
                        $matchingRule = 'exact_reference';
                        $confidence = 100;
                        break;
                    }
                }

                // Rule 2: Amount + Value Date Window Match (+/- 3 days)
                if (!$matchedPayment && $entry->entry_type === 'credit') {
                    $dateFrom = Carbon::parse($entry->value_date)->subDays(3)->toDateString();
                    $dateTo = Carbon::parse($entry->value_date)->addDays(3)->toDateString();

                    $candidate = Payment::where('status', 'confirmed')
                        ->where('amount', $entry->amount)
                        ->whereBetween('payment_date', [$dateFrom, $dateTo])
                        ->whereDoesntHave('reconciliationEntries')
                        ->first();

                    if ($candidate) {
                        $matchedPayment = $candidate;
                        $matchingRule = 'amount_date_window';
                        $confidence = 85;
                    }
                }

                if ($matchedPayment) {
                    $entry->update([
                        'matching_status' => $confidence === 100 ? 'matched_exact' : 'matched_fuzzy',
                        'match_confidence_score' => $confidence,
                        'matched_payment_id' => $matchedPayment->id,
                        'matched_payment_intent_id' => $matchedIntent?->id,
                        'matching_rule' => $matchingRule,
                    ]);
                }
            }

            // Recalculate batch statistics
            $totalCount = $batch->entries()->count();
            $matchedCount = $batch->entries()->whereIn('matching_status', ['matched_exact', 'matched_fuzzy', 'manually_cleared'])->count();
            $unmatchedCount = $totalCount - $matchedCount;

            $status = $unmatchedCount === 0 ? 'reconciled' : 'processing';

            $batch->update([
                'matched_entries_count' => $matchedCount,
                'unmatched_entries_count' => $unmatchedCount,
                'status' => $status,
                'reconciled_by' => $userId ?? auth()->id(),
                'reconciled_at' => $unmatchedCount === 0 ? now() : null,
            ]);

            return $batch->fresh('entries.matchedPayment');
        });
    }

    /**
     * Manually match a bank statement entry with a payment.
     */
    public function manualMatchEntry(int $entryId, int $paymentId, ?string $notes = null): BankStatementEntry
    {
        $entry = BankStatementEntry::findOrFail($entryId);
        $payment = Payment::findOrFail($paymentId);

        $entry->update([
            'matching_status' => 'manually_cleared',
            'match_confidence_score' => 100,
            'matched_payment_id' => $payment->id,
            'matching_rule' => 'manual',
            'discrepancy_notes' => $notes,
        ]);

        // Refresh batch counts
        $batch = $entry->batch;
        $matchedCount = $batch->entries()->whereIn('matching_status', ['matched_exact', 'matched_fuzzy', 'manually_cleared'])->count();
        $unmatchedCount = $batch->entries()->count() - $matchedCount;

        $batch->update([
            'matched_entries_count' => $matchedCount,
            'unmatched_entries_count' => $unmatchedCount,
            'status' => $unmatchedCount === 0 ? 'reconciled' : 'processing',
        ]);

        return $entry->fresh(['matchedPayment', 'batch']);
    }

    /**
     * Get statement batches list.
     */
    public function getBatches(array $filters = []): array
    {
        $query = BankReconciliationBatch::withCount(['entries'])
            ->with(['reconciledByUser'])
            ->latest('statement_period_end');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['bank_name'])) {
            $query->where('bank_name', 'like', "%{$filters['bank_name']}%");
        }

        return $query->get()->toArray();
    }

    /**
     * Get single batch details with entries.
     */
    public function getBatchDetails(string|int $batchId): array
    {
        $batch = BankReconciliationBatch::with([
            'entries.matchedPayment',
            'entries.matchedPaymentIntent',
            'reconciledByUser'
        ])
        ->where('id', $batchId)
        ->orWhere('uuid', $batchId)
        ->firstOrFail();

        return $batch->toArray();
    }
}
