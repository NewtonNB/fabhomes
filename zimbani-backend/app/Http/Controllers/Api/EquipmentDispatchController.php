<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEquipmentDispatchRequest;
use App\Http\Requests\UpdateEquipmentDispatchRequest;
use App\Http\Resources\EquipmentDispatchResource;
use App\Models\EquipmentDispatch;
use App\Models\Equipment;
use App\Models\Site;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EquipmentDispatchController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of equipment dispatches.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EquipmentDispatch::class);

        $query = EquipmentDispatch::with([
            'equipment',
            'fromSite',
            'toSite',
            'project',
            'operator',
            'dispatchedByUser',
            'receivedByUser',
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
                $query->where(function ($q) use ($siteId) {
                    $q->where('to_site_id', $siteId)
                      ->orWhere('from_site_id', $siteId);
                });
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('dispatch_number', 'like', "%{$search}%")
                  ->orWhere('purpose', 'like', "%{$search}%")
                  ->orWhereHas('equipment', function ($sub) use ($search) {
                      $sub->where('name', 'like', "%{$search}%")
                          ->orWhere('equipment_code', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $dispatches = $query->latest('dispatched_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => EquipmentDispatchResource::collection($dispatches),
            'meta' => [
                'current_page' => $dispatches->currentPage(),
                'last_page' => $dispatches->lastPage(),
                'per_page' => $dispatches->perPage(),
                'total' => $dispatches->total(),
            ],
            'pagination' => [
                'current_page' => $dispatches->currentPage(),
                'last_page' => $dispatches->lastPage(),
                'per_page' => $dispatches->perPage(),
                'total' => $dispatches->total(),
            ],
        ]);
    }

    /**
     * Store a newly created equipment dispatch.
     */
    public function store(StoreEquipmentDispatchRequest $request): JsonResponse
    {
        $this->authorize('create', EquipmentDispatch::class);

        $validated = $request->validated();
        $dispatch = EquipmentDispatch::create($validated);
        $dispatch->load(['equipment', 'fromSite', 'toSite', 'project', 'operator', 'dispatchedByUser']);

        // If created directly in active_on_site state
        if ($dispatch->status === 'active_on_site') {
            $dispatch->markActiveOnSite();
        } else {
            // Update equipment status to dispatched
            if ($dispatch->equipment) {
                $dispatch->equipment->update(['status' => 'dispatched']);
            }
        }

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_dispatched',
            'entity_type' => EquipmentDispatch::class,
            'entity_id' => $dispatch->id,
            'description' => "Dispatched {$dispatch->equipment->name} to {$dispatch->toSite->name} (#{$dispatch->dispatch_number})",
            'properties' => [
                'dispatch_number' => $dispatch->dispatch_number,
                'equipment_id' => $dispatch->equipment_id,
                'to_site_id' => $dispatch->to_site_id,
                'purpose' => $dispatch->purpose,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment dispatched successfully.',
            'data' => new EquipmentDispatchResource($dispatch),
        ], 201);
    }

    /**
     * Display the specified dispatch.
     */
    public function show(EquipmentDispatch $dispatch): JsonResponse
    {
        $this->authorize('view', $dispatch);

        $dispatch->load(['equipment', 'fromSite', 'toSite', 'project', 'operator', 'dispatchedByUser', 'receivedByUser']);

        return response()->json([
            'success' => true,
            'data' => new EquipmentDispatchResource($dispatch),
        ]);
    }

    /**
     * Update dispatch record.
     */
    public function update(UpdateEquipmentDispatchRequest $request, EquipmentDispatch $dispatch): JsonResponse
    {
        $this->authorize('update', $dispatch);

        $validated = $request->validated();
        $dispatch->update($validated);
        $dispatch->load(['equipment', 'fromSite', 'toSite', 'project', 'operator', 'dispatchedByUser', 'receivedByUser']);

        return response()->json([
            'success' => true,
            'message' => 'Dispatch record updated.',
            'data' => new EquipmentDispatchResource($dispatch),
        ]);
    }

    /**
     * Mark dispatch active on site (received and put into work).
     */
    public function activate(Request $request, EquipmentDispatch $dispatch): JsonResponse
    {
        $this->authorize('update', $dispatch);

        $dispatch->markActiveOnSite(auth()->id());
        $dispatch->load(['equipment', 'fromSite', 'toSite', 'project', 'operator', 'dispatchedByUser', 'receivedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_dispatch_activated',
            'entity_type' => EquipmentDispatch::class,
            'entity_id' => $dispatch->id,
            'description' => "Received {$dispatch->equipment->name} at {$dispatch->toSite->name} (#{$dispatch->dispatch_number})",
            'properties' => ['dispatch_number' => $dispatch->dispatch_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment received on site and marked as In Use.',
            'data' => new EquipmentDispatchResource($dispatch),
        ]);
    }

    /**
     * Mark dispatch returned from site.
     */
    public function return(Request $request, EquipmentDispatch $dispatch): JsonResponse
    {
        $this->authorize('update', $dispatch);

        $dispatch->markReturned();
        $dispatch->load(['equipment', 'fromSite', 'toSite', 'project', 'operator', 'dispatchedByUser', 'receivedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'equipment_dispatch_returned',
            'entity_type' => EquipmentDispatch::class,
            'entity_id' => $dispatch->id,
            'description' => "Returned {$dispatch->equipment->name} from site (#{$dispatch->dispatch_number})",
            'properties' => ['dispatch_number' => $dispatch->dispatch_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment marked as returned and is now available.',
            'data' => new EquipmentDispatchResource($dispatch),
        ]);
    }

    /**
     * Delete dispatch record.
     */
    public function destroy(Request $request, EquipmentDispatch $dispatch): JsonResponse
    {
        $this->authorize('delete', $dispatch);

        $dispatch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Dispatch record deleted successfully.',
        ]);
    }
}
