<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\DefectLiabilityCertificate;
use App\Models\Project;
use App\Models\PunchListItem;
use App\Models\RetentionFund;
use App\Models\SubcontractorContract;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DefectLiabilityCertificateService
{
    public function __construct(
        protected RetentionFundService $retentionFundService
    ) {}

    /**
     * Issue Practical Completion Certificate (PCC) and commence DLP.
     */
    public function issuePracticalCompletionCertificate(array $data, User $user): DefectLiabilityCertificate
    {
        return DB::transaction(function () use ($data, $user) {
            $projectId = $data['project_id'];
            $contractId = $data['contract_id'] ?? null;
            $unitId = $data['unit_id'] ?? null;
            $commencementDate = $data['commencement_date'] ?? Carbon::today()->toDateString();
            $dlpDays = (int) ($data['dlp_period_days'] ?? 180);
            $maturityDate = Carbon::parse($commencementDate)->addDays($dlpDays)->toDateString();

            // Locate or create retention fund
            $fund = null;
            if ($contractId) {
                $contract = SubcontractorContract::findOrFail($contractId);
                $fund = $this->retentionFundService->getOrCreateFundForContract($contract);
            } else {
                $project = Project::findOrFail($projectId);
                $fund = RetentionFund::firstOrCreate(
                    ['project_id' => $projectId, 'unit_id' => $unitId, 'fund_type' => 'client_defect_reserve'],
                    [
                        'beneficiary_type' => 'client',
                        'beneficiary_name' => $project->name . ($unitId ? " Unit #{$unitId}" : ' Reserve'),
                        'total_withheld_amount' => 0.00,
                        'total_deductions_amount' => 0.00,
                        'total_released_amount' => 0.00,
                        'current_balance' => 0.00,
                        'currency' => $project->currency ?? 'USD',
                        'retention_rate' => 5.00,
                        'status' => 'holding',
                    ]
                );
            }

            // Start DLP on retention fund
            $this->retentionFundService->startDefectLiabilityPeriod($fund, $commencementDate, $dlpDays, $user);

            // Audit current snags
            $audit = $this->conductSnagAudit($projectId, $unitId, $contractId);

            $cert = DefectLiabilityCertificate::create([
                'certificate_type' => 'practical_completion',
                'project_id' => $projectId,
                'unit_id' => $unitId,
                'contract_id' => $contractId,
                'client_id' => $data['client_id'] ?? $fund->client_id,
                'retention_fund_id' => $fund->id,
                'commencement_date' => $commencementDate,
                'maturity_date' => $maturityDate,
                'retention_pool_amount' => (float) $fund->total_withheld_amount,
                'deductions_amount' => (float) $fund->total_deductions_amount,
                'net_release_amount' => 0.00,
                'currency' => $fund->currency,
                'open_snags_count' => $audit['open_snags'],
                'resolved_snags_count' => $audit['closed_snags'],
                'engineer_signed_by' => $user->id,
                'engineer_signed_at' => now(),
                'status' => 'issued',
                'inspection_notes' => $data['inspection_notes'] ?? 'Practical Completion inspected and certified. Defect Liability Period commenced.',
                'certificate_notes' => $data['certificate_notes'] ?? null,
            ]);

            // Optional 50% Practical Completion interim retention release if requested
            if (!empty($data['release_initial_retention']) && (float) $fund->current_balance > 0) {
                $releaseRate = (float) ($data['initial_release_percentage'] ?? 50.0);
                $initialReleaseAmt = round(((float) $fund->total_withheld_amount) * ($releaseRate / 100), 2);
                $initialReleaseAmt = min($initialReleaseAmt, (float) $fund->current_balance);

                if ($initialReleaseAmt > 0) {
                    $this->retentionFundService->releaseRetention(
                        $fund,
                        $initialReleaseAmt,
                        'interim_release',
                        $cert,
                        "Initial {$releaseRate}% retention release upon Practical Completion",
                        $user
                    );
                    $cert->update(['net_release_amount' => $initialReleaseAmt]);
                }
            }

            Activity::log(
                'practical_completion_issued',
                "Issued Practical Completion Certificate {$cert->certificate_number} for {$fund->beneficiary_name}",
                $cert,
                $user
            );

            return $cert->fresh(['project', 'unit', 'contract', 'retentionFund']);
        });
    }

    /**
     * Conduct snag/punch-list inspection audit for end-of-warranty clearance.
     */
    public function conductSnagAudit(int $projectId, ?int $unitId = null, ?int $contractId = null): array
    {
        $query = PunchListItem::where('project_id', $projectId);

        if ($unitId) {
            $query->where('unit_id', $unitId);
        }

        if ($contractId) {
            $contract = SubcontractorContract::find($contractId);
            if ($contract) {
                $query->where(function ($q) use ($contract) {
                    $q->where('subcontractor_name', 'like', "%{$contract->subcontractor_name}%")
                      ->orWhere('assigned_to', $contract->subcontractor_name);
                });
            }
        }

        $items = (clone $query)->orderBy('created_at', 'desc')->get();

        $openCount = $items->whereIn('status', ['open', 'in_progress'])->count();
        $rectifiedCount = $items->where('status', 'rectified')->count();
        $closedCount = $items->whereIn('status', ['verified_closed', 'waived'])->count();
        $totalCount = $items->count();

        $allCleared = ($openCount === 0 && $rectifiedCount === 0);

        return [
            'total_snags' => $totalCount,
            'open_snags' => $openCount,
            'rectified_snags' => $rectifiedCount,
            'closed_snags' => $closedCount,
            'all_cleared' => $allCleared,
            'items' => $items,
        ];
    }

    /**
     * Issue Defect Clearance Certificate (DCC) confirming 100% snag rectification.
     */
    public function issueDefectClearanceCertificate(array $data, User $user): DefectLiabilityCertificate
    {
        return DB::transaction(function () use ($data, $user) {
            $fundId = $data['retention_fund_id'];
            $fund = RetentionFund::findOrFail($fundId);

            $audit = $this->conductSnagAudit($fund->project_id, $fund->unit_id, $fund->contract_id);
            if (!$audit['all_cleared']) {
                throw new InvalidArgumentException(
                    "Cannot issue Defect Clearance Certificate: {$audit['open_snags']} open and {$audit['rectified_snags']} unverified snags remain."
                );
            }

            $cert = DefectLiabilityCertificate::create([
                'certificate_type' => 'defect_clearance',
                'project_id' => $fund->project_id,
                'unit_id' => $fund->unit_id,
                'contract_id' => $fund->contract_id,
                'client_id' => $fund->client_id,
                'retention_fund_id' => $fund->id,
                'commencement_date' => $fund->dlp_commenced_at,
                'maturity_date' => $fund->dlp_expiry_date,
                'retention_pool_amount' => (float) $fund->total_withheld_amount,
                'deductions_amount' => (float) $fund->total_deductions_amount,
                'net_release_amount' => (float) $fund->current_balance,
                'currency' => $fund->currency,
                'open_snags_count' => 0,
                'resolved_snags_count' => $audit['closed_snags'],
                'engineer_signed_by' => $user->id,
                'engineer_signed_at' => now(),
                'status' => 'approved',
                'inspection_notes' => $data['inspection_notes'] ?? 'All snags inspected and certified cleared by Site Engineer.',
                'certificate_notes' => $data['certificate_notes'] ?? null,
            ]);

            $fund->update([
                'eligible_for_release' => true,
                'cleared_for_release_at' => now(),
                'cleared_by' => $user->id,
            ]);

            Activity::log(
                'defect_clearance_issued',
                "Issued Defect Clearance Certificate {$cert->certificate_number} for {$fund->beneficiary_name} (100% snags cleared)",
                $cert,
                $user
            );

            return $cert->fresh(['project', 'unit', 'contract', 'retentionFund']);
        });
    }

    /**
     * Issue Final Retention Release Certificate (DLC) and disburse remaining funds.
     */
    public function issueFinalRetentionReleaseCertificate(array $data, User $user): DefectLiabilityCertificate
    {
        return DB::transaction(function () use ($data, $user) {
            $fundId = $data['retention_fund_id'];
            $fund = RetentionFund::findOrFail($fundId);

            $availableBalance = (float) $fund->current_balance;
            if ($availableBalance <= 0) {
                throw new InvalidArgumentException("Retention fund has zero balance available for release.");
            }

            $cert = DefectLiabilityCertificate::create([
                'certificate_type' => 'retention_release',
                'project_id' => $fund->project_id,
                'unit_id' => $fund->unit_id,
                'contract_id' => $fund->contract_id,
                'client_id' => $fund->client_id,
                'retention_fund_id' => $fund->id,
                'commencement_date' => $fund->dlp_commenced_at,
                'maturity_date' => $fund->dlp_expiry_date,
                'retention_pool_amount' => (float) $fund->total_withheld_amount,
                'deductions_amount' => (float) $fund->total_deductions_amount,
                'net_release_amount' => $availableBalance,
                'currency' => $fund->currency,
                'open_snags_count' => 0,
                'resolved_snags_count' => 0,
                'qs_signed_by' => $user->id,
                'qs_signed_at' => now(),
                'status' => 'issued',
                'inspection_notes' => $data['inspection_notes'] ?? 'Final Defect Liability Inspection passed with zero remaining defects.',
                'certificate_notes' => $data['certificate_notes'] ?? 'Final Retention Payout authorized by Finance & Commercial Controller.',
            ]);

            // Release all remaining retention
            $this->retentionFundService->releaseRetention(
                $fund,
                $availableBalance,
                'final_release',
                $cert,
                "Final 100% retention payout via {$cert->certificate_number}",
                $user
            );

            Activity::log(
                'final_retention_release_issued',
                "Authorized and disbursed Final Retention Release Certificate {$cert->certificate_number} for {$availableBalance} {$fund->currency} to {$fund->beneficiary_name}",
                $cert,
                $user
            );

            return $cert->fresh(['project', 'unit', 'contract', 'retentionFund']);
        });
    }

    /**
     * Issue Final Handover Certificate to client.
     */
    public function issueFinalHandoverProtocol(array $data, User $user): DefectLiabilityCertificate
    {
        return DB::transaction(function () use ($data, $user) {
            $projectId = $data['project_id'];
            $unitId = $data['unit_id'] ?? null;
            $clientId = $data['client_id'] ?? null;

            $cert = DefectLiabilityCertificate::create([
                'certificate_type' => 'final_handover',
                'project_id' => $projectId,
                'unit_id' => $unitId,
                'client_id' => $clientId,
                'commencement_date' => Carbon::today()->toDateString(),
                'maturity_date' => Carbon::today()->toDateString(),
                'status' => 'issued',
                'engineer_signed_by' => $user->id,
                'engineer_signed_at' => now(),
                'client_signed_at' => now(),
                'inspection_notes' => $data['inspection_notes'] ?? 'All works completed, snagging audit 100% cleared, property keys handed over.',
                'certificate_notes' => $data['certificate_notes'] ?? 'Final Client Handover Protocol signed.',
            ]);

            // If unit is linked, update unit status to completed / sold
            if ($unitId) {
                Unit::where('id', $unitId)->update(['status' => 'completed']);
            }

            Activity::log(
                'final_handover_protocol_issued',
                "Issued Final Handover Protocol {$cert->certificate_number} for Project #{$projectId}" . ($unitId ? " Unit #{$unitId}" : ''),
                $cert,
                $user
            );

            return $cert->fresh(['project', 'unit', 'client']);
        });
    }

    /**
     * Sign off certificate by Site Engineer, QS, or Client.
     */
    public function signCertificate(DefectLiabilityCertificate $certificate, string $role, User $user, ?string $notes = null): DefectLiabilityCertificate
    {
        if ($role === 'engineer') {
            $certificate->update([
                'engineer_signed_by' => $user->id,
                'engineer_signed_at' => now(),
                'inspection_notes' => $notes ?? $certificate->inspection_notes,
            ]);
        } elseif ($role === 'qs') {
            $certificate->update([
                'qs_signed_by' => $user->id,
                'qs_signed_at' => now(),
                'certificate_notes' => $notes ?? $certificate->certificate_notes,
            ]);
        } elseif ($role === 'client') {
            $certificate->update([
                'client_signed_at' => now(),
            ]);
        }

        // If both engineer and QS signed, mark as approved
        if ($certificate->engineer_signed_at && $certificate->qs_signed_at && $certificate->status === 'draft') {
            $certificate->update(['status' => 'approved']);
        }

        Activity::log(
            'certificate_signed',
            "{$user->name} signed off {$certificate->certificate_number} as {$role}",
            $certificate,
            $user
        );

        return $certificate->fresh();
    }
}
