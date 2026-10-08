<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteRequest;
use App\Http\Requests\UpdateSiteRequest;
use App\Http\Resources\SiteResource;
use App\Models\Site;
use App\Models\User;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    use AuthorizesRequests, LogsActivity;

    /**
     * Display a listing of sites.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Site::class);

        $query = Site::query();

        // Apply filters based on user role
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                // Company Admin sees only sites in their company's projects
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('company_id', $user->company_id);
                });
            } elseif ($user->hasRole('Site Manager')) {
                // Site Manager sees sites in assigned projects
                $query->whereHas('project.users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($user->hasRole('Supervisor')) {
                // Supervisor sees sites they supervise or are assigned to
                $query->where(function ($q) use ($user) {
                    $q->where('supervisor_id', $user->id)
                        ->orWhereHas('workers', function ($wq) use ($user) {
                            $wq->where('user_id', $user->id);
                        });
                });
            }
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by site type
        if ($request->has('site_type')) {
            $query->where('site_type', $request->site_type);
        }

        // Filter by supervisor
        if ($request->has('supervisor_id')) {
            $query->where('supervisor_id', $request->supervisor_id);
        }

        // Filter by active sites
        if ($request->boolean('active_only')) {
            $query->active();
        }

        // Filter by overdue sites
        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        // Filter by sites needing inspection
        if ($request->boolean('needs_inspection')) {
            $query->whereNotNull('next_inspection_date')
                ->where('next_inspection_date', '<', now());
        }

        // Search by name or code
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%')
                    ->orWhere('address', 'like', '%' . $search . '%')
                    ->orWhere('city', 'like', '%' . $search . '%');
            });
        }

        // Include relationships
        $with = [];
        if ($request->boolean('with_project')) {
            $with[] = 'project';
        }
        if ($request->boolean('with_supervisor')) {
            $with[] = 'supervisor';
        }
        if ($request->boolean('with_workers')) {
            $with[] = 'workers';
        }
        if ($request->boolean('with_workers_count')) {
            $query->withCount('workers');
        }

        if (!empty($with)) {
            $query->with($with);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $sites = $query->paginate($perPage);

        return SiteResource::collection($sites);
    }

    /**
     * Store a newly created site.
     *
     * @param  \App\Http\Requests\StoreSiteRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreSiteRequest $request)
    {
        $this->authorize('create', Site::class);

        $site = Site::create($request->validated());

        $this->logCreated($site);

        return new SiteResource($site->load('project', 'supervisor'));
    }

    /**
     * Display the specified site.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request, Site $site)
    {
        $this->authorize('view', $site);

        $with = ['project', 'supervisor'];
        
        if ($request->boolean('with_workers')) {
            $with[] = 'workers';
        }

        $site->load($with);

        return new SiteResource($site);
    }

    /**
     * Update the specified site.
     *
     * @param  \App\Http\Requests\UpdateSiteRequest  $request
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateSiteRequest $request, Site $site)
    {
        $this->authorize('update', $site);

        $site->update($request->validated());

        $this->logUpdated($site);

        return new SiteResource($site->load('project', 'supervisor'));
    }

    /**
     * Remove the specified site (soft delete).
     *
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function destroy(Site $site)
    {
        $this->authorize('delete', $site);

        // Check if site has active workers
        if ($site->workers()->wherePivot('status', 'active')->exists()) {
            return response()->json([
                'message' => 'Cannot delete site with active workers. Please reassign or deactivate workers first.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Future: Check if site has equipment (when Equipment model exists)
        // if ($site->equipment()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete site with equipment. Please relocate or remove equipment first.',
        //     ], Response::HTTP_UNPROCESSABLE_ENTITY);
        // }

        // Future: Check if site has units (when Unit model exists)
        // if ($site->units()->exists()) {
        //     return response()->json([
        //         'message' => 'Cannot delete site with units. Units must be managed separately.',
        //     ], Response::HTTP_UNPROCESSABLE_ENTITY);
        // }

        $site->delete();

        $this->logDeleted($site);

        return response()->json([
            'message' => 'Site deleted successfully.',
        ]);
    }

    /**
     * Restore a soft-deleted site.
     *
     * @param  string  $uuid
     * @return \Illuminate\Http\Response
     */
    public function restore($uuid)
    {
        $site = Site::withTrashed()->where('uuid', $uuid)->firstOrFail();

        $this->authorize('restore', $site);

        $site->restore();

        $this->logRestored($site);

        return new SiteResource($site->load('project', 'supervisor'));
    }

    /**
     * Get site statistics.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function statistics(Request $request)
    {
        $this->authorize('viewAny', Site::class);

        $query = Site::query();

        // Apply role-based filters
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('company_id', $user->company_id);
                });
            } elseif ($user->hasRole('Site Manager')) {
                $query->whereHas('project.users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($user->hasRole('Supervisor')) {
                $query->where(function ($q) use ($user) {
                    $q->where('supervisor_id', $user->id)
                        ->orWhereHas('workers', function ($wq) use ($user) {
                            $wq->where('user_id', $user->id);
                        });
                });
            }
        }

        // Filter by project if specified
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        $statistics = [
            'total_sites' => $query->count(),
            'active_sites' => (clone $query)->where('status', 'active')->count(),
            'planned_sites' => (clone $query)->where('status', 'planned')->count(),
            'completed_sites' => (clone $query)->where('status', 'completed')->count(),
            'suspended_sites' => (clone $query)->where('status', 'suspended')->count(),
            'overdue_sites' => (clone $query)->overdue()->count(),
            'sites_needing_inspection' => (clone $query)
                ->whereNotNull('next_inspection_date')
                ->where('next_inspection_date', '<', now())
                ->count(),
            'by_type' => (clone $query)
                ->select('site_type', DB::raw('count(*) as count'))
                ->groupBy('site_type')
                ->pluck('count', 'site_type'),
            'by_status' => (clone $query)
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status'),
            'total_workers' => (clone $query)->sum('total_workers'),
            'total_equipment' => (clone $query)->sum('total_equipment'),
            'total_units' => (clone $query)->sum('total_units'),
            'financial' => [
                'total_allocated_budget' => (clone $query)->sum('allocated_budget'),
                'total_spent' => (clone $query)->sum('actual_spent'),
                'budget_utilization' => $this->calculateBudgetUtilization($query),
            ],
        ];

        return response()->json($statistics);
    }

    /**
     * Get workers assigned to a site.
     *
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function workers(Site $site)
    {
        $this->authorize('view', $site);

        $workers = $site->workers()
            ->withPivot(['role', 'assigned_date', 'status'])
            ->get();

        return response()->json([
            'data' => $workers,
            'total' => $workers->count(),
        ]);
    }

    /**
     * Assign workers to a site.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function assignWorkers(Request $request, Site $site)
    {
        $this->authorize('assignWorkers', $site);

        $validated = $request->validate([
            'workers' => 'required|array|min:1',
            'workers.*.user_id' => 'required|exists:users,id',
            'workers.*.role' => 'required|string|max:100',
            'workers.*.status' => 'nullable|in:active,inactive,on_leave',
        ]);

        $assignedWorkers = [];

        foreach ($validated['workers'] as $worker) {
            // Check if user is already assigned
            if ($site->workers()->where('user_id', $worker['user_id'])->exists()) {
                continue;
            }

            $site->workers()->attach($worker['user_id'], [
                'role' => $worker['role'],
                'assigned_date' => now(),
                'status' => $worker['status'] ?? 'active',
            ]);

            $assignedWorkers[] = $worker['user_id'];
        }

        // Update worker count
        $site->update([
            'total_workers' => $site->workers()->count(),
        ]);

        $this->logActivity(
            'assigned_workers',
            "Assigned workers to Site: {$site->name}",
            $site,
            ['workers' => $assignedWorkers]
        );

        return response()->json([
            'message' => 'Workers assigned successfully.',
            'assigned_count' => count($assignedWorkers),
        ]);
    }

    /**
     * Remove workers from a site.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function removeWorkers(Request $request, Site $site)
    {
        $this->authorize('assignWorkers', $site);

        $validated = $request->validate([
            'worker_ids' => 'required|array|min:1',
            'worker_ids.*' => 'required|exists:users,id',
        ]);

        $site->workers()->detach($validated['worker_ids']);

        // Update worker count
        $site->update([
            'total_workers' => $site->workers()->count(),
        ]);

        $this->logActivity(
            'removed_workers',
            "Removed workers from Site: {$site->name}",
            $site,
            ['workers' => $validated['worker_ids']]
        );

        return response()->json([
            'message' => 'Workers removed successfully.',
        ]);
    }

    /**
     * Update site inspection dates.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Site  $site
     * @return \Illuminate\Http\Response
     */
    public function updateInspection(Request $request, Site $site)
    {
        $this->authorize('conductInspections', $site);

        $validated = $request->validate([
            'last_inspection_date' => 'nullable|date',
            'next_inspection_date' => 'nullable|date|after:last_inspection_date',
            'inspection_notes' => 'nullable|string',
        ]);

        $site->update([
            'last_inspection_date' => $validated['last_inspection_date'] ?? now(),
            'next_inspection_date' => $validated['next_inspection_date'] ?? null,
        ]);

        $this->logActivity(
            'inspection_updated',
            "Updated inspection for Site: {$site->name}",
            $site,
            ['notes' => $validated['inspection_notes'] ?? null]
        );

        return new SiteResource($site);
    }

    /**
     * Calculate budget utilization percentage.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return float
     */
    private function calculateBudgetUtilization($query)
    {
        $totalBudget = (clone $query)->sum('allocated_budget');
        $totalSpent = (clone $query)->sum('actual_spent');

        if ($totalBudget == 0) {
            return 0;
        }

        return round(($totalSpent / $totalBudget) * 100, 2);
    }
}
