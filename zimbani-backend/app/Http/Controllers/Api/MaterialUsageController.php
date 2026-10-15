<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsageRequest;
use App\Http\Resources\MaterialUsageResource;
use App\Models\Material;
use App\Models\MaterialUsage;
use App\Models\Site;
use App\Models\Project;
use App\Models\Task;
use App\Models\ConstructionMilestone;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MaterialUsageController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of material usages.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MaterialUsage::class);

        $query = MaterialUsage::with([
            'material',
            'site',
            'project',
            'task',
            'milestone',
            'unit',
            'loggedByUser',
        ]);

        // Filter by Material
        if ($request->filled('material_id')) {
            $materialId = $request->material_id;
            if (!is_numeric($materialId)) {
                $m = Material::where('uuid', $materialId)->first();
                $materialId = $m ? $m->id : null;
            }
            if ($materialId) {
                $query->where('material_id', $materialId);
            }
        }

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

        // Filter by Task
        if ($request->filled('task_id')) {
            $taskId = $request->task_id;
            if (!is_numeric($taskId)) {
                $t = Task::where('uuid', $taskId)->first();
                $taskId = $t ? $t->id : null;
            }
            if ($taskId) {
                $query->where('task_id', $taskId);
            }
        }

        // Filter by Milestone
        if ($request->filled('milestone_id')) {
            $msId = $request->milestone_id;
            if (!is_numeric($msId)) {
                $ms = ConstructionMilestone::where('uuid', $msId)->first();
                $msId = $ms ? $ms->id : null;
            }
            if ($msId) {
                $query->where('milestone_id', $msId);
            }
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->whereDate('used_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('used_date', '<=', $request->to_date);
        }

        // Search in usage number or purpose
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('usage_number', 'like', "%{$search}%")
                  ->orWhere('purpose', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'used_date');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['used_date', 'created_at', 'quantity_used', 'total_cost'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('used_date', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $usages = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => MaterialUsageResource::collection($usages),
            'meta' => [
                'total' => $usages->total(),
                'per_page' => $usages->perPage(),
                'current_page' => $usages->currentPage(),
                'last_page' => $usages->lastPage(),
            ],
            'pagination' => [
                'total' => $usages->total(),
                'per_page' => $usages->perPage(),
                'current_page' => $usages->currentPage(),
                'last_page' => $usages->lastPage(),
            ],
        ]);
    }

    /**
     * Store a newly recorded material usage.
     */
    public function store(StoreUsageRequest $request): JsonResponse
    {
        $this->authorize('create', MaterialUsage::class);

        $validated = $request->validated();

        // Check material stock
        $material = Material::findOrFail($validated['material_id']);
        if ($material->current_stock < (float) $validated['quantity_used']) {
            return response()->json([
                'message' => "Insufficient stock. Current available stock is {$material->current_stock} {$material->unit_of_measure}.",
                'errors' => [
                    'quantity_used' => ["Cannot exceed current stock of {$material->current_stock} {$material->unit_of_measure}."]
                ]
            ], 422);
        }

        // Fill unit of measure and cost if missing
        if (empty($validated['unit_of_measure'])) {
            $validated['unit_of_measure'] = $material->unit_of_measure;
        }
        if (empty($validated['unit_cost_at_usage'])) {
            $validated['unit_cost_at_usage'] = $material->unit_cost;
        }
        if (empty($validated['total_cost']) && $validated['unit_cost_at_usage']) {
            $validated['total_cost'] = (float) $validated['quantity_used'] * (float) $validated['unit_cost_at_usage'];
        }

        $usage = MaterialUsage::create($validated);
        $usage->load(['material', 'site', 'project', 'task', 'milestone', 'unit', 'loggedByUser']);

        // Log Activity
        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_usage_logged',
            'entity_type' => MaterialUsage::class,
            'entity_id' => $usage->id,
            'description' => "Logged consumption of {$usage->quantity_used} {$usage->unit_of_measure} of {$material->name} (#{$usage->usage_number})",
            'properties' => [
                'usage_number' => $usage->usage_number,
                'material_id' => $material->id,
                'material_name' => $material->name,
                'quantity_used' => $usage->quantity_used,
                'site_id' => $usage->site_id,
                'purpose' => $usage->purpose,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material usage recorded successfully.',
            'data' => new MaterialUsageResource($usage),
        ], 201);
    }

    /**
     * Display the specified material usage.
     */
    public function show(MaterialUsage $materialUsage): JsonResponse
    {
        $this->authorize('view', $materialUsage);

        $materialUsage->load(['material', 'site', 'project', 'task', 'milestone', 'unit', 'loggedByUser']);

        return response()->json([
            'success' => true,
            'data' => new MaterialUsageResource($materialUsage),
        ]);
    }

    /**
     * Remove (soft-delete) the specified material usage and restore stock.
     */
    public function destroy(Request $request, MaterialUsage $materialUsage): JsonResponse
    {
        $this->authorize('delete', $materialUsage);

        // Restore material stock
        if ($materialUsage->material_id) {
            $material = Material::find($materialUsage->material_id);
            if ($material) {
                $material->adjustStock(
                    (float) $materialUsage->quantity_used,
                    "Restored from cancelled usage #{$materialUsage->usage_number}"
                );
            }
        }

        // Log activity
        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_usage_deleted',
            'entity_type' => MaterialUsage::class,
            'entity_id' => $materialUsage->id,
            'description' => "Cancelled material usage #{$materialUsage->usage_number} and restored stock",
            'properties' => [
                'usage_number' => $materialUsage->usage_number,
                'restored_quantity' => $materialUsage->quantity_used,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $materialUsage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Material usage record removed and stock restored successfully.',
        ]);
    }
}
