<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MilestonePaymentRelease;
use App\Models\Project;
use App\Models\Unit;
use App\Services\MilestonePaymentReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MilestonePaymentReleaseController extends Controller
{
    protected MilestonePaymentReleaseService $releaseService;

    public function __construct(MilestonePaymentReleaseService $releaseService)
    {
        $this->releaseService = $releaseService;
    }

    /**
     * Display a listing of milestone payment releases.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MilestonePaymentRelease::with([
            'milestoneVerification',
            'milestone',
            'project',
            'site',
            'unit',
            'client',
            'savingsAccount',
            'authorizedByUser',
            'disbursedByUser',
            'transaction',
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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('source_type')) {
            $query->where('source_type', $request->source_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('release_number', 'like', "%{$search}%")
                  ->orWhere('disbursement_reference', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $releases = $query->latest('id')->paginate($perPage);

        return response()->json($releases);
    }

    /**
     * Display the specified milestone payment release.
     */
    public function show(MilestonePaymentRelease $milestonePaymentRelease): JsonResponse
    {
        return response()->json([
            'data' => $milestonePaymentRelease->load([
                'milestoneVerification.siteEngineer',
                'milestoneVerification.quantitySurveyor',
                'milestone',
                'project',
                'site',
                'unit',
                'client',
                'savingsAccount',
                'authorizedByUser',
                'disbursedByUser',
                'retentionReleasedByUser',
                'transaction',
                'retentionTransaction',
                'documents',
            ]),
        ]);
    }

    /**
     * Stage 4: Finance Manager Authorization for Payment Release.
     */
    public function authorizeRelease(Request $request, MilestonePaymentRelease $milestonePaymentRelease): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $updated = $this->releaseService->authorizeRelease(
            $milestonePaymentRelease,
            $request->user(),
            $validated['notes'] ?? null
        );

        return response()->json([
            'message' => 'Milestone payment release authorized successfully.',
            'data' => $updated,
        ]);
    }

    /**
     * Stage 5: Financial Disbursement & Ledger Posting.
     */
    public function disburse(Request $request, MilestonePaymentRelease $milestonePaymentRelease): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|in:internal_transfer,bank_transfer,mobile_money,cheque',
            'disbursement_reference' => 'required|string|max:100',
        ]);

        $updated = $this->releaseService->disburseRelease(
            $milestonePaymentRelease,
            $request->user(),
            $validated
        );

        return response()->json([
            'message' => 'Milestone payment disbursed and posted to immutable ledger successfully.',
            'data' => $updated,
        ]);
    }

    /**
     * Stage 6: Defect Liability Period Clearance & Retention Release.
     */
    public function releaseRetention(Request $request, MilestonePaymentRelease $milestonePaymentRelease): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'required|string',
        ]);

        $updated = $this->releaseService->releaseRetentionFund(
            $milestonePaymentRelease,
            $request->user(),
            $validated
        );

        return response()->json([
            'message' => 'Defect liability retention fund released and recorded.',
            'data' => $updated,
        ]);
    }

    /**
     * Get analytical statistics for milestone releases.
     */
    public function statistics(Request $request): JsonResponse
    {
        $projectId = null;
        if ($request->filled('project_id')) {
            $raw = $request->project_id;
            if (is_numeric($raw)) {
                $projectId = (int) $raw;
            } else {
                $p = Project::where('uuid', $raw)->first();
                if ($p) $projectId = $p->id;
            }
        }

        $stats = $this->releaseService->getStatistics($projectId);

        return response()->json(['data' => $stats]);
    }
}
