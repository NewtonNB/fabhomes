<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorContract;
use App\Models\MilestoneVerification;
use App\Models\Project;
use App\Services\SubcontractorMilestoneValuationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Exception;

class SubcontractorMilestoneValuationController extends Controller
{
    protected SubcontractorMilestoneValuationService $service;

    public function __construct(SubcontractorMilestoneValuationService $service)
    {
        $this->service = $service;
    }

    /**
     * Get allocated milestones for a subcontractor contract.
     */
    public function getContractMilestones(string $contractUuid): JsonResponse
    {
        $contract = SubcontractorContract::where('uuid', $contractUuid)
            ->orWhere('id', $contractUuid)
            ->firstOrFail();

        $contractMilestones = $contract->contractMilestones()->with(['milestone'])->get();

        return response()->json([
            'success' => true,
            'data' => $contractMilestones,
        ]);
    }

    /**
     * Allocate project milestones to a subcontractor contract.
     */
    public function allocateMilestones(Request $request, string $contractUuid): JsonResponse
    {
        $request->validate([
            'milestones' => 'required|array|min:1',
            'milestones.*.milestone_id' => 'required|integer|exists:construction_milestones,id',
            'milestones.*.allocated_amount' => 'required|numeric|min:0.01',
            'milestones.*.weight_percentage' => 'nullable|numeric|between:0,100',
            'milestones.*.start_date' => 'nullable|date',
            'milestones.*.due_date' => 'nullable|date',
            'milestones.*.notes' => 'nullable|string',
        ]);

        $contract = SubcontractorContract::where('uuid', $contractUuid)
            ->orWhere('id', $contractUuid)
            ->firstOrFail();

        try {
            $allocations = $this->service->allocateMilestones(
                $contract,
                $request->input('milestones'),
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => 'Milestones allocated to contract successfully.',
                'data' => $allocations,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * One-click generate an Interim Payment Certificate from a QS-verified Milestone Verification.
     */
    public function generateCertificateFromMilestone(Request $request, string $verificationUuid): JsonResponse
    {
        $request->validate([
            'contract_id' => 'required',
            'certified_amount' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
            'materials_on_site_value' => 'nullable|numeric|min:0',
            'measurement_summary' => 'nullable|string',
            'valuation_period_start' => 'nullable|date',
            'valuation_period_end' => 'nullable|date',
        ]);

        $verification = MilestoneVerification::where('uuid', $verificationUuid)
            ->orWhere('id', $verificationUuid)
            ->firstOrFail();

        $contract = SubcontractorContract::where('uuid', $request->input('contract_id'))
            ->orWhere('id', $request->input('contract_id'))
            ->firstOrFail();

        try {
            $certificate = $this->service->generateCertificateFromMilestone(
                $verification,
                $contract,
                $request->all(),
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Payment Certificate {$certificate->certificate_number} generated successfully from milestone verification.",
                'data' => $certificate,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate 5% Defect Liability Retention Release Certificate for Subcontractor.
     */
    public function generateRetentionReleaseCertificate(Request $request, string $contractUuid): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $contract = SubcontractorContract::where('uuid', $contractUuid)
            ->orWhere('id', $contractUuid)
            ->firstOrFail();

        try {
            $certificate = $this->service->generateRetentionReleaseCertificate(
                $contract,
                $request->user(),
                $request->input('notes')
            );

            return response()->json([
                'success' => true,
                'message' => "Retention Release Certificate {$certificate->certificate_number} generated successfully.",
                'data' => $certificate,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get milestone progress and valuation statistics for a subcontractor contract.
     */
    public function getContractMilestoneProgress(string $contractUuid): JsonResponse
    {
        $contract = SubcontractorContract::where('uuid', $contractUuid)
            ->orWhere('id', $contractUuid)
            ->firstOrFail();

        $progress = $this->service->getContractMilestoneProgress($contract);

        return response()->json([
            'success' => true,
            'data' => $progress,
        ]);
    }

    /**
     * Get project cross-sectional milestone & subcontractor valuation matrix.
     */
    public function getProjectMilestoneSubcontractorMatrix(string $projectUuid): JsonResponse
    {
        $project = Project::where('uuid', $projectUuid)
            ->orWhere('id', $projectUuid)
            ->firstOrFail();

        $matrix = $this->service->getProjectMilestoneSubcontractorMatrix($project);

        return response()->json([
            'success' => true,
            'data' => $matrix,
        ]);
    }
}
