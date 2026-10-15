<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteDailyLogRequest;
use App\Http\Requests\UpdateSiteDailyLogRequest;
use App\Http\Requests\ApproveDailyLogRequest;
use App\Http\Resources\SiteDailyLogResource;
use App\Models\SiteDailyLog;
use App\Models\Site;
use App\Models\Project;
use App\Models\SafetyIncident;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SiteDailyLogController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of site daily supervisor logs.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SiteDailyLog::class);

        $query = SiteDailyLog::with(['site', 'project', 'supervisor', 'approvedByUser'])
            ->withCount(['safetyIncidents', 'toolboxTalks']);

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

        // Filter by Weather
        if ($request->filled('weather_condition')) {
            $query->where('weather_condition', $request->weather_condition);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter Weather Delayed Only
        if ($request->boolean('delayed_only')) {
            $query->where('work_delayed_by_weather', true);
        }

        // Date Range
        if ($request->filled('from_date')) {
            $query->whereDate('log_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('log_date', '<=', $request->to_date);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('log_number', 'like', "%{$search}%")
                  ->orWhere('work_performed_summary', 'like', "%{$search}%")
                  ->orWhere('delays_or_impediments', 'like', "%{$search}%")
                  ->orWhere('materials_received_notes', 'like', "%{$search}%")
                  ->orWhere('equipment_on_site_notes', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'log_date');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['log_date', 'labor_headcount', 'delay_hours', 'status', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('log_date', 'desc')->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => SiteDailyLogResource::collection($logs),
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
     * Store a newly created site daily supervisor log.
     */
    public function store(StoreSiteDailyLogRequest $request): JsonResponse
    {
        $this->authorize('create', SiteDailyLog::class);

        $validated = $request->validated();
        $log = SiteDailyLog::create($validated);
        $log->load(['site', 'project', 'supervisor', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_daily_log_created',
            'entity_type' => SiteDailyLog::class,
            'entity_id' => $log->id,
            'description' => "Created daily site log {$log->log_number} for {$log->log_date?->toDateString()}",
            'properties' => [
                'log_number' => $log->log_number,
                'log_date' => $log->log_date?->toDateString(),
                'weather_condition' => $log->weather_condition,
                'labor_headcount' => $log->labor_headcount,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Site daily log created successfully.',
            'data' => new SiteDailyLogResource($log),
        ], 201);
    }

    /**
     * Display the specified site daily supervisor log.
     */
    public function show(string $uuid): JsonResponse
    {
        $log = SiteDailyLog::where('uuid', $uuid)
            ->with(['site', 'project', 'supervisor', 'approvedByUser', 'safetyIncidents', 'toolboxTalks', 'documents'])
            ->firstOrFail();

        $this->authorize('view', $log);

        return response()->json([
            'success' => true,
            'data' => new SiteDailyLogResource($log),
        ]);
    }

    /**
     * Update the specified site daily supervisor log.
     */
    public function update(UpdateSiteDailyLogRequest $request, string $uuid): JsonResponse
    {
        $log = SiteDailyLog::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $log);

        $log->update($request->validated());
        $log->load(['site', 'project', 'supervisor', 'approvedByUser', 'safetyIncidents', 'toolboxTalks']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_daily_log_updated',
            'entity_type' => SiteDailyLog::class,
            'entity_id' => $log->id,
            'description' => "Updated site daily log {$log->log_number}",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Site daily log updated successfully.',
            'data' => new SiteDailyLogResource($log),
        ]);
    }

    /**
     * Remove the specified site daily supervisor log.
     */
    public function destroy(string $uuid): JsonResponse
    {
        $log = SiteDailyLog::where('uuid', $uuid)->firstOrFail();
        $this->authorize('delete', $log);

        $logNumber = $log->log_number;
        $log->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_daily_log_deleted',
            'entity_type' => SiteDailyLog::class,
            'entity_id' => $log->id,
            'description' => "Deleted site daily log {$logNumber}",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Site daily log {$logNumber} deleted successfully.",
        ]);
    }

    /**
     * Submit site daily log for approval.
     */
    public function submit(string $uuid): JsonResponse
    {
        $log = SiteDailyLog::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $log);

        $log->submit();
        $log->load(['site', 'project', 'supervisor', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_daily_log_submitted',
            'entity_type' => SiteDailyLog::class,
            'entity_id' => $log->id,
            'description' => "Submitted site daily log {$log->log_number} for approval",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Site daily log {$log->log_number} submitted for approval.",
            'data' => new SiteDailyLogResource($log),
        ]);
    }

    /**
     * Approve submitted site daily log.
     */
    public function approve(ApproveDailyLogRequest $request, string $uuid): JsonResponse
    {
        $log = SiteDailyLog::where('uuid', $uuid)->firstOrFail();
        $this->authorize('approve', $log);

        $log->approve(auth()->id(), $request->notes);
        $log->load(['site', 'project', 'supervisor', 'approvedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'site_daily_log_approved',
            'entity_type' => SiteDailyLog::class,
            'entity_id' => $log->id,
            'description' => "Approved site daily log {$log->log_number}",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Site daily log {$log->log_number} approved successfully.",
            'data' => new SiteDailyLogResource($log),
        ]);
    }

    /**
     * Aggregate statistics for site daily logs.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SiteDailyLog::class);

        $siteId = $request->site_id;
        if ($siteId && !is_numeric($siteId)) {
            $site = Site::where('uuid', $siteId)->first();
            $siteId = $site ? $site->id : null;
        }

        $query = SiteDailyLog::query();
        if ($siteId) {
            $query->where('site_id', $siteId);
        }

        $totalLogs = (clone $query)->count();
        $approvedLogs = (clone $query)->where('status', 'approved')->count();
        $submittedLogs = (clone $query)->where('status', 'submitted')->count();
        $draftLogs = (clone $query)->where('status', 'draft')->count();
        $weatherDelayedDays = (clone $query)->where('work_delayed_by_weather', true)->count();
        $totalDelayHours = (clone $query)->sum('delay_hours') ?? 0;
        $avgHeadcount = (clone $query)->selectRaw('AVG(labor_headcount + subcontractor_headcount) as avg_hc')->value('avg_hc') ?? 0;

        // Incident statistics
        $incidentQuery = SafetyIncident::query();
        if ($siteId) {
            $incidentQuery->where('site_id', $siteId);
        }
        $totalIncidents = (clone $incidentQuery)->count();
        $openIncidents = (clone $incidentQuery)->open()->count();
        $lostTimeInjuries = (clone $incidentQuery)->where('incident_type', 'lost_time_injury')->count();

        // Calculate Days Without Lost Time Injury
        $lastLostTimeDate = (clone $incidentQuery)
            ->where('incident_type', 'lost_time_injury')
            ->orderBy('incident_date', 'desc')
            ->value('incident_date');

        $daysWithoutLostTime = $lastLostTimeDate
            ? now()->diffInDays(\Carbon\Carbon::parse($lastLostTimeDate))
            : (clone $query)->count(); // If no incidents, days active or defaults

        return response()->json([
            'success' => true,
            'data' => [
                'total_logs' => $totalLogs,
                'approved_logs' => $approvedLogs,
                'submitted_logs' => $submittedLogs,
                'draft_logs' => $draftLogs,
                'weather_delayed_days' => $weatherDelayedDays,
                'total_delay_hours' => round((float) $totalDelayHours, 1),
                'average_daily_headcount' => round((float) $avgHeadcount, 0),
                'total_incidents' => $totalIncidents,
                'open_incidents' => $openIncidents,
                'lost_time_injuries' => $lostTimeInjuries,
                'days_without_lost_time' => (int) $daysWithoutLostTime,
            ],
        ]);
    }
}
