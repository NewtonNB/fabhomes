<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUtilizationLogRequest;
use App\Http\Resources\EquipmentUtilizationLogResource;
use App\Models\EquipmentUtilizationLog;
use App\Models\Equipment;
use App\Models\Site;
use App\Models\Project;
use App\Models\Task;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EquipmentUtilizationController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of equipment utilization logs.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EquipmentUtilizationLog::class);

        $query = EquipmentUtilizationLog::with([
            'equipment',
            'site',
            'project',
            'task',
            'operator',
            'loggedByUser',
        ]);

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

        if ($request->filled('project_id')) {
            $projId = $request->project_id;
            if (!is_numeric($projId)) {
                $p = Project::where('uuid', $projId)->first();
                $projId = $p ? $p->id : null;
            }
            if ($projId) {
                $query->where('project_id', $projId);
            }
        }

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

        if ($request->filled('from_date')) {
            $query->whereDate('date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('date', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('log_number', 'like', "%{$search}%")
                  ->orWhere('purpose', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('equipment', function ($sub) use ($search) {
                      $sub->where('name', 'like', "%{$search}%")
                          ->orWhere('equipment_code', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $logs = $query->latest('date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => EquipmentUtilizationLogResource::collection($logs),
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
     * Store a newly created utilization record.
     */
    public function store(StoreUtilizationLogRequest $request): JsonResponse
    {
        $this->authorize('create', EquipmentUtilizationLog::class);

        $validated = $request->validated();
        $log = EquipmentUtilizationLog::create($validated);
        $log->load(['equipment', 'site', 'project', 'task', 'operator', 'loggedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_utilization_logged',
            'entity_type' => EquipmentUtilizationLog::class,
            'entity_id' => $log->id,
            'description' => "Logged {$log->hours_operated} hours on {$log->equipment->name} (#{$log->log_number})",
            'properties' => [
                'log_number' => $log->log_number,
                'equipment_id' => $log->equipment_id,
                'hours_operated' => $log->hours_operated,
                'site_id' => $log->site_id,
                'purpose' => $log->purpose,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment utilization logged successfully.',
            'data' => new EquipmentUtilizationLogResource($log),
        ], 201);
    }

    /**
     * Display the specified utilization record.
     */
    public function show(EquipmentUtilizationLog $utilization): JsonResponse
    {
        $this->authorize('view', $utilization);

        $utilization->load(['equipment', 'site', 'project', 'task', 'operator', 'loggedByUser']);

        return response()->json([
            'success' => true,
            'data' => new EquipmentUtilizationLogResource($utilization),
        ]);
    }

    /**
     * Delete utilization record and restore accumulated hours.
     */
    public function destroy(Request $request, EquipmentUtilizationLog $utilization): JsonResponse
    {
        $this->authorize('delete', $utilization);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_utilization_deleted',
            'entity_type' => EquipmentUtilizationLog::class,
            'entity_id' => $utilization->id,
            'description' => "Cancelled utilization log #{$utilization->log_number} and deducted hours",
            'properties' => [
                'log_number' => $utilization->log_number,
                'hours_deducted' => $utilization->hours_operated,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $utilization->delete();

        return response()->json([
            'success' => true,
            'message' => 'Utilization record deleted successfully.',
        ]);
    }
}
