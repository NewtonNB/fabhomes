<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEquipmentRequest;
use App\Http\Requests\UpdateEquipmentRequest;
use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use App\Models\Site;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EquipmentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of equipment and machinery.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Equipment::class);

        $query = Equipment::with(['currentSite', 'assignedOperator', 'createdByUser']);

        // Filter by Site
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (!is_numeric($siteId)) {
                $site = Site::where('uuid', $siteId)->first();
                $siteId = $site ? $site->id : null;
            }
            if ($siteId) {
                $query->where('current_site_id', $siteId);
            }
        }

        // Filter by Type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Condition
        if ($request->filled('condition')) {
            $query->where('condition', $request->condition);
        }

        // Filter needs service
        if ($request->boolean('needs_service')) {
            $query->where(function ($q) {
                $q->where('condition', 'needs_repair')
                  ->orWhere(function ($sub) {
                      $sub->whereNotNull('next_service_due_date')
                          ->where('next_service_due_date', '<=', now()->addDays(7));
                  });
            });
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('model_number', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('registration_number', 'like', "%{$search}%")
                  ->orWhere('supplier_or_vendor', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['name', 'equipment_code', 'type', 'status', 'total_hours_operated', 'next_service_due_date', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $equipment = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => EquipmentResource::collection($equipment),
            'meta' => [
                'current_page' => $equipment->currentPage(),
                'last_page' => $equipment->lastPage(),
                'per_page' => $equipment->perPage(),
                'total' => $equipment->total(),
            ],
            'pagination' => [
                'current_page' => $equipment->currentPage(),
                'last_page' => $equipment->lastPage(),
                'per_page' => $equipment->perPage(),
                'total' => $equipment->total(),
            ],
        ]);
    }

    /**
     * Store a newly created equipment record.
     */
    public function store(StoreEquipmentRequest $request): JsonResponse
    {
        $this->authorize('create', Equipment::class);

        $validated = $request->validated();
        $equipment = Equipment::create($validated);
        $equipment->load(['currentSite', 'assignedOperator', 'createdByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_created',
            'entity_type' => Equipment::class,
            'entity_id' => $equipment->id,
            'description' => "Registered equipment {$equipment->equipment_code} - {$equipment->name}",
            'properties' => [
                'equipment_code' => $equipment->equipment_code,
                'name' => $equipment->name,
                'type' => $equipment->type,
                'current_site_id' => $equipment->current_site_id,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment registered successfully.',
            'data' => new EquipmentResource($equipment),
        ], 201);
    }

    /**
     * Display the specified equipment.
     */
    public function show(Equipment $equipment): JsonResponse
    {
        $this->authorize('view', $equipment);

        $equipment->load([
            'currentSite',
            'assignedOperator',
            'createdByUser',
            'documents',
            'dispatches' => function ($q) {
                $q->latest()->take(5);
            },
            'maintenanceLogs' => function ($q) {
                $q->latest()->take(5);
            },
            'utilizationLogs' => function ($q) {
                $q->latest()->take(5);
            },
        ]);

        return response()->json([
            'success' => true,
            'data' => new EquipmentResource($equipment),
        ]);
    }

    /**
     * Update the specified equipment.
     */
    public function update(UpdateEquipmentRequest $request, Equipment $equipment): JsonResponse
    {
        $this->authorize('update', $equipment);

        $validated = $request->validated();
        $equipment->update($validated);
        $equipment->load(['currentSite', 'assignedOperator', 'createdByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_updated',
            'entity_type' => Equipment::class,
            'entity_id' => $equipment->id,
            'description' => "Updated equipment {$equipment->equipment_code} - {$equipment->name}",
            'properties' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment updated successfully.',
            'data' => new EquipmentResource($equipment),
        ]);
    }

    /**
     * Remove (soft-delete) the specified equipment.
     */
    public function destroy(Request $request, Equipment $equipment): JsonResponse
    {
        $this->authorize('delete', $equipment);

        if (in_array($equipment->status, ['in_use', 'dispatched'])) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete equipment that is currently {$equipment->status}. Please return equipment to depot first.",
            ], 422);
        }

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_deleted',
            'entity_type' => Equipment::class,
            'entity_id' => $equipment->id,
            'description' => "Decommissioned/deleted equipment {$equipment->equipment_code} - {$equipment->name}",
            'properties' => [
                'equipment_code' => $equipment->equipment_code,
                'name' => $equipment->name,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $equipment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Equipment deleted successfully.',
        ]);
    }

    /**
     * Aggregate equipment fleet statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Equipment::class);

        $query = Equipment::query();

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (!is_numeric($siteId)) {
                $site = Site::where('uuid', $siteId)->first();
                $siteId = $site ? $site->id : null;
            }
            if ($siteId) {
                $query->where('current_site_id', $siteId);
            }
        }

        $totalEquipment = (clone $query)->count();
        $available = (clone $query)->where('status', 'available')->count();
        $inUse = (clone $query)->where('status', 'in_use')->count();
        $underMaintenance = (clone $query)->where('status', 'under_maintenance')->count();
        $needsService = (clone $query)->where(function ($q) {
            $q->where('condition', 'needs_repair')
              ->orWhere(function ($sub) {
                  $sub->whereNotNull('next_service_due_date')
                      ->where('next_service_due_date', '<=', now()->addDays(7));
              });
        })->count();

        $totalHoursOperated = (float) (clone $query)->sum('total_hours_operated');

        $byType = (clone $query)
            ->selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->get()
            ->map(function ($item) {
                return [
                    'type' => $item->type,
                    'count' => (int) $item->count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'total_equipment' => $totalEquipment,
                'available' => $available,
                'in_use' => $inUse,
                'under_maintenance' => $underMaintenance,
                'needs_service' => $needsService,
                'total_hours_operated' => $totalHoursOperated,
                'by_type' => $byType,
            ],
        ]);
    }
}
