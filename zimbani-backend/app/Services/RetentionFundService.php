<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\DefectLiabilityCertificate;
use App\Models\MilestonePaymentRelease;
use App\Models\PaymentCertificate;
use App\Models\Project;
use App\Models\PunchListItem;
use App\Models\RetentionFund;
use App\Models\RetentionTransaction;
use App\Models\SubcontractorContract;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RetentionFundService
{
    /**
     * Get or initialize a retention fund account for a subcontractor trade contract.
     */
    public function getOrCreateFundForContract(SubcontractorContract $contract): RetentionFund
    {
        $fund = RetentionFund::where('contract_id', $contract->id)->first();

        if ($fund) {
            return $fund;
        }

        return RetentionFund::create([
            'project_id' => $contract->project_id,
            'contract_id' => $contract->id,
            'beneficiary_type' => 'subcontractor',
            'beneficiary_name' => $contract->subcontractor_name,
            'fund_type' => 'contractor_retention',
            'total_withheld_amount' => 0.00,
            'total_deductions_amount' => 0.00,
            'total_released_amount' => 0.00,
            'current_balance' => 0.00,
            'currency' => $contract->currency ?? 'USD',
            'retention_rate' => $contract->retention_percentage ?? 5.00,
            'status' => 'accumulating',
            'dlp_period_days' => 180, // 6 months standard FIDIC
        ]);
    }

    /**
     * Record retention withheld from a subcontractor Payment Certificate or client Milestone Release.
     */
    public function recordRetentionWithheld(
        RetentionFund $fund,
        float $amount,
        ?PaymentCertificate $certificate = null,
        ?MilestonePaymentRelease $release = null,
        ?string $reference = null,
        ?string $notes = null,
        ?User $user = null
    ): RetentionTransaction {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Withheld retention amount must be greater than zero.');
        }

        return DB::transaction(function () use ($fund, $amount, $certificate, $release, $reference, $notes, $user) {
            $balanceBefore = (float) $fund->current_balance;
            $newWithheld = (float) $fund->total_withheld_amount + $amount;
            $balanceAfter = $balanceBefore + $amount;

            $fund->total_withheld_amount = $newWithheld;
            $fund->current_balance = $balanceAfter;

            if ($fund->status === 'accumulating' || $fund->status === 'holding') {
                // Preserve holding if DLP already commenced
            } else {
                $fund->status = 'accumulating';
            }

            $fund->save();

            $txn = RetentionTransaction::create([
                'retention_fund_id' => $fund->id,
                'payment_certificate_id' => $certificate?->id,
                'milestone_payment_release_id' => $release?->id,
                'transaction_type' => 'withholding',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => $reference ?? ($certificate?->certificate_number ?? $release?->release_number),
                'description' => $notes ?? ("5% Retention withheld: " . ($certificate?->certificate_number ?? $release?->release_number ?? $fund->fund_number)),
                'processed_by' => $user?->id ?? auth()->id(),
                'processed_at' => now(),
            ]);

            Activity::log(
                'retention_withheld',
                "Withheld retention of {$amount} {$fund->currency} for {$fund->beneficiary_name} into fund {$fund->fund_number}",
                $fund,
                $user ?? auth()->user()
            );

            return $txn;
        });
    }

    /**
     * Record a deduction from retention for third-party defect rectification.
     */
    public function recordRectificationDeduction(
        RetentionFund $fund,
        float $amount,
        string $reason,
        ?User $user = null
    ): RetentionTransaction {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Deduction amount must be greater than zero.');
        }

        if ($amount > (float) $fund->current_balance) {
            throw new InvalidArgumentException("Deduction amount ({$amount}) exceeds available retention balance ({$fund->current_balance}).");
        }

        return DB::transaction(function () use ($fund, $amount, $reason, $user) {
            $balanceBefore = (float) $fund->current_balance;
            $balanceAfter = $balanceBefore - $amount;

            $fund->total_deductions_amount = (float) $fund->total_deductions_amount + $amount;
            $fund->current_balance = $balanceAfter;

            if ($balanceAfter <= 0 && (float) $fund->total_released_amount <= 0) {
                $fund->status = 'forfeited';
            }

            $fund->save();

            $txn = RetentionTransaction::create([
                'retention_fund_id' => $fund->id,
                'transaction_type' => 'rectification_deduction',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => 'RECT-' . date('Ymd-His'),
                'description' => "Defect Rectification Deduction: {$reason}",
                'processed_by' => $user?->id ?? auth()->id(),
                'processed_at' => now(),
            ]);

            Activity::log(
                'retention_deduction',
                "Deducted {$amount} {$fund->currency} from retention fund {$fund->fund_number} for defect rectification: {$reason}",
                $fund,
                $user ?? auth()->user()
            );

            return $txn;
        });
    }

    /**
     * Commence Defect Liability Period (DLP) upon Practical Completion.
     */
    public function startDefectLiabilityPeriod(
        RetentionFund $fund,
        string $practicalCompletionDate,
        int $dlpDays = 180,
        ?User $user = null
    ): RetentionFund {
        $commenced = Carbon::parse($practicalCompletionDate);
        $expiry = (clone $commenced)->addDays($dlpDays);

        $fund->update([
            'practical_completion_date' => $commenced->toDateString(),
            'dlp_commenced_at' => $commenced->toDateString(),
            'dlp_period_days' => $dlpDays,
            'dlp_expiry_date' => $expiry->toDateString(),
            'status' => 'holding',
            'eligible_for_release' => false,
        ]);

        Activity::log(
            'dlp_commenced',
            "Defect Liability Period commenced for {$fund->beneficiary_name} ({$dlpDays} days until {$expiry->toDateString()})",
            $fund,
            $user ?? auth()->user()
        );

        return $fund->fresh();
    }

    /**
     * Evaluate DLP maturity and punch list defect clearance.
     */
    public function evaluateDlpAndSnagClearance(RetentionFund $fund): array
    {
        $now = Carbon::today();
        $isMatured = false;
        $daysRemaining = 0;

        if ($fund->dlp_expiry_date) {
            $expiry = Carbon::parse($fund->dlp_expiry_date);
            $isMatured = $now->greaterThanOrEqualTo($expiry);
            $daysRemaining = $isMatured ? 0 : $now->diffInDays($expiry);
        }

        // Query defects for this contract / project / unit
        $punchQuery = PunchListItem::where('project_id', $fund->project_id);

        if ($fund->contract_id) {
            $punchQuery->where(function ($q) use ($fund) {
                $q->where('subcontractor_name', 'like', "%{$fund->beneficiary_name}%")
                  ->orWhere('assigned_to', $fund->contract?->subcontractor_name);
            });
        }

        if ($fund->unit_id) {
            $punchQuery->where('unit_id', $fund->unit_id);
        }

        $openSnagsCount = (clone $punchQuery)->whereIn('status', ['open', 'in_progress'])->count();
        $rectifiedSnagsCount = (clone $punchQuery)->where('status', 'rectified')->count();
        $closedSnagsCount = (clone $punchQuery)->whereIn('status', ['verified_closed', 'waived'])->count();
        $totalSnagsCount = (clone $punchQuery)->count();

        $snagsCleared = ($openSnagsCount === 0 && $rectifiedSnagsCount === 0);
        $eligibleForRelease = $isMatured && $snagsCleared && ((float) $fund->current_balance > 0);

        if ($eligibleForRelease && !$fund->eligible_for_release) {
            $fund->update([
                'eligible_for_release' => true,
                'cleared_for_release_at' => now(),
            ]);
        }

        return [
            'is_dlp_matured' => $isMatured,
            'days_remaining' => $daysRemaining,
            'dlp_expiry_date' => $fund->dlp_expiry_date?->toDateString(),
            'total_snags' => $totalSnagsCount,
            'open_snags' => $openSnagsCount,
            'rectified_awaiting_verification' => $rectifiedSnagsCount,
            'closed_snags' => $closedSnagsCount,
            'snags_cleared' => $snagsCleared,
            'eligible_for_release' => $eligibleForRelease,
            'current_balance' => (float) $fund->current_balance,
            'currency' => $fund->currency,
        ];
    }

    /**
     * Authorize and release retention funds (interim 50% or final 100%).
     */
    public function releaseRetention(
        RetentionFund $fund,
        float $amount,
        string $releaseType = 'final_release',
        ?DefectLiabilityCertificate $certificate = null,
        ?string $notes = null,
        ?User $user = null
    ): RetentionTransaction {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Release amount must be greater than zero.');
        }

        $balance = (float) $fund->current_balance;
        if ($amount > $balance) {
            throw new InvalidArgumentException("Release amount ({$amount}) exceeds available retention balance ({$balance}).");
        }

        return DB::transaction(function () use ($fund, $amount, $releaseType, $certificate, $notes, $user) {
            $balanceBefore = (float) $fund->current_balance;
            $newReleased = (float) $fund->total_released_amount + $amount;
            $balanceAfter = round($balanceBefore - $amount, 2);

            $fund->total_released_amount = $newReleased;
            $fund->current_balance = $balanceAfter;

            if ($balanceAfter <= 0.01) {
                $fund->status = 'fully_released';
                $fund->eligible_for_release = false;
            } else {
                $fund->status = 'partially_released';
            }

            $fund->save();

            // Link to double-entry ledger transaction if applicable
            $ledgerTxnId = null;
            if ($fund->client_id) {
                // Record against client escrow account if client reserve
                $clientAccount = \App\Models\SavingsAccount::where('client_id', $fund->client_id)->first();
                if ($clientAccount) {
                    $ledgerTxn = Transaction::record([
                        'account_id' => $clientAccount->id,
                        'client_id' => $fund->client_id,
                        'amount' => -$amount,
                        'currency' => $fund->currency,
                        'transaction_type' => 'retention_release',
                        'description' => "Defect Liability Retention Release ({$fund->fund_number})",
                        'narration' => $notes ?? "Released {$amount} {$fund->currency} retention to {$fund->beneficiary_name}",
                        'reference_number' => $fund->fund_number . '-REL',
                        'value_date' => now()->toDateString(),
                        'created_by' => $user?->id ?? auth()->id(),
                    ]);
                    $ledgerTxnId = $ledgerTxn->id;
                }
            }

            $txn = RetentionTransaction::create([
                'retention_fund_id' => $fund->id,
                'defect_liability_certificate_id' => $certificate?->id,
                'ledger_transaction_id' => $ledgerTxnId,
                'transaction_type' => $releaseType,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => 'REL-' . date('Ymd-His'),
                'description' => $notes ?? ("Retention {$releaseType} for {$fund->beneficiary_name}"),
                'processed_by' => $user?->id ?? auth()->id(),
                'processed_at' => now(),
            ]);

            // Update linked milestone releases if all released
            if ($balanceAfter <= 0.01 && $fund->contract_id) {
                PaymentCertificate::where('contract_id', $fund->contract_id)
                    ->whereNull('retention_released_at')
                    ->update([
                        'retention_released_at' => now(),
                    ]);
            }

            Activity::log(
                'retention_released',
                "Released {$amount} {$fund->currency} ({$releaseType}) from retention fund {$fund->fund_number} to {$fund->beneficiary_name}",
                $fund,
                $user ?? auth()->user()
            );

            return $txn;
        });
    }

    /**
     * Get aggregate retention fund portfolio statistics.
     */
    public function getPortfolioStatistics(?int $projectId = null): array
    {
        $query = RetentionFund::query();
        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $totalFunds = (clone $query)->count();
        $totalWithheld = (float) (clone $query)->sum('total_withheld_amount');
        $totalDeductions = (float) (clone $query)->sum('total_deductions_amount');
        $totalReleased = (float) (clone $query)->sum('total_released_amount');
        $totalCurrentHeld = (float) (clone $query)->sum('current_balance');

        $activeHoldingCount = (clone $query)->where('status', 'holding')->count();
        $partiallyReleasedCount = (clone $query)->where('status', 'partially_released')->count();
        $fullyReleasedCount = (clone $query)->where('status', 'fully_released')->count();

        // Matured ready for release: expiry date in past, not fully released
        $maturedReadyCount = (clone $query)
            ->whereNotNull('dlp_expiry_date')
            ->whereDate('dlp_expiry_date', '<=', Carbon::today())
            ->where('current_balance', '>', 0)
            ->count();

        // Count pending DLP snags
        $punchQuery = PunchListItem::whereIn('status', ['open', 'in_progress']);
        if ($projectId) {
            $punchQuery->where('project_id', $projectId);
        }
        $openSnagsCount = $punchQuery->count();

        return [
            'total_retention_funds' => $totalFunds,
            'total_withheld_pool' => $totalWithheld,
            'total_deductions' => $totalDeductions,
            'total_released' => $totalReleased,
            'total_current_held' => $totalCurrentHeld,
            'active_holding_count' => $activeHoldingCount,
            'partially_released_count' => $partiallyReleasedCount,
            'fully_released_count' => $fullyReleasedCount,
            'matured_ready_count' => $maturedReadyCount,
            'open_snags_count' => $openSnagsCount,
            'overall_release_rate' => $totalWithheld > 0 ? round(($totalReleased / $totalWithheld) * 100, 1) : 0,
            'currency' => 'USD',
        ];
    }
}
