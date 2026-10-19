<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ConstructionMilestone;
use App\Models\MilestonePaymentRelease;
use App\Models\MilestoneVerification;
use App\Models\Payment;
use App\Models\Project;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MilestonePaymentReleaseService
{
    /**
     * Submit milestone verification request for physical inspections.
     */
    public function submitVerification(MilestoneVerification $verification, User $user): MilestoneVerification
    {
        if ($verification->stage !== 'draft') {
            throw ValidationException::withMessages([
                'stage' => ["Verification is in '{$verification->stage}' stage and cannot be submitted."],
            ]);
        }

        $verification->update([
            'stage' => 'submitted',
        ]);

        return $verification->fresh(['milestone', 'project', 'site', 'unit']);
    }

    /**
     * Stage 1: Site Engineer Physical Sign-Off.
     */
    public function signOffSiteEngineer(MilestoneVerification $verification, User $engineer, array $data): MilestoneVerification
    {
        if ($verification->stage === 'rejected') {
            throw ValidationException::withMessages([
                'stage' => ['Cannot sign off a rejected milestone verification.'],
            ]);
        }

        $verification->update([
            'site_engineer_id' => $engineer->id,
            'engineer_signed_at' => now(),
            'structural_checks_passed' => $data['structural_checks_passed'] ?? true,
            'engineer_notes' => $data['engineer_notes'] ?? null,
            'physical_completion_percentage' => $data['physical_completion_percentage'] ?? $verification->physical_completion_percentage,
            'work_quality_rating' => $data['work_quality_rating'] ?? $verification->work_quality_rating,
            'inspection_date' => $data['inspection_date'] ?? ($verification->inspection_date ?? now()->toDateString()),
            'stage' => 'engineer_verified',
        ]);

        return $verification->fresh(['milestone', 'project', 'site', 'unit', 'siteEngineer']);
    }

    /**
     * Stage 2: Quantity Surveyor (QS) Physical Valuation Sign-Off.
     */
    public function signOffQuantitySurveyor(MilestoneVerification $verification, User $qs, array $data): MilestoneVerification
    {
        if (!in_array($verification->stage, ['submitted', 'engineer_verified'])) {
            throw ValidationException::withMessages([
                'stage' => ["Verification must be in 'engineer_verified' stage before QS sign-off. Current: {$verification->stage}"],
            ]);
        }

        $certifiedAmount = (float) ($data['qs_certified_amount'] ?? 0);
        if ($certifiedAmount <= 0) {
            throw ValidationException::withMessages([
                'qs_certified_amount' => ['Certified valuation amount must be greater than zero.'],
            ]);
        }

        DB::transaction(function () use ($verification, $qs, $data, $certifiedAmount) {
            $verification->update([
                'quantity_surveyor_id' => $qs->id,
                'qs_signed_at' => now(),
                'qs_certified_amount' => $certifiedAmount,
                'boq_compliance_status' => $data['boq_compliance_status'] ?? 'fully_compliant',
                'qs_notes' => $data['qs_notes'] ?? null,
                'stage' => 'qs_verified',
            ]);

            // Auto-initialize or update linked payment release in pending state
            $release = MilestonePaymentRelease::where('milestone_verification_id', $verification->id)->first();
            
            $retentionPct = (float) ($data['retention_percentage'] ?? 5.00);
            $retentionAmount = round(($certifiedAmount * $retentionPct) / 100, 2);
            $netAmount = round($certifiedAmount - $retentionAmount, 2);

            $unit = $verification->unit;
            $clientId = $verification->client_id ?? ($unit?->client_id);
            $savingsAccount = null;
            if ($clientId) {
                $savingsAccount = SavingsAccount::where('client_id', $clientId)
                    ->where('status', 'active')
                    ->where('current_balance', '>=', $netAmount)
                    ->latest('id')
                    ->first()
                    ?? SavingsAccount::where('client_id', $clientId)
                    ->where('status', 'active')
                    ->latest('current_balance')
                    ->first();
            }

            if (!$release) {
                MilestonePaymentRelease::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_id' => $verification->milestone_id,
                    'project_id' => $verification->project_id,
                    'site_id' => $verification->site_id,
                    'unit_id' => $verification->unit_id,
                    'client_id' => $verification->client_id ?? ($unit?->client_id),
                    'savings_account_id' => $savingsAccount?->id,
                    'source_type' => $savingsAccount ? 'savings_escrow' : 'project_operations',
                    'gross_amount' => $certifiedAmount,
                    'retention_percentage' => $retentionPct,
                    'retention_amount' => $retentionAmount,
                    'net_release_amount' => $netAmount,
                    'currency' => 'UGX',
                    'status' => 'pending_authorization',
                    'notes' => "Auto-generated from QS certified milestone verification {$verification->verification_number}",
                ]);
            } else {
                $release->update([
                    'gross_amount' => $certifiedAmount,
                    'retention_percentage' => $retentionPct,
                    'retention_amount' => $retentionAmount,
                    'net_release_amount' => $netAmount,
                ]);
            }
        });

        return $verification->fresh(['milestone', 'project', 'site', 'unit', 'siteEngineer', 'quantitySurveyor', 'paymentReleases']);
    }

    /**
     * Stage 3: Client Progress Approval or Administrative Waiver.
     */
    public function clientApprove(MilestoneVerification $verification, ?User $clientUser, array $data): MilestoneVerification
    {
        $status = $data['status'] ?? 'approved'; // approved, disputed, waived_by_admin

        $verification->update([
            'client_user_id' => $clientUser?->id,
            'client_signed_at' => now(),
            'client_approval_status' => $status,
            'client_feedback' => $data['client_feedback'] ?? null,
            'stage' => ($status === 'disputed') ? 'submitted' : 'client_approved',
        ]);

        return $verification->fresh(['milestone', 'project', 'site', 'unit', 'client', 'paymentReleases']);
    }

    /**
     * Reject milestone verification.
     */
    public function rejectVerification(MilestoneVerification $verification, User $user, string $reason): MilestoneVerification
    {
        $verification->update([
            'stage' => 'rejected',
            'rejection_reason' => $reason,
        ]);

        // Cancel linked pending releases
        MilestonePaymentRelease::where('milestone_verification_id', $verification->id)
            ->where('status', 'pending_authorization')
            ->update([
                'status' => 'rejected',
                'rejection_reason' => "Parent verification rejected: {$reason}",
            ]);

        return $verification->fresh();
    }

    /**
     * Stage 4: Finance Manager Authorization for Payment Release.
     */
    public function authorizeRelease(MilestonePaymentRelease $release, User $financeManager, ?string $notes = null): MilestonePaymentRelease
    {
        if ($release->status !== 'pending_authorization') {
            throw ValidationException::withMessages([
                'status' => ["Payment release is in '{$release->status}' status and cannot be authorized."],
            ]);
        }

        $release->update([
            'status' => 'authorized',
            'authorized_by' => $financeManager->id,
            'authorized_at' => now(),
            'authorization_notes' => $notes,
        ]);

        return $release->fresh(['milestoneVerification', 'milestone', 'project', 'unit', 'client']);
    }

    /**
     * Stage 5: Financial Disbursement & Ledger Posting.
     */
    public function disburseRelease(MilestonePaymentRelease $release, User $cashier, array $disbursementData): MilestonePaymentRelease
    {
        if ($release->status !== 'authorized') {
            throw ValidationException::withMessages([
                'status' => ["Release must be 'authorized' by finance prior to disbursement. Current: {$release->status}"],
            ]);
        }

        return DB::transaction(function () use ($release, $cashier, $disbursementData) {
            $netAmount = (float) $release->net_release_amount;
            $transactionId = null;

            // 1. If linked to client savings escrow account, deduct funds & post single-entry ledger
            if ($release->source_type === 'savings_escrow' && $release->savings_account_id) {
                $savings = SavingsAccount::where('id', $release->savings_account_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ((float) $savings->current_balance < $netAmount) {
                    throw ValidationException::withMessages([
                        'savings_account' => [
                            "Insufficient balance in Savings Account ({$savings->account_number}). Current: " .
                            number_format($savings->current_balance, 2) . " UGX, Required: " . number_format($netAmount, 2) . " UGX."
                        ],
                    ]);
                }

                $balanceBefore = (float) $savings->current_balance;
                $balanceAfter = $balanceBefore - $netAmount;

                $savings->update([
                    'current_balance' => $balanceAfter,
                ]);

                // Create ledger transaction
                $txn = Transaction::create([
                    'account_id' => $savings->id,
                    'client_id' => $savings->client_id,
                    'transaction_type' => 'milestone_release',
                    'amount' => -$netAmount, // Debit
                    'currency' => $release->currency,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'description' => "Milestone Payment Release: {$release->release_number} - {$release->milestone->milestone_name}",
                    'narration' => "Released for verified milestone progress ({$release->milestoneVerification->physical_completion_percentage}%)",
                    'reference_number' => $release->release_number,
                    'transaction_date' => now(),
                    'value_date' => now()->toDateString(),
                    'status' => 'posted',
                    'created_by' => $cashier->id,
                ]);

                $transactionId = $txn->id;
            }

            // 2. If linked to a Unit, update unit amount_paid, balance, and physical progress
            if ($release->unit_id) {
                $unit = Unit::find($release->unit_id);
                if ($unit) {
                    $newPaid = (float) ($unit->amount_paid ?? 0) + $netAmount;
                    $unitPrice = (float) ($unit->current_price ?? 0);
                    $newBalance = max(0, $unitPrice - $newPaid);

                    $unit->update([
                        'amount_paid' => $newPaid,
                        'balance' => $newBalance,
                        'completion_percentage' => max((float) $unit->completion_percentage, (float) $release->milestoneVerification->physical_completion_percentage),
                    ]);
                }
            }

            // 3. Update construction milestone progress
            $milestone = ConstructionMilestone::find($release->milestone_id);
            if ($milestone) {
                $newPct = (float) $release->milestoneVerification->physical_completion_percentage;
                $milestoneUpdate = [
                    'completion_percentage' => $newPct,
                ];

                if ($newPct >= 100.00 && $milestone->status !== 'completed') {
                    $milestoneUpdate['status'] = 'completed';
                    $milestoneUpdate['completed_at'] = now();
                    $milestoneUpdate['completed_by'] = $cashier->id;
                } elseif ($milestone->status === 'pending') {
                    $milestoneUpdate['status'] = 'in_progress';
                }

                $milestone->update($milestoneUpdate);
            }

            // 4. Update the Payment Release record
            $release->update([
                'status' => 'disbursed',
                'disbursed_by' => $cashier->id,
                'disbursed_at' => now(),
                'payment_method' => $disbursementData['payment_method'] ?? 'internal_transfer',
                'disbursement_reference' => $disbursementData['disbursement_reference'] ?? ('DISB-' . now()->format('YmdHis')),
                'transaction_id' => $transactionId,
            ]);

            return $release->fresh(['milestoneVerification', 'milestone', 'project', 'unit', 'client', 'savingsAccount', 'transaction']);
        });
    }

    /**
     * Stage 6: Defect Liability Period Clearance & Retention Fund Release.
     */
    public function releaseRetentionFund(MilestonePaymentRelease $release, User $user, array $data): MilestonePaymentRelease
    {
        if ($release->status !== 'disbursed') {
            throw ValidationException::withMessages([
                'status' => ['Retention fund can only be released after initial milestone payment is disbursed.'],
            ]);
        }

        if ($release->isRetentionReleased()) {
            throw ValidationException::withMessages([
                'retention' => ['Retention fund has already been released for this payment.'],
            ]);
        }

        $retentionAmount = (float) $release->retention_amount;
        if ($retentionAmount <= 0) {
            throw ValidationException::withMessages([
                'retention_amount' => ['No retention amount was held on this release.'],
            ]);
        }

        return DB::transaction(function () use ($release, $user, $data, $retentionAmount) {
            $retentionTxnId = null;

            // Post retention release to ledger if client account is linked
            if ($release->savings_account_id) {
                $savings = SavingsAccount::find($release->savings_account_id);
                if ($savings) {
                    $balanceBefore = (float) $savings->current_balance;
                    $balanceAfter = $balanceBefore; // informational or transfer

                    $txn = Transaction::create([
                        'account_id' => $savings->id,
                        'client_id' => $savings->client_id,
                        'transaction_type' => 'retention_release',
                        'amount' => $retentionAmount,
                        'currency' => $release->currency,
                        'balance_before' => $balanceBefore,
                        'balance_after' => $balanceAfter,
                        'description' => "Defect Liability Retention Release: {$release->release_number}",
                        'narration' => $data['notes'] ?? 'Cleared defect inspection liability period',
                        'reference_number' => "RET-REL-{$release->release_number}",
                        'transaction_date' => now(),
                        'value_date' => now()->toDateString(),
                        'status' => 'posted',
                        'created_by' => $user->id,
                    ]);

                    $retentionTxnId = $txn->id;
                }
            }

            $release->update([
                'retention_released_at' => now(),
                'retention_released_by' => $user->id,
                'retention_transaction_id' => $retentionTxnId,
                'retention_notes' => $data['notes'] ?? 'Defect liability period cleared successfully.',
            ]);

            return $release->fresh(['milestoneVerification', 'milestone', 'project', 'unit', 'client', 'retentionTransaction']);
        });
    }

    /**
     * Get analytical statistics for milestone releases.
     */
    public function getStatistics(?int $projectId = null): array
    {
        $vQuery = MilestoneVerification::query();
        $rQuery = MilestonePaymentRelease::query();

        if ($projectId) {
            $vQuery->where('project_id', $projectId);
            $rQuery->where('project_id', $projectId);
        }

        $totalVerifications = (clone $vQuery)->count();
        $submittedCount = (clone $vQuery)->where('stage', 'submitted')->count();
        $engineerVerifiedCount = (clone $vQuery)->where('stage', 'engineer_verified')->count();
        $qsVerifiedCount = (clone $vQuery)->where('stage', 'qs_verified')->count();
        $clientApprovedCount = (clone $vQuery)->where('stage', 'client_approved')->count();

        $totalGrossCertified = (float) (clone $rQuery)->sum('gross_amount');
        $totalDisbursed = (float) (clone $rQuery)->where('status', 'disbursed')->sum('net_release_amount');
        $pendingReleaseAmount = (float) (clone $rQuery)->whereIn('status', ['pending_authorization', 'authorized'])->sum('net_release_amount');
        $totalRetentionHeld = (float) (clone $rQuery)->where('status', 'disbursed')->whereNull('retention_released_at')->sum('retention_amount');
        $totalRetentionReleased = (float) (clone $rQuery)->whereNotNull('retention_released_at')->sum('retention_amount');

        return [
            'total_verifications' => $totalVerifications,
            'submitted_verifications' => $submittedCount,
            'engineer_verified_count' => $engineerVerifiedCount,
            'qs_verified_count' => $qsVerifiedCount,
            'client_approved_count' => $clientApprovedCount,
            'total_gross_certified' => $totalGrossCertified,
            'total_disbursed' => $totalDisbursed,
            'pending_release_amount' => $pendingReleaseAmount,
            'total_retention_held' => $totalRetentionHeld,
            'total_retention_released' => $totalRetentionReleased,
            'currency' => 'UGX',
        ];
    }
}
