<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSafetyIncidentRequest;
use App\Http\Requests\UpdateSafetyIncidentRequest;
use App\Http\Requests\InvestigateIncidentRequest;
use App\Http\Requests\CloseIncidentRequest;
use App\Http\Resources\SafetyIncidentResource;
use App\Models\SafetyIncident;
use App\Models\Site;
use App\Models\Project;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SafetyIncidentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of site safety incidents & near misses.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SafetyIncident::class);

        $query = SafetyIncident::with(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser']);

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

        // Filter by Incident Type
        if ($request->filled('incident_type')) {
            $query->where('incident_type', $request->incident_type);
        }

        // Filter by Severity
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Open Incidents Only
        if ($request->boolean('open_only')) {
            $query->open();
        }

        // Date Range
        if ($request->filled('from_date')) {
            $query->whereDate('incident_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('incident_date', '<=', $request->to_date);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('incident_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location_details', 'like', "%{$search}%")
                  ->orWhere('injured_person_name', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'incident_date');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['incident_date', 'severity', 'status', 'incident_type', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('incident_date', 'desc')->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $incidents = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => SafetyIncidentResource::collection($incidents),
            'meta' => [
                'current_page' => $incidents->currentPage(),
                'last_page' => $incidents->lastPage(),
                'per_page' => $incidents->perPage(),
                'total' => $incidents->total(),
            ],
            'pagination' => [
                'current_page' => $incidents->currentPage(),
                'last_page' => $incidents->lastPage(),
                'per_page' => $incidents->perPage(),
                'total' => $incidents->total(),
            ],
        ]);
    }

    /**
     * Store a newly created safety incident report.
     */
    public function store(StoreSafetyIncidentRequest $request): JsonResponse
    {
        $this->authorize('create', SafetyIncident::class);

        $validated = $request->validated();
        $incident = SafetyIncident::create($validated);
        $incident->load(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_incident_reported',
            'entity_type' => SafetyIncident::class,
            'entity_id' => $incident->id,
            'description' => "Reported safety incident {$incident->incident_number} - {$incident->title} ({$incident->severity})",
            'properties' => [
                'incident_number' => $incident->incident_number,
                'severity' => $incident->severity,
                'incident_type' => $incident->incident_type,
                'incident_date' => $incident->incident_date?->toDateString(),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Safety incident logged successfully.',
            'data' => new SafetyIncidentResource($incident),
        ], 201);
    }

    /**
     * Display the specified safety incident.
     */
    public function show(string $uuid): JsonResponse
    {
        $incident = SafetyIncident::where('uuid', $uuid)
            ->with(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser', 'documents'])
            ->firstOrFail();

        $this->authorize('view', $incident);

        return response()->json([
            'success' => true,
            'data' => new SafetyIncidentResource($incident),
        ]);
    }

    /**
     * Update the specified safety incident.
     */
    public function update(UpdateSafetyIncidentRequest $request, string $uuid): JsonResponse
    {
        $incident = SafetyIncident::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $incident);

        $incident->update($request->validated());
        $incident->load(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_incident_updated',
            'entity_type' => SafetyIncident::class,
            'entity_id' => $incident->id,
            'description' => "Updated safety incident {$incident->incident_number}",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Safety incident updated successfully.',
            'data' => new SafetyIncidentResource($incident),
        ]);
    }

    /**
     * Remove the specified safety incident.
     */
    public function destroy(string $uuid): JsonResponse
    {
        $incident = SafetyIncident::where('uuid', $uuid)->firstOrFail();
        $this->authorize('delete', $incident);

        $num = $incident->incident_number;
        $incident->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_incident_deleted',
            'entity_type' => SafetyIncident::class,
            'entity_id' => $incident->id,
            'description' => "Deleted safety incident {$num}",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Safety incident {$num} deleted successfully.",
        ]);
    }

    /**
     * Start investigation on a safety incident.
     */
    public function investigate(InvestigateIncidentRequest $request, string $uuid): JsonResponse
    {
        $incident = SafetyIncident::where('uuid', $uuid)->firstOrFail();
        $this->authorize('investigate', $incident);

        $investigatorId = $request->input('investigator_id', auth()->id());
        $incident->startInvestigation($investigatorId);

        if ($request->filled('immediate_actions_taken')) {
            $incident->update(['immediate_actions_taken' => $request->immediate_actions_taken]);
        }

        $incident->load(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_incident_investigating',
            'entity_type' => SafetyIncident::class,
            'entity_id' => $incident->id,
            'description' => "Started investigation for safety incident {$incident->incident_number}",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Investigation initiated for incident {$incident->incident_number}.",
            'data' => new SafetyIncidentResource($incident),
        ]);
    }

    /**
     * Close a safety incident with corrective and preventative actions.
     */
    public function close(CloseIncidentRequest $request, string $uuid): JsonResponse
    {
        $incident = SafetyIncident::where('uuid', $uuid)->firstOrFail();
        $this->authorize('close', $incident);

        $incident->closeIncident(
            auth()->id(),
            $request->root_cause_analysis,
            $request->preventative_measures
        );

        $incident->load(['site', 'project', 'siteDailyLog', 'reportedByUser', 'investigatedByUser', 'closedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_incident_closed',
            'entity_type' => SafetyIncident::class,
            'entity_id' => $incident->id,
            'description' => "Closed safety incident {$incident->incident_number} with verified preventative measures",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Safety incident {$incident->incident_number} closed successfully.",
            'data' => new SafetyIncidentResource($incident),
        ]);
    }

    /**
     * Safety Incident statistical analysis.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SafetyIncident::class);

        $siteId = $request->site_id;
        if ($siteId && !is_numeric($siteId)) {
            $site = Site::where('uuid', $siteId)->first();
            $siteId = $site ? $site->id : null;
        }

        $query = SafetyIncident::query();
        if ($siteId) {
            $query->where('site_id', $siteId);
        }

        $total = (clone $query)->count();
        $open = (clone $query)->open()->count();
        $closed = (clone $query)->where('status', 'closed')->count();
        $critical = (clone $query)->where('severity', 'critical')->count();
        $lostTimeInjuries = (clone $query)->where('incident_type', 'lost_time_injury')->count();
        $nearMisses = (clone $query)->where('incident_type', 'near_miss')->count();

        // Breakdown by type
        $byType = (clone $query)
            ->selectRaw('incident_type, count(*) as count')
            ->groupBy('incident_type')
            ->pluck('count', 'incident_type');

        // Breakdown by severity
        $bySeverity = (clone $query)
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'open' => $open,
                'closed' => $closed,
                'critical' => $critical,
                'lost_time_injuries' => $lostTimeInjuries,
                'near_misses' => $nearMisses,
                'by_type' => $byType,
                'by_severity' => $bySeverity,
            ],
        ]);
    }
}
