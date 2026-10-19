<?php

namespace App\Services;

use App\Models\SubcontractorContract;
use App\Models\ContractMilestone;
use App\Models\ConstructionMilestone;
use App\Models\MilestoneVerification;
use App\Models\PaymentCertificate;
use App\Models\Project;
use App\Models\User;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Exception;

class SubcontractorMilestoneValuationService
{
    /**
     * Allocate or update project milestones for a Subcontractor Contract.
     */
    public function allocateMilestones(SubcontractorContract $contract, array $allocations, User $user): array
    {
        return DB::transaction(function () use ($contract, $allocations, $user) {
            $totalAllocated = 0;
            $results = [];

            foreach ($allocations as $item) {
                $milestone = ConstructionMilestone::where('id', $item['milestone_id'])
                    ->where('project_id', $contract->project_id)
                    ->firstOrFail();

                $amount = round(floatval($item['allocated_amount']), 2);
                $weight = !empty($item['weight_percentage']) 
                    ? round(floatval($item['weight_percentage']), 2) 
                    : ($contract->contract_sum > 0 ? round(($amount / $contract->contract_sum) * 100, 2) : 0);

                $totalAllocated += $amount;

                $cm = ContractMilestone::updateOrCreate(
                    [
                        'contract_id' => $contract->id,
                        'milestone_id' => $milestone->id,
                    ],
                    [
                        'allocated_amount' => $amount,
                        'weight_percentage' => $weight,
                        'start_date' => $item['start_date'] ?? $contract->start_date,
                        'due_date' => $item['due_date'] ?? $contract->expected_completion_date,
                        'notes' => $item['notes'] ?? null,
                        'status' => $item['status'] ?? 'pending',
                    ]
                );

                $results[] = $cm->load('milestone');
            }

            // If contract is draft, advance to active
            if ($contract->status === 'draft') {
                $contract->update(['status' => 'active']);
            }

            Activity::create([
                'user_id' => $user->id,
                'type' => 'subcontractor_milestones_allocated',
                'entity_type' => SubcontractorContract::class,
                'entity_id' => $contract->id,
                'description' => "Allocated " . count($results) . " milestone work packages to contract {$contract->contract_number}",
                'properties' => [
                    'contract_id' => $contract->id,
                    'total_allocated' => $totalAllocated,
                    'milestone_count' => count($results),
                ],
            ]);

            return $results;
        });
    }

