<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePunchListItemRequest;
use App\Http\Requests\UpdatePunchListItemRequest;
use App\Http\Requests\RectifyPunchListItemRequest;
use App\Http\Requests\VerifyPunchListItemRequest;
use App\Http\Resources\PunchListItemResource;
use App\Models\PunchListItem;
use App\Models\Site;
use App\Models\Project;
use App\Models\SiteInspection;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PunchListItemController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of punch list & defect items.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PunchListItem::class);

        $query = PunchListItem::with([
            'siteInspection',
            'site',
            'project',
            'unit',
            'task',
            'assignedUser',
            'reportedByUser',
            'verifiedByUser',
        ]);

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

        // Filter by Inspection
        if ($request->filled('site_inspection_id')) {
            $insId = $request->site_inspection_id;
            if (!is_numeric($insId)) {
                $ins = SiteInspection::where('uuid', $insId)->first();
                $insId = $ins ? $ins->id : null;
            }
            if ($insId) {
                $query->where('site_inspection_id', $insId);
            }
        }

        // Filter by Category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by Severity
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter Open Only
        if ($request->boolean('open_only')) {
            $query->open();
        }

        // Filter Overdue Only
        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        // Filter Assigned To
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('item_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location_details', 'like', "%{$search}%")
                  ->orWhere('subcontractor_name', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['due_date', 'severity', 'status', 'category', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $items = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => PunchListItemResource::collection($items),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * Store a newly created punch list item / defect.
     */
    public function store(StorePunchListItemRequest $request): JsonResponse
    {
        $this->authorize('create', PunchListItem::class);

        $validated = $request->validated();
        $punchItem = PunchListItem::create($validated);
        $punchItem->load([
            'siteInspection',
            'site',
            'project',
            'unit',
            'task',
            'assignedUser',
            'reportedByUser',
        ]);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'punch_list_item_created',
            'entity_type' => PunchListItem::class,
            'entity_id' => $punchItem->id,
            'description' => "Logged defect #{$punchItem->item_number}: {$punchItem->title} ({$punchItem->severity})",
            'properties' => [
                'item_number' => $punchItem->item_number,
                'severity' => $punchItem->severity,
                'category' => $punchItem->category,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Punch list item logged successfully.',
            'data' => new PunchListItemResource($punchItem),
        ], 201);
    }

    /**
     * Display the specified punch list item.
     */
    public function show(PunchListItem $punchItem): JsonResponse
    {
        $this->authorize('view', $punchItem);

        $punchItem->load([
            'siteInspection',
            'site',
            'project',
            'unit',
            'task',
            'assignedUser',
            'reportedByUser',
            'verifiedByUser',
            'documents',
        ]);

        return response()->json([
            'success' => true,
            'data' => new PunchListItemResource($punchItem),
        ]);
    }

    /**
     * Update the specified punch list item.
     */
    public function update(UpdatePunchListItemRequest $request, PunchListItem $punchItem): JsonResponse
    {
        $this->authorize('update', $punchItem);

        $validated = $request->validated();
        $punchItem->update($validated);
        $punchItem->load([
            'siteInspection',
            'site',
            'project',
            'unit',
            'task',
            'assignedUser',
            'reportedByUser',
            'verifiedByUser',
        ]);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'punch_list_item_updated',
            'entity_type' => PunchListItem::class,
            'entity_id' => $punchItem->id,
            'description' => "Updated defect #{$punchItem->item_number}",
            'properties' => ['item_number' => $punchItem->item_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Punch list item updated successfully.',
            'data' => new PunchListItemResource($punchItem),
        ]);
    }

    /**
     * Remove the specified punch list item.
     */
    public function destroy(Request $request, PunchListItem $punchItem): JsonResponse
    {
        $this->authorize('delete', $punchItem);

        $number = $punchItem->item_number;
        $punchItem->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'punch_list_item_deleted',
            'entity_type' => PunchListItem::class,
            'entity_id' => $punchItem->id,
            'description' => "Deleted defect #{$number}",
            'properties' => ['item_number' => $number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Punch list item deleted successfully.',
        ]);
    }

    /**
     * Mark defect as rectified by worker/contractor.
     */
    public function rectify(RectifyPunchListItemRequest $request, PunchListItem $punchItem): JsonResponse
    {
        $this->authorize('update', $punchItem);

        $validated = $request->validated();
        $punchItem->markRectified($validated['rectification_notes']);
        $punchItem->load(['site', 'project', 'assignedUser', 'reportedByUser', 'verifiedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'punch_list_item_rectified',
            'entity_type' => PunchListItem::class,
            'entity_id' => $punchItem->id,
            'description' => "Marked defect #{$punchItem->item_number} as rectified",
            'properties' => ['item_number' => $punchItem->item_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Defect marked as rectified, awaiting verification sign-off.',
            'data' => new PunchListItemResource($punchItem),
        ]);
    }

    /**
     * Verify rectification and close or waive defect.
     */
    public function verify(VerifyPunchListItemRequest $request, PunchListItem $punchItem): JsonResponse
    {
        $this->authorize('verify', $punchItem);

        $validated = $request->validated();
        $action = $validated['action'] ?? 'close';

        if ($action === 'waive') {
            $punchItem->waive($validated['verification_notes'] ?? null);
            $msg = 'Defect item waived.';
        } else {
            $punchItem->verifyAndClose(auth()->id(), $validated['verification_notes'] ?? null);
            $msg = 'Defect rectification verified and closed.';
        }

        $punchItem->load(['site', 'project', 'assignedUser', 'reportedByUser', 'verifiedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'punch_list_item_verified',
            'entity_type' => PunchListItem::class,
            'entity_id' => $punchItem->id,
            'description' => "Verified defect #{$punchItem->item_number} as {$punchItem->status}",
            'properties' => [
                'item_number' => $punchItem->item_number,
                'status' => $punchItem->status,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $msg,
            'data' => new PunchListItemResource($punchItem),
        ]);
    }

    /**
     * Aggregate defect statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PunchListItem::class);

        $siteId = $request->site_id;
        if ($siteId && !is_numeric($siteId)) {
            $site = Site::where('uuid', $siteId)->first();
            $siteId = $site ? $site->id : null;
        }

        $query = PunchListItem::query();
        if ($siteId) {
            $query->where('site_id', $siteId);
        }

        $total = (clone $query)->count();
        $open = (clone $query)->whereIn('status', ['open', 'in_progress'])->count();
        $rectified = (clone $query)->where('status', 'rectified')->count();
        $closed = (clone $query)->where('status', 'verified_closed')->count();
        $waived = (clone $query)->where('status', 'waived')->count();
        $overdue = (clone $query)->overdue()->count();
        $critical = (clone $query)->critical()->whereIn('status', ['open', 'in_progress'])->count();

        // Breakdown by severity
        $bySeverity = (clone $query)
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        // Breakdown by category
        $byCategory = (clone $query)
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'open' => $open,
                'rectified' => $rectified,
                'closed' => $closed,
                'waived' => $waived,
                'overdue' => $overdue,
                'critical_open' => $critical,
                'by_severity' => $bySeverity,
                'by_category' => $byCategory,
            ],
        ]);
    }
}
