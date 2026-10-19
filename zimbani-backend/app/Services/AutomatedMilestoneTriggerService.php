<?php

namespace App\Services;

use App\Models\MilestoneVerification;
use App\Models\MilestonePaymentRelease;
use App\Models\MilestoneTriggerLog;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\Project;
use App\Models\User;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Exception;

class AutomatedMilestoneTriggerService
{
    /**
     * Evaluate an individual MilestoneVerification and auto-trigger payment release from escrow.
     */
    public function evaluateAndTriggerRelease(MilestoneVerification $verification, ?User $user = null): MilestoneTriggerLog
    {
        return DB::transaction(function () use ($verification, $user) {
            $user = $user ?? auth()->user() ?? User::first();

            // 1. Verify stage eligibility
            if ($verification->stage !== 'client_approved' && $verification->client_approval_status !== 'approved' && $verification->client_approval_status !== 'waived_by_admin') {
                return MilestoneTriggerLog::create([
                    'milestone_verification_id' => $verification->id,
                    'trigger_event' => 'client_approved',
                    'status' => 'failed',
                    'escrow_balance' => 0.00,
                    'required_amount' => 0.00,
                    'shortfall_amount' => 0.00,
                    'details' => ['reason' => 'Milestone verification is not client-approved yet.'],
                    'triggered_by' => $user?->id,
                ]);
            }

            // 2. Find or create the corresponding MilestonePaymentRelease
            $release = MilestonePaymentRelease::where('milestone_verification_id', $verification->id)->first();

            if (!$release) {
                $grossAmount = floatval($verification->qs_certified_amount) > 0 
                    ? floatval($verification->qs_certified_amount) 
                    : 10000.00;
                $retentionPercentage = 5.00;
                $retentionAmount = round($grossAmount * ($retentionPercentage / 100), 2);
                $netReleaseAmount = round($grossAmount - $retentionAmount, 2);

                $release = MilestonePaymentRelease::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_id' => $verification->milestone_id,
                    'project_id' => $verification->project_id,
                    'site_id' => $verification->site_id,
                    'unit_id' => $verification->unit_id,
                    'client_id' => $verification->client_id,
                    'source_type' => 'savings_escrow',
                    'gross_amount' => $grossAmount,
                    'retention_percentage' => $retentionPercentage,
                    'retention_amount' => $retentionAmount,
                    'net_release_amount' => $netReleaseAmount,
                    'currency' => 'USD',
                    'status' => 'pending_authorization',
                    'created_by' => $user?->id,
                ]);
            }

            // If release is already disbursed, return already_processed log
            if ($release->status === 'disbursed') {
                return MilestoneTriggerLog::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_payment_release_id' => $release->id,
                    'savings_account_id' => $release->savings_account_id,
                    'trigger_event' => 'client_approved',
                    'status' => 'already_processed',
                    'escrow_balance' => 0.00,
                    'required_amount' => (float) $release->net_release_amount,
                    'shortfall_amount' => 0.00,
                    'details' => ['message' => 'Release is already disbursed.'],
                    'triggered_by' => $user?->id,
                ]);
            }

            // 3. Locate client's escrow account
            $account = null;
            if ($verification->client_id) {
                $account = SavingsAccount::where('client_id', $verification->client_id)
                    ->where('project_id', $verification->project_id)
                    ->whereIn('status', ['active', 'completed'])
                    ->first();

                if (!$account) {
                    $account = SavingsAccount::where('client_id', $verification->client_id)
                        ->whereIn('status', ['active', 'completed'])
                        ->first();
                }
            }

            if (!$account && $verification->project_id) {
                // Fallback to project-level escrow or first active account
                $account = SavingsAccount::where('project_id', $verification->project_id)
                    ->whereIn('status', ['active', 'completed'])
                    ->first();
            }

            if (!$account) {
                $verification->update([
                    'auto_release_triggered' => true,
                    'auto_release_status' => 'no_escrow_account',
                ]);

                return MilestoneTriggerLog::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_payment_release_id' => $release->id,
                    'trigger_event' => 'client_approved',
                    'status' => 'no_escrow_account',
                    'escrow_balance' => 0.00,
                    'required_amount' => (float) $release->net_release_amount,
                    'shortfall_amount' => (float) $release->net_release_amount,
                    'details' => ['reason' => 'No active escrow savings account located for client or project.'],
                    'triggered_by' => $user?->id,
                ]);
            }

            $escrowBalance = floatval($account->current_balance);
            $requiredAmount = floatval($release->net_release_amount);

            // 4. Compare Escrow Balance vs Required Net Release
            if ($escrowBalance >= $requiredAmount) {
                // SFFICIENT FUNDS -> Auto-authorize release and record ledger transaction
                $release->update([
                    'savings_account_id' => $account->id,
                    'status' => 'authorized',
                    'authorized_by' => $user?->id,
                    'authorized_at' => now(),
                    'authorization_notes' => 'Auto-authorized: Escrow balance verified and allocated upon client milestone approval.',
                    'currency' => $account->currency,
                ]);

                // Create ledger transaction
                $txn = Transaction::record([
                    'account_id' => $account->id,
                    'client_id' => $account->client_id,
                    'amount' => -$requiredAmount,
                    'currency' => $account->currency,
                    'transaction_type' => 'milestone_release',
                    'description' => "Escrow Release: {$verification->title} ({$release->release_number})",
                    'narration' => "Milestone Verification #{$verification->verification_number} Client Approved. Auto-authorized.",
                    'reference_number' => $release->release_number,
                    'value_date' => now()->toDateString(),
                    'created_by' => $user?->id,
                ]);

                $release->update([
                    'transaction_id' => $txn->id,
                ]);

                $verification->update([
                    'auto_release_triggered' => true,
                    'auto_release_status' => 'authorized',
                ]);

                $log = MilestoneTriggerLog::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_payment_release_id' => $release->id,
                    'savings_account_id' => $account->id,
                    'trigger_event' => 'client_approved',
                    'status' => 'success_authorized',
                    'escrow_balance' => $escrowBalance,
                    'required_amount' => $requiredAmount,
                    'shortfall_amount' => 0.00,
                    'details' => [
                        'transaction_number' => $txn->transaction_number,
                        'remaining_escrow_balance' => (float) $account->fresh()->current_balance,
                    ],
                    'triggered_by' => $user?->id,
                ]);

                Activity::log(
                    'milestone_release_auto_triggered',
                    "Auto-triggered payment release {$release->release_number} from Escrow Account {$account->account_number} for {$account->currency} {$requiredAmount}",
                    $release,
                    $user
                );

                return $log;
            } else {
                // INSUFFICIENT FUNDS -> Record shortfall and alert
                $shortfall = round($requiredAmount - $escrowBalance, 2);

                $release->update([
                    'savings_account_id' => $account->id,
                    'notes' => ($release->notes ? $release->notes . "\n" : '') .
                        "[Auto-Trigger Insufficient Escrow Funds on " . now()->toDateTimeString() . "]: Escrow Balance {$escrowBalance} is less than required {$requiredAmount}. Shortfall: {$shortfall}",
                ]);

                $verification->update([
                    'auto_release_triggered' => true,
                    'auto_release_status' => 'insufficient_escrow_funds',
                ]);

                $log = MilestoneTriggerLog::create([
                    'milestone_verification_id' => $verification->id,
                    'milestone_payment_release_id' => $release->id,
                    'savings_account_id' => $account->id,
                    'trigger_event' => 'client_approved',
                    'status' => 'insufficient_escrow_funds',
                    'escrow_balance' => $escrowBalance,
                    'required_amount' => $requiredAmount,
                    'shortfall_amount' => $shortfall,
                    'details' => [
                        'account_number' => $account->account_number,
                        'shortfall_amount' => $shortfall,
                        'alert' => "Client escrow shortfall of {$shortfall} requires deposit before disbursement.",
                    ],
                    'triggered_by' => $user?->id,
                ]);

                Activity::log(
                    'escrow_shortfall_detected',
                    "Milestone release {$release->release_number} paused due to Escrow Shortfall of {$account->currency} {$shortfall} on Account {$account->account_number}",
                    $release,
                    $user
                );

                return $log;
            }
        });
    }

    /**
     * Bulk evaluate all pending milestone verifications for automated triggers.
     */
    public function bulkEvaluatePendingTriggers(?int $projectId = null, ?User $user = null): array
    {
        $query = MilestoneVerification::whereIn('stage', ['client_approved'])
            ->where(function ($q) {
                $q->where('auto_release_triggered', false)
                  ->orWhere('auto_release_status', 'insufficient_escrow_funds');
            });

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $verifications = $query->get();

        $processed = [];
        $authorizedCount = 0;
        $shortfallCount = 0;

        foreach ($verifications as $v) {
            $log = $this->evaluateAndTriggerRelease($v, $user);
            $processed[] = $log->load(['verification', 'paymentRelease', 'savingsAccount']);
            if ($log->status === 'success_authorized' || $log->status === 'success_disbursed') {
                $authorizedCount++;
            } elseif ($log->status === 'insufficient_escrow_funds') {
                $shortfallCount++;
            }
        }

        return [
            'total_evaluated' => count($verifications),
            'authorized_count' => $authorizedCount,
            'shortfall_count' => $shortfallCount,
            'logs' => $processed,
        ];
    }

    /**
     * Get active escrow shortfall alerts across projects.
     */
    public function getShortfallAlerts(?int $projectId = null): array
    {
        $query = MilestoneTriggerLog::where('status', 'insufficient_escrow_funds')
            ->latest('created_at')
            ->with([
                'verification.milestone',
                'verification.project',
                'verification.client',
                'paymentRelease',
                'savingsAccount',
            ]);

        if ($projectId) {
            $query->whereHas('verification', function ($q) use ($projectId) {
                $q->where('project_id', $projectId);
            });
        }

        $logs = $query->get();

        $totalShortfall = $logs->sum('shortfall_amount');

        return [
            'total_shortfalls_count' => $logs->count(),
            'total_shortfall_amount' => round((float) $totalShortfall, 2),
            'alerts' => $logs,
        ];
    }
}