    /**
     * Generate an Interim Payment Certificate (IPC) directly from a certified Milestone Verification.
     */
    public function generateCertificateFromMilestone(
        MilestoneVerification $verification,
        SubcontractorContract $contract,
        array $options,
        User $user
    ): PaymentCertificate {
        return DB::transaction(function () use ($verification, $contract, $options, $user) {
            // Verification must be in engineer_verified, qs_verified, or client_approved
            if (!in_array($verification->stage, ['engineer_verified', 'qs_verified', 'client_approved'])) {
                throw ValidationException::withMessages([
                    'verification' => ["Cannot generate payment certificate. Verification stage is '{$verification->stage}'."],
                ]);
            }

            // Verify contract belongs to project
            if ($contract->project_id !== $verification->project_id) {
                throw ValidationException::withMessages([
                    'contract' => ["Contract does not belong to project '{$verification->project->name}'."],
                ]);
            }

            // Find or resolve ContractMilestone allocation
            $contractMilestone = ContractMilestone::where('contract_id', $contract->id)
                ->where('milestone_id', $verification->milestone_id)
                ->first();

            // Calculate valuation amounts
            $previousGross = (float) PaymentCertificate::where('contract_id', $contract->id)
                ->whereIn('status', ['submitted', 'verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])
                ->latest('valuation_date')
                ->value('gross_amount') ?? 0.00;

            // Value of work executed for this milestone
            $valuationAmount = isset($options['certified_amount']) && floatval($options['certified_amount']) > 0
                ? floatval($options['certified_amount'])
                : (float) ($verification->qs_certified_amount > 0 ? $verification->qs_certified_amount : ($contractMilestone ? $contractMilestone->allocated_amount : 0));

            $currentGross = $valuationAmount;
            $newCumulativeGross = $previousGross + $currentGross;

            // Retention & WHT rates
            $retentionRate = (float) ($contract->retention_percentage ?? 5.00);
            $retentionDeducted = round($currentGross * ($retentionRate / 100), 2);

            $whtRate = 6.00; // Statutory URA Withholding Tax
            $whtAmount = round($currentGross * ($whtRate / 100), 2);

            $otherDeductions = floatval($options['other_deductions'] ?? 0.00);
            $materialsOnSite = floatval($options['materials_on_site_value'] ?? 0.00);

            $netAmount = max(0.0, ($currentGross + $materialsOnSite) - $retentionDeducted - $whtAmount - $otherDeductions);

            // Generate Certificate
            $certificateNumber = PaymentCertificate::generateCertificateNumber();

            $certificate = PaymentCertificate::create([
                'certificate_number' => $certificateNumber,
                'contract_id' => $contract->id,
                'project_id' => $contract->project_id,
                'site_id' => $contract->site_id,
                'milestone_id' => $verification->milestone_id,
                'milestone_verification_id' => $verification->id,
                'physical_completion_percentage' => $verification->physical_completion_percentage,
                'boq_compliance_status' => $verification->boq_compliance_status,
                'qs_valuation_reference' => $verification->verification_number,
                'valuation_period_start' => $options['valuation_period_start'] ?? ($contract->start_date ? $contract->start_date->toDateString() : now()->subDays(30)->toDateString()),
                'valuation_period_end' => $options['valuation_period_end'] ?? ($verification->inspection_date ?? now()->toDateString()),
                'valuation_date' => now()->toDateString(),
                'certificate_type' => 'interim',
                'gross_amount' => $newCumulativeGross,
                'previous_gross_amount' => $previousGross,
                'current_gross_amount' => $currentGross,
                'materials_on_site_value' => $materialsOnSite,
                'retention_rate' => $retentionRate,
                'retention_deducted' => $retentionDeducted,
                'withholding_tax_rate' => $whtRate,
                'withholding_tax_amount' => $whtAmount,
                'other_deductions' => $otherDeductions,
                'net_certified_amount' => $netAmount,
                'currency' => $contract->currency ?? 'UGX',
                'description' => "Interim Valuation for Milestone #{$verification->milestone->milestone_order}: {$verification->milestone->milestone_name} ({$verification->verification_number})",
                'measurement_sheet_summary' => $options['measurement_summary'] ?? ($verification->qs_notes ?? "Valuation certified against verified physical milestone progress {$verification->physical_completion_percentage}%."),
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Update ContractMilestone certified amount & status
            if ($contractMilestone) {
                $newCertified = (float) $contractMilestone->certified_amount + $currentGross;
                $status = ($verification->physical_completion_percentage >= 100) ? 'certified' : 'in_progress';

                $contractMilestone->update([
                    'certified_amount' => $newCertified,
                    'status' => $status,
                ]);
            }

            Activity::create([
                'user_id' => $user->id,
                'type' => 'milestone_payment_certificate_generated',
                'entity_type' => PaymentCertificate::class,
                'entity_id' => $certificate->id,
                'description' => "Generated Interim Certificate {$certificateNumber} from milestone {$verification->verification_number} for {$contract->subcontractor_name}",
                'properties' => [
                    'certificate_id' => $certificate->id,
                    'certificate_number' => $certificateNumber,
                    'verification_id' => $verification->id,
                    'contract_id' => $contract->id,
                    'net_certified_amount' => $netAmount,
                ],
            ]);

            return $certificate->fresh(['contract', 'project', 'site', 'milestone', 'milestoneVerification']);
        });
    }

    /**
     * Generate Subcontractor Retention Release Certificate upon defect liability expiry.
     */
    public function generateRetentionReleaseCertificate(
        SubcontractorContract $contract,
        User $user,
        ?string $notes = null
    ): PaymentCertificate {
        return DB::transaction(function () use ($contract, $user, $notes) {
            // Calculate total retention accumulated from paid/authorized certificates
            $totalRetentionHeld = (float) PaymentCertificate::where('contract_id', $contract->id)
                ->whereIn('status', ['paid', 'authorized_by_admin', 'approved_by_finance'])
                ->sum('retention_deducted');

            if ($totalRetentionHeld <= 0) {
                throw ValidationException::withMessages([
                    'retention' => ['No accumulated retention fund found for this contract.'],
                ]);
            }

            // Check if retention release certificate already created
            $existing = PaymentCertificate::where('contract_id', $contract->id)
                ->where('certificate_type', 'retention_release')
                ->whereNotIn('status', ['rejected'])
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'retention' => ["A retention release certificate ({$existing->certificate_number}) already exists for this contract."],
                ]);
            }

            $certificateNumber = PaymentCertificate::generateCertificateNumber();

            $certificate = PaymentCertificate::create([
                'certificate_number' => $certificateNumber,
                'contract_id' => $contract->id,
                'project_id' => $contract->project_id,
                'site_id' => $contract->site_id,
                'valuation_period_start' => $contract->start_date ? $contract->start_date->toDateString() : now()->subYear()->toDateString(),
                'valuation_period_end' => now()->toDateString(),
                'valuation_date' => now()->toDateString(),
                'certificate_type' => 'retention_release',
                'gross_amount' => $totalRetentionHeld,
                'previous_gross_amount' => 0.00,
                'current_gross_amount' => $totalRetentionHeld,
                'materials_on_site_value' => 0.00,
                'retention_rate' => 0.00,
                'retention_deducted' => 0.00,
                'withholding_tax_rate' => 0.00, // WHT was already deducted during interim certifications
                'withholding_tax_amount' => 0.00,
                'other_deductions' => 0.00,
                'net_certified_amount' => $totalRetentionHeld,
                'currency' => $contract->currency ?? 'UGX',
                'description' => "Release of 5% Defect Liability Retention for contract: {$contract->title} ({$contract->subcontractor_name})",
                'measurement_sheet_summary' => $notes ?: 'Warranty inspection passed with no outstanding punch list snags.',
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            Activity::create([
                'user_id' => $user->id,
                'type' => 'subcontractor_retention_certificate_generated',
                'entity_type' => PaymentCertificate::class,
                'entity_id' => $certificate->id,
                'description' => "Generated Retention Release Certificate {$certificateNumber} for {$contract->subcontractor_name}",
                'properties' => [
                    'certificate_id' => $certificate->id,
                    'contract_id' => $contract->id,
                    'released_amount' => $totalRetentionHeld,
                ],
            ]);

            return $certificate->fresh(['contract', 'project', 'site']);
        });
    }

    /**
     * Get summary progress of a contract's milestones.
     */
    public function getContractMilestoneProgress(SubcontractorContract $contract): array
    {
        $milestones = ContractMilestone::where('contract_id', $contract->id)
            ->with(['milestone'])
            ->get();

        $totalAllocated = $milestones->sum('allocated_amount');
        $totalCertified = $milestones->sum('certified_amount');
        $totalPaid = $milestones->sum('paid_amount');

        $totalRetentionHeld = (float) PaymentCertificate::where('contract_id', $contract->id)
            ->whereIn('status', ['paid', 'authorized_by_admin'])
            ->sum('retention_deducted');

        $retentionReleased = (float) PaymentCertificate::where('contract_id', $contract->id)
            ->where('certificate_type', 'retention_release')
            ->where('status', 'paid')
            ->sum('net_certified_amount');

        return [
            'contract_sum' => (float) $contract->contract_sum,
            'total_allocated' => round(floatval($totalAllocated), 2),
            'total_certified' => round(floatval($totalCertified), 2),
            'total_paid' => round(floatval($totalPaid), 2),
            'remaining_balance' => max(0, round(floatval($contract->contract_sum - $totalCertified), 2)),
            'retention_held' => max(0, round(floatval($totalRetentionHeld - $retentionReleased), 2)),
            'retention_released' => round(floatval($retentionReleased), 2),
            'percentage_certified' => $contract->contract_sum > 0 ? round(($totalCertified / $contract->contract_sum) * 100, 2) : 0,
            'milestones_count' => $milestones->count(),
            'milestones_completed_count' => $milestones->where('status', 'completed')->count(),
        ];
    }

    /**
     * Get a cross-sectional matrix of all project milestones, assigned subcontractors, and valuations.
     */
    public function getProjectMilestoneSubcontractorMatrix(Project $project): array
    {
        $milestones = ConstructionMilestone::where('project_id', $project->id)
            ->with([
                'contractMilestones.contract',
                'verifications' => function ($q) {
                    $q->latest('inspection_date');
                },
                'paymentCertificates.contract',
            ])
            ->orderBy('milestone_order')
            ->get();

        $matrix = [];
        $totalAllocated = 0;
        $totalCertified = 0;

        foreach ($milestones as $m) {
            $assignedSubcontractors = [];
            foreach ($m->contractMilestones as $cm) {
                if ($cm->contract) {
                    $assignedSubcontractors[] = [
                        'contract_id' => $cm->contract->id,
                        'contract_uuid' => $cm->contract->uuid,
                        'contract_number' => $cm->contract->contract_number,
                        'subcontractor_name' => $cm->contract->subcontractor_name,
                        'trade_category' => $cm->contract->trade_category,
                        'allocated_amount' => (float) $cm->allocated_amount,
                        'certified_amount' => (float) $cm->certified_amount,
                        'status' => $cm->status,
                    ];
                    $totalAllocated += (float) $cm->allocated_amount;
                    $totalCertified += (float) $cm->certified_amount;
                }
            }

            $latestVerification = $m->verifications->first();

            $matrix[] = [
                'milestone_id' => $m->id,
                'milestone_uuid' => $m->uuid,
                'milestone_order' => $m->milestone_order,
                'milestone_name' => $m->milestone_name,
                'physical_completion_percentage' => (float) $m->completion_percentage,
                'status' => $m->status,
                'latest_verification' => $latestVerification ? [
                    'verification_number' => $latestVerification->verification_number,
                    'stage' => $latestVerification->stage,
                    'qs_certified_amount' => (float) $latestVerification->qs_certified_amount,
                    'client_approval_status' => $latestVerification->client_approval_status,
                ] : null,
                'assigned_subcontractors' => $assignedSubcontractors,
                'certificates_count' => $m->paymentCertificates->count(),
                'total_certificates_gross' => (float) $m->paymentCertificates->sum('gross_amount'),
            ];
        }

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'total_milestones' => count($matrix),
            'total_allocated_subcontractor_sum' => round($totalAllocated, 2),
            'total_certified_subcontractor_sum' => round($totalCertified, 2),
            'matrix' => $matrix,
        ];
    }
}
