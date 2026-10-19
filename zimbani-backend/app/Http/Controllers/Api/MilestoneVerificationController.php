<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConstructionMilestone;
use App\Models\MilestoneVerification;
use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Services\MilestonePaymentReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MilestoneVerificationController extends Controller
{
    protected MilestonePaymentReleaseService $releaseService;

    public function __construct(MilestonePaymentReleaseService $releaseService)
    {
        $this->releaseService = $releaseService;
    }

    /**
     * Display a listing of milestone verifications.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MilestoneVerification::with([
            'milestone',
            'project',
            'site',
            'unit',
            'client',
            'siteEngineer',
            'quantitySurveyor',
            'paymentReleases',
        ]);

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $p = Project::where('uuid', $projectId)->first();
                if ($p) $query->where('project_id', $p->id);
            }
        }

        if ($request->filled('unit_id')) {
            $unitId = $request->unit_id;
            if (is_numeric($unitId)) {
                $query->where('unit_id', $unitId);
            } else {
                $u = Unit::where('uuid', $unitId)->first();
                if ($u) $query->where('unit_id', $u->id);
            }
        }

        if ($request->filled('milestone_id')) {
            $query->where('milestone_id', $request->milestone_id);
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('verification_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $verifications = $query->latest('id')->paginate($perPage);

        return response()->json($verifications);
    }

    /**
     * Store a newly created milestone verification request.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'milestone_id' => 'required',
            'project_id' => 'required',
            'site_id' => 'nullable',
            'unit_id' => 'nullable',
            'title' => 'required|string|max:255',
            'physical_completion_percentage' => 'required|numeric|min:0|max:100',
            'work_quality_rating' => 'nullable|in:exceptional,satisfactory,defects_noted,rejected',
            'inspection_date' => 'nullable|date',
            'inspection_notes' => 'nullable|string',
        ]);

        $project = is_numeric($request->project_id)
            ? Project::findOrFail($request->project_id)
            : Project::where('uuid', $request->project_id)->firstOrFail();

        $milestone = is_numeric($request->milestone_id)
            ? ConstructionMilestone::findOrFail($request->milestone_id)
            : ConstructionMilestone::where('uuid', $request->milestone_id)->firstOrFail();

        $siteId = null;
        if ($request->filled('site_id')) {
            $site = is_numeric($request->site_id)
                ? Site::find($request->site_id)
                : Site::where('uuid', $request->site_id)->first();
            if ($site) $siteId = $site->id;
        }

        $unitId = null;
        $clientId = null;
        if ($request->filled('unit_id')) {
            $unit = is_numeric($request->unit_id)
                ? Unit::find($request->unit_id)
                : Unit::where('uuid', $request->unit_id)->first();
            if ($unit) {
                $unitId = $unit->id;
                $clientId = $unit->client_id;
            }
        }

        $verification = MilestoneVerification::create([
            'project_id' => $project->id,
            'milestone_id' => $milestone->id,
            'site_id' => $siteId,
            'unit_id' => $unitId,
            'client_id' => $clientId,
            'title' => trim($request->title),
            'stage' => 'draft',
            'physical_completion_percentage' => $request->physical_completion_percentage,
            'work_quality_rating' => $request->work_quality_rating ?? 'satisfactory',
            'inspection_date' => $request->inspection_date ?? now()->toDateString(),
            'inspection_notes' => $request->inspection_notes,
        ]);

        return response()->json([
            'message' => 'Milestone verification request created successfully.',
            'data' => $verification->load(['milestone', 'project', 'site', 'unit']),
        ], 201);
    }

    /**
     * Display the specified milestone verification.
     */
    public function show(MilestoneVerification $milestoneVerification): JsonResponse
    {
        return response()->json([
            'data' => $milestoneVerification->load([
                'milestone',
                'project',
                'site',
                'unit',
                'client',
                'siteEngineer',
                'quantitySurveyor',
                'paymentReleases',
                'documents',
                'createdBy',
            ]),
        ]);
    }

    /**
     * Update the specified milestone verification in draft stage.
     */
    public function update(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        if ($milestoneVerification->stage !== 'draft') {
            return response()->json([
                'message' => 'Only draft milestone verifications can be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'physical_completion_percentage' => 'sometimes|numeric|min:0|max:100',
            'work_quality_rating' => 'sometimes|in:exceptional,satisfactory,defects_noted,rejected',
            'inspection_date' => 'sometimes|date',
            'inspection_notes' => 'nullable|string',
        ]);

        $milestoneVerification->update($validated);

        return response()->json([
            'message' => 'Milestone verification updated successfully.',
            'data' => $milestoneVerification->fresh(['milestone', 'project', 'site', 'unit']),
        ]);
    }

    /**
     * Remove the specified milestone verification.
     */
    public function destroy(MilestoneVerification $milestoneVerification): JsonResponse
    {
        if ($milestoneVerification->stage !== 'draft') {
            return response()->json([
                'message' => 'Only draft milestone verifications can be deleted.',
            ], 422);
        }

        $milestoneVerification->delete();

        return response()->json([
            'message' => 'Milestone verification deleted successfully.',
        ]);
    }

    /**
     * Submit milestone verification for physical site inspections.
     */
    public function submit(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        $updated = $this->releaseService->submitVerification($milestoneVerification, $request->user());

        return response()->json([
            'message' => 'Milestone verification submitted for physical inspections.',
            'data' => $updated,
        ]);
    }

    /**
     * Stage 1: Site Engineer Physical Sign-Off.
     */
    public function signOffSiteEngineer(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        $validated = $request->validate([
            'structural_checks_passed' => 'required|boolean',
            'physical_completion_percentage' => 'nullable|numeric|min:0|max:100',
            'work_quality_rating' => 'nullable|in:exceptional,satisfactory,defects_noted,rejected',
            'inspection_date' => 'nullable|date',
            'engineer_notes' => 'required|string',
        ]);

        $updated = $this->releaseService->signOffSiteEngineer($milestoneVerification, $request->user(), $validated);

        return response()->json([
            'message' => 'Site Engineer physical inspection signed off successfully.',
            'data' => $updated,
        ]);
    }

    /**
     * Stage 2: Quantity Surveyor (QS) Physical Valuation Sign-Off.
     */
    public function signOffQuantitySurveyor(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        $validated = $request->validate([
            'qs_certified_amount' => 'required|numeric|min:1',
            'boq_compliance_status' => 'required|in:fully_compliant,minor_variations,non_compliant',
            'retention_percentage' => 'nullable|numeric|min:0|max:20',
            'qs_notes' => 'required|string',
        ]);

        $updated = $this->releaseService->signOffQuantitySurveyor($milestoneVerification, $request->user(), $validated);

        return response()->json([
            'message' => 'Quantity Surveyor physical valuation certified and payment release generated.',
            'data' => $updated,
        ]);
    }

    /**
     * Stage 3: Client Progress Approval or Administrative Waiver.
     */
    public function clientApprove(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,disputed,waived_by_admin',
            'client_feedback' => 'nullable|string',
        ]);

        $updated = $this->releaseService->clientApprove($milestoneVerification, $request->user(), $validated);

        return response()->json([
            'message' => "Milestone progress verification marked as '{$validated['status']}'.",
            'data' => $updated,
        ]);
    }

    /**
     * Reject milestone verification.
     */
    public function reject(Request $request, MilestoneVerification $milestoneVerification): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $updated = $this->releaseService->rejectVerification($milestoneVerification, $request->user(), $validated['reason']);

        return response()->json([
            'message' => 'Milestone verification rejected.',
            'data' => $updated,
        ]);
    }
}
