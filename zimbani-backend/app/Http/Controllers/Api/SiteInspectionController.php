<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteInspectionRequest;
use App\Http\Requests\UpdateSiteInspectionRequest;
use App\Http\Requests\CompleteInspectionRequest;
use App\Http\Requests\SignOffInspectionRequest;
use App\Http\Resources\SiteInspectionResource;
use App\Models\SiteInspection;
use App\Models\Site;
use App\Models\Project;
use App\Models\PunchListItem;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SiteInspectionController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of site quality inspections.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SiteInspection::class);

        $query = SiteInspection::with(['site', 'project', 'unit', 'task', 'milestone', 'inspector', 'supervisor'])
            ->withCount('punchListItems');

        // Filter by Site
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (!is_numeric($siteId)) {
                $site = Site::where('uuid', $siteId)->first();
                $siteId = $site ? $site->id : null;
            }
            if ($siteId) {
                $query->where('site_id', $siteId);
            }
        }

        // Filter by Project
        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (!is_numeric($projectId)) {
                $project = Project::where('uuid', $projectId)->first();
                $projectId = $project ? $project->id : null;
            }
            if ($projectId) {
                $query->where('project_id', $projectId);
            }
        }

        // Filter by Inspection Type
        if ($request->filled('inspection_type')) {
            $query->where('inspection_type', $request->inspection_type);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Inspector
        if ($request->filled('inspector_id')) {
            $query->where('inspector_id', $request->inspector_id);
        }

        // Filter Needs Sign-off
        if ($request->boolean('needs_sign_off')) {
            $query->needsSignOff();
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('inspection_number', 'like', "%{$search}%")
                  ->orWhere('summary_notes', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'scheduled_date');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['scheduled_date', 'title', 'inspection_type', 'status', 'score', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('scheduled_date', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $inspections = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => SiteInspectionResource::collection($inspections),
            'meta' => [
                'current_page' => $inspections->currentPage(),
                'last_page' => $inspections->lastPage(),
                'per_page' => $inspections->perPage(),
                'total' => $inspections->total(),
            ],
            'pagination' => [
                'current_page' => $inspections->currentPage(),
                'last_page' => $inspections->lastPage(),
                'per_page' => $inspections->perPage(),
                'total' => $inspections->total(),
            ],
        ]);
    }

    /**
     * Store a newly created site inspection.
     */
    public function store(StoreSiteInspectionRequest $request): JsonResponse
    {
        $this->authorize('create', SiteInspection::class);

        $validated = $request->validated();
        $inspection = SiteInspection::create($validated);
        $inspection->load(['site', 'project', 'unit', 'task', 'milestone', 'inspector', 'supervisor']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_inspection_created',
            'entity_type' => SiteInspection::class,
            'entity_id' => $inspection->id,
            'description' => "Scheduled inspection {$inspection->inspection_number} - {$inspection->title}",
            'properties' => [
                'inspection_number' => $inspection->inspection_number,
                'inspection_type' => $inspection->inspection_type,
                'scheduled_date' => $inspection->scheduled_date?->toDateString(),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inspection scheduled successfully.',
            'data' => new SiteInspectionResource($inspection),
        ], 201);
    }

    /**
     * Display the specified site inspection with all items and defects.
     */
    public function show(SiteInspection $inspection): JsonResponse
    {
        $this->authorize('view', $inspection);

        $inspection->load([
            'site',
            'project',
            'unit',
            'task',
            'milestone',
            'inspector',
            'supervisor',
            'createdByUser',
            'punchListItems.assignedUser',
            'punchListItems.verifiedByUser',
            'documents',
        ])->loadCount('punchListItems');

        return response()->json([
            'success' => true,
            'data' => new SiteInspectionResource($inspection),
        ]);
    }

    /**
     * Update the specified site inspection.
     */
    public function update(UpdateSiteInspectionRequest $request, SiteInspection $inspection): JsonResponse
    {
        $this->authorize('update', $inspection);

        $validated = $request->validated();
        $inspection->update($validated);
        $inspection->load(['site', 'project', 'unit', 'task', 'milestone', 'inspector', 'supervisor'])
            ->loadCount('punchListItems');

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_inspection_updated',
            'entity_type' => SiteInspection::class,
            'entity_id' => $inspection->id,
            'description' => "Updated inspection {$inspection->inspection_number}",
            'properties' => ['inspection_number' => $inspection->inspection_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inspection updated successfully.',
            'data' => new SiteInspectionResource($inspection),
        ]);
    }

    /**
     * Remove the specified site inspection.
     */
    public function destroy(Request $request, SiteInspection $inspection): JsonResponse
    {
        $this->authorize('delete', $inspection);

        $number = $inspection->inspection_number;
        $inspection->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_inspection_deleted',
            'entity_type' => SiteInspection::class,
            'entity_id' => $inspection->id,
            'description' => "Deleted inspection {$number}",
            'properties' => ['inspection_number' => $number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inspection deleted successfully.',
        ]);
    }

    /**
     * Complete inspection assessment checklist run.
     */
    public function complete(CompleteInspectionRequest $request, SiteInspection $inspection): JsonResponse
    {
        $this->authorize('update', $inspection);

        $validated = $request->validated();
        $inspection->completeInspection(
            $validated['status'],
            $validated['score'] ?? null,
            $validated['checklist_items'] ?? null,
            $validated['summary_notes'] ?? null,
            $validated['conditions'] ?? null
        );

        $inspection->load(['site', 'project', 'unit', 'task', 'milestone', 'inspector', 'supervisor'])
            ->loadCount('punchListItems');

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_inspection_completed',
            'entity_type' => SiteInspection::class,
            'entity_id' => $inspection->id,
            'description' => "Completed assessment for inspection {$inspection->inspection_number} with status {$inspection->status}",
            'properties' => [
                'status' => $inspection->status,
                'score' => $inspection->score,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inspection assessment completed successfully.',
            'data' => new SiteInspectionResource($inspection),
        ]);
    }

    /**
     * Formal sign-off on inspection by supervisor or site manager.
     */
    public function signOff(SignOffInspectionRequest $request, SiteInspection $inspection): JsonResponse
    {
        $this->authorize('signOff', $inspection);

        $validated = $request->validated();
        $supervisorId = $validated['supervisor_id'] ?? auth()->id();

        $inspection->signOff($supervisorId, $validated['sign_off_notes'] ?? null);
        $inspection->load(['site', 'project', 'unit', 'task', 'milestone', 'inspector', 'supervisor'])
            ->loadCount('punchListItems');

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_inspection_signed_off',
            'entity_type' => SiteInspection::class,
            'entity_id' => $inspection->id,
            'description' => "Formal sign-off on inspection {$inspection->inspection_number} by " . auth()->user()->name,
            'properties' => [
                'signed_off_at' => $inspection->signed_off_at,
                'supervisor_id' => $supervisorId,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inspection successfully signed off.',
            'data' => new SiteInspectionResource($inspection),
        ]);
    }

    /**
     * Aggregate quality control and inspection statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SiteInspection::class);

        $siteId = $request->site_id;
        if ($siteId && !is_numeric($siteId)) {
            $site = Site::where('uuid', $siteId)->first();
            $siteId = $site ? $site->id : null;
        }

        $query = SiteInspection::query();
        if ($siteId) {
            $query->where('site_id', $siteId);
        }

        $totalInspections = (clone $query)->count();
        $passed = (clone $query)->where('status', 'passed')->count();
        $failed = (clone $query)->where('status', 'failed')->count();
        $passedWithConditions = (clone $query)->where('status', 'passed_with_conditions')->count();
        $scheduled = (clone $query)->where('status', 'scheduled')->count();
        $inProgress = (clone $query)->where('status', 'in_progress')->count();
        $needsSignOff = (clone $query)->needsSignOff()->count();
        $avgScore = (clone $query)->whereNotNull('score')->avg('score') ?? 0;

        // Breakdown by type
        $byType = (clone $query)
            ->selectRaw('inspection_type, count(*) as count')
            ->groupBy('inspection_type')
            ->pluck('count', 'inspection_type');

        // Defects summary
        $defectQuery = PunchListItem::query();
        if ($siteId) {
            $defectQuery->where('site_id', $siteId);
        }
        $totalDefects = (clone $defectQuery)->count();
        $openDefects = (clone $defectQuery)->whereIn('status', ['open', 'in_progress'])->count();
        $criticalDefects = (clone $defectQuery)->where('severity', 'critical')->whereIn('status', ['open', 'in_progress'])->count();
        $rectifiedDefects = (clone $defectQuery)->where('status', 'rectified')->count();
        $closedDefects = (clone $defectQuery)->where('status', 'verified_closed')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_inspections' => $totalInspections,
                'passed' => $passed,
                'failed' => $failed,
                'passed_with_conditions' => $passedWithConditions,
                'scheduled' => $scheduled,
                'in_progress' => $inProgress,
                'needs_sign_off' => $needsSignOff,
                'average_score' => round((float) $avgScore, 2),
                'by_type' => $byType,
                'defects' => [
                    'total' => $totalDefects,
                    'open' => $openDefects,
                    'critical' => $criticalDefects,
                    'rectified' => $rectifiedDefects,
                    'closed' => $closedDefects,
                ],
            ],
        ]);
    }
}
