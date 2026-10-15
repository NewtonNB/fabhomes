<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceLogRequest;
use App\Http\Requests\UpdateMaintenanceLogRequest;
use App\Http\Resources\EquipmentMaintenanceLogResource;
use App\Models\EquipmentMaintenanceLog;
use App\Models\Equipment;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EquipmentMaintenanceController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of equipment maintenance logs.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EquipmentMaintenanceLog::class);

        $query = EquipmentMaintenanceLog::with(['equipment', 'performedByUser', 'documents']);

        if ($request->filled('equipment_id')) {
            $eqId = $request->equipment_id;
            if (!is_numeric($eqId)) {
                $eq = Equipment::where('uuid', $eqId)->first();
                $eqId = $eq ? $eq->id : null;
            }
            if ($eqId) {
                $query->where('equipment_id', $eqId);
            }
        }

        if ($request->filled('maintenance_type')) {
            $query->where('maintenance_type', $request->maintenance_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('maintenance_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('service_provider', 'like', "%{$search}%")
                  ->orWhereHas('equipment', function ($sub) use ($search) {
                      $sub->where('name', 'like', "%{$search}%")
                          ->orWhere('equipment_code', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $logs = $query->latest('scheduled_date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => EquipmentMaintenanceLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Store a newly created maintenance record.
     */
    public function store(StoreMaintenanceLogRequest $request): JsonResponse
    {
        $this->authorize('create', EquipmentMaintenanceLog::class);

        $validated = $request->validated();
        $log = EquipmentMaintenanceLog::create($validated);
        $log->load(['equipment', 'performedByUser']);

        if ($log->status === 'in_progress') {
            $log->startMaintenance();
        } elseif ($log->status === 'completed') {
            $log->completeMaintenance($validated['next_service_due_date'] ?? null, $validated['hours_at_maintenance'] ?? null);
        }

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_maintenance_scheduled',
            'entity_type' => EquipmentMaintenanceLog::class,
            'entity_id' => $log->id,
            'description' => "Scheduled {$log->maintenance_type} for {$log->equipment->name} (#{$log->maintenance_number})",
            'properties' => [
                'maintenance_number' => $log->maintenance_number,
                'equipment_id' => $log->equipment_id,
                'scheduled_date' => $log->scheduled_date,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record created successfully.',
            'data' => new EquipmentMaintenanceLogResource($log),
        ], 201);
    }

    /**
     * Display the specified maintenance record.
     */
    public function show(EquipmentMaintenanceLog $maintenance): JsonResponse
    {
        $this->authorize('view', $maintenance);

        $maintenance->load(['equipment', 'performedByUser', 'documents']);

        return response()->json([
            'success' => true,
            'data' => new EquipmentMaintenanceLogResource($maintenance),
        ]);
    }

    /**
     * Update maintenance record.
     */
    public function update(UpdateMaintenanceLogRequest $request, EquipmentMaintenanceLog $maintenance): JsonResponse
    {
        $this->authorize('update', $maintenance);

        $validated = $request->validated();
        $maintenance->update($validated);
        $maintenance->load(['equipment', 'performedByUser']);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record updated successfully.',
            'data' => new EquipmentMaintenanceLogResource($maintenance),
        ]);
    }

    /**
     * Mark maintenance as started / in progress.
     */
    public function start(Request $request, EquipmentMaintenanceLog $maintenance): JsonResponse
    {
        $this->authorize('update', $maintenance);

        $maintenance->startMaintenance();
        $maintenance->load(['equipment', 'performedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_maintenance_started',
            'entity_type' => EquipmentMaintenanceLog::class,
            'entity_id' => $maintenance->id,
            'description' => "Started maintenance on {$maintenance->equipment->name} (#{$maintenance->maintenance_number})",
            'properties' => ['maintenance_number' => $maintenance->maintenance_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance started. Equipment is now marked Under Maintenance.',
            'data' => new EquipmentMaintenanceLogResource($maintenance),
        ]);
    }

    /**
     * Complete maintenance work.
     */
    public function complete(Request $request, EquipmentMaintenanceLog $maintenance): JsonResponse
    {
        $this->authorize('update', $maintenance);

        $validated = $request->validate([
            'hours_at_maintenance' => 'nullable|numeric|min:0',
            'next_service_due_date' => 'nullable|date',
            'parts_replaced' => 'nullable|string|max:2000',
            'cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:5000',
        ]);

        if (isset($validated['parts_replaced'])) {
            $maintenance->parts_replaced = $validated['parts_replaced'];
        }
        if (isset($validated['cost'])) {
            $maintenance->cost = $validated['cost'];
        }
        if (isset($validated['notes'])) {
            $maintenance->notes = $validated['notes'];
        }
        $maintenance->save();

        $maintenance->completeMaintenance(
            $validated['next_service_due_date'] ?? null,
            $validated['hours_at_maintenance'] ?? null
        );

        $maintenance->load(['equipment', 'performedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_maintenance_completed',
            'entity_type' => EquipmentMaintenanceLog::class,
            'entity_id' => $maintenance->id,
            'description' => "Completed maintenance on {$maintenance->equipment->name} (#{$maintenance->maintenance_number})",
            'properties' => [
                'maintenance_number' => $maintenance->maintenance_number,
                'cost' => $maintenance->cost,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance completed. Equipment is now available and in good condition.',
            'data' => new EquipmentMaintenanceLogResource($maintenance),
        ]);
    }

    /**
     * Delete maintenance record.
     */
    public function destroy(Request $request, EquipmentMaintenanceLog $maintenance): JsonResponse
    {
        $this->authorize('delete', $maintenance);

        $maintenance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record deleted successfully.',
        ]);
    }
}
