<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRequisitionRequest;
use App\Http\Requests\UpdateRequisitionRequest;
use App\Http\Resources\MaterialRequisitionResource;
use App\Models\MaterialRequisition;
use App\Models\Site;
use App\Models\Project;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MaterialRequisitionController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of material requisitions
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MaterialRequisition::class);

        $query = MaterialRequisition::with(['site', 'project', 'requestedByUser', 'approvedByUser']);

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
                $p = Project::where('uuid', $projectId)->first();
                $projectId = $p ? $p->id : null;
            }
            if ($projectId) {
                $query->where('project_id', $projectId);
            }
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Priority
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('requisition_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $allowedSorts = ['created_at', 'required_by_date', 'total_estimated_cost', 'status', 'priority'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->get('per_page', 15);
        $requisitions = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => MaterialRequisitionResource::collection($requisitions),
            'meta' => [
                'current_page' => $requisitions->currentPage(),
                'last_page' => $requisitions->lastPage(),
                'per_page' => $requisitions->perPage(),
                'total' => $requisitions->total(),
            ],
            'pagination' => [
                'current_page' => $requisitions->currentPage(),
                'last_page' => $requisitions->lastPage(),
                'per_page' => $requisitions->perPage(),
                'total' => $requisitions->total(),
            ],
        ]);
    }

    /**
     * Store a newly created material requisition
     */
    public function store(StoreRequisitionRequest $request): JsonResponse
    {
        $this->authorize('create', MaterialRequisition::class);

        $data = $request->validated();
        $requisition = MaterialRequisition::create($data);
        $requisition->load(['site', 'project', 'requestedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'requisition_created',
            'entity_type' => MaterialRequisition::class,
            'entity_id' => $requisition->id,
            'description' => "Created material requisition {$requisition->requisition_number}",
            'properties' => [
                'requisition_number' => $requisition->requisition_number,
                'total_cost' => $requisition->total_estimated_cost,
                'items_count' => count($requisition->items ?? []),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material requisition submitted successfully',
            'data' => new MaterialRequisitionResource($requisition),
        ], 201);
    }

    /**
     * Display the specified requisition
     */
    public function show(MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('view', $requisition);

        $requisition->load(['site', 'project', 'requestedByUser', 'approvedByUser', 'documents']);

        return response()->json([
            'success' => true,
            'data' => new MaterialRequisitionResource($requisition),
        ]);
    }

    /**
     * Update the specified requisition
     */
    public function update(UpdateRequisitionRequest $request, MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('update', $requisition);

        $data = $request->validated();
        $requisition->update($data);
        $requisition->load(['site', 'project', 'requestedByUser', 'approvedByUser']);

        return response()->json([
            'success' => true,
            'message' => 'Requisition updated successfully',
            'data' => new MaterialRequisitionResource($requisition),
        ]);
    }

    /**
     * Remove the specified requisition
     */
    public function destroy(Request $request, MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('delete', $requisition);

        $reqNumber = $requisition->requisition_number;
        $requisition->delete();

        return response()->json([
            'success' => true,
            'message' => "Requisition {$reqNumber} deleted successfully",
        ]);
    }

    /**
     * Approve requisition
     */
    public function approve(Request $request, MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('approve', $requisition);

        $requisition->approve(auth()->id());
        $requisition->load(['site', 'project', 'requestedByUser', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'requisition_approved',
            'entity_type' => MaterialRequisition::class,
            'entity_id' => $requisition->id,
            'description' => "Approved requisition {$requisition->requisition_number}",
            'properties' => ['requisition_number' => $requisition->requisition_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Requisition {$requisition->requisition_number} approved",
            'data' => new MaterialRequisitionResource($requisition),
        ]);
    }

    /**
     * Reject requisition
     */
    public function reject(Request $request, MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('approve', $requisition);

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $requisition->reject(auth()->id(), $validated['rejection_reason']);
        $requisition->load(['site', 'project', 'requestedByUser', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'requisition_rejected',
            'entity_type' => MaterialRequisition::class,
            'entity_id' => $requisition->id,
            'description' => "Rejected requisition {$requisition->requisition_number}",
            'properties' => [
                'requisition_number' => $requisition->requisition_number,
                'reason' => $validated['rejection_reason']
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Requisition {$requisition->requisition_number} rejected",
            'data' => new MaterialRequisitionResource($requisition),
        ]);
    }

    /**
     * Mark as delivered and restock site inventory
     */
    public function deliver(Request $request, MaterialRequisition $requisition): JsonResponse
    {
        $this->authorize('update', $requisition);

        $requisition->markDelivered();
        $requisition->load(['site', 'project', 'requestedByUser', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'requisition_delivered',
            'entity_type' => MaterialRequisition::class,
            'entity_id' => $requisition->id,
            'description' => "Marked requisition {$requisition->requisition_number} as delivered and restocked inventory",
            'properties' => ['requisition_number' => $requisition->requisition_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Requisition marked as delivered. Inventory items restocked successfully.",
            'data' => new MaterialRequisitionResource($requisition),
        ]);
    }
}
