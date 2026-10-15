<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaterialRequest;
use App\Http\Requests\UpdateMaterialRequest;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Resources\MaterialResource;
use App\Models\Material;
use App\Models\Site;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MaterialController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of materials and inventory
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Material::class);

        $query = Material::with(['site', 'createdByUser'])->withCount('usages');

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

        // Filter by Category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Low stock filter
        if ($request->boolean('low_stock_only')) {
            $query->where(function ($q) {
                $q->where('status', 'low_stock')
                  ->orWhere('status', 'out_of_stock')
                  ->orWhereRaw('current_stock <= minimum_stock_level AND minimum_stock_level > 0');
            });
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('material_code', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('storage_location', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $allowedSorts = ['name', 'material_code', 'current_stock', 'unit_cost', 'created_at', 'category'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->get('per_page', 15);
        $materials = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => MaterialResource::collection($materials),
            'meta' => [
                'current_page' => $materials->currentPage(),
                'last_page' => $materials->lastPage(),
                'per_page' => $materials->perPage(),
                'total' => $materials->total(),
            ],
            'pagination' => [
                'current_page' => $materials->currentPage(),
                'last_page' => $materials->lastPage(),
                'per_page' => $materials->perPage(),
                'total' => $materials->total(),
            ],
        ]);
    }

    /**
     * Store a newly created material
     */
    public function store(StoreMaterialRequest $request): JsonResponse
    {
        $this->authorize('create', Material::class);

        $data = $request->validated();
        $material = Material::create($data);
        $material->load(['site', 'createdByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_created',
            'entity_type' => Material::class,
            'entity_id' => $material->id,
            'description' => "Created material #{$material->material_code}: {$material->name}",
            'properties' => ['material_code' => $material->material_code, 'unit_cost' => $material->unit_cost],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material registered successfully',
            'data' => new MaterialResource($material),
        ], 201);
    }

    /**
     * Display the specified material
     */
    public function show(Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        $material->load(['site', 'createdByUser', 'documents'])->loadCount('usages');

        return response()->json([
            'success' => true,
            'data' => new MaterialResource($material),
        ]);
    }

    /**
     * Update the specified material
     */
    public function update(UpdateMaterialRequest $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material);

        $data = $request->validated();
        $material->update($data);
        $material->load(['site', 'createdByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_updated',
            'entity_type' => Material::class,
            'entity_id' => $material->id,
            'description' => "Updated material {$material->material_code}: {$material->name}",
            'properties' => ['changes' => $material->getChanges()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material updated successfully',
            'data' => new MaterialResource($material),
        ]);
    }

    /**
     * Remove the specified material
     */
    public function destroy(Request $request, Material $material): JsonResponse
    {
        $this->authorize('delete', $material);

        $code = $material->material_code;
        $name = $material->name;
        $material->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_deleted',
            'entity_type' => Material::class,
            'entity_id' => $material->id,
            'description' => "Deleted material {$code} ({$name})",
            'properties' => ['material_code' => $code],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material deleted successfully',
        ]);
    }

    /**
     * Manual inventory stock level adjustment
     */
    public function adjustStock(AdjustStockRequest $request, Material $material): JsonResponse
    {
        $this->authorize('adjustStock', $material);

        $delta = (float) $request->delta;
        $reason = $request->reason;
        $oldStock = (float) $material->current_stock;

        $material->adjustStock($delta, $reason);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'material_stock_adjusted',
            'entity_type' => Material::class,
            'entity_id' => $material->id,
            'description' => "Adjusted stock for {$material->name} by {$delta} {$material->unit_of_measure} ({$reason})",
            'properties' => [
                'old_stock' => $oldStock,
                'new_stock' => (float) $material->current_stock,
                'delta' => $delta,
                'reason' => $reason,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Stock adjusted to {$material->current_stock} {$material->unit_of_measure}",
            'data' => new MaterialResource($material),
        ]);
    }

    /**
     * Aggregate inventory statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Material::class);

        $query = Material::query();

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (!is_numeric($siteId)) {
                $s = Site::where('uuid', $siteId)->first();
                $siteId = $s ? $s->id : null;
            }
            if ($siteId) {
                $query->where('site_id', $siteId);
            }
        }

        $totalItems = (clone $query)->count();
        $inStock = (clone $query)->where('status', 'in_stock')->count();
        $lowStock = (clone $query)->where(function ($q) {
            $q->where('status', 'low_stock')
              ->orWhereRaw('current_stock <= minimum_stock_level AND minimum_stock_level > 0 AND current_stock > 0');
        })->count();
        $outOfStock = (clone $query)->where('status', 'out_of_stock')->orWhere('current_stock', '<=', 0)->count();

        // Total inventory valuation
        $totalValuation = (clone $query)->select(DB::raw('SUM(current_stock * unit_cost) as valuation'))->value('valuation') ?? 0;

        return response()->json([
            'success' => true,
            'data' => [
                'total_items' => $totalItems,
                'in_stock' => $inStock,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'total_valuation' => (float) $totalValuation,
                'currency' => 'UGX',
            ]
        ]);
    }
}
