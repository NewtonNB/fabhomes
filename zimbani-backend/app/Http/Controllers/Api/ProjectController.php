<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProjectController extends Controller
{
    use AuthorizesRequests, LogsActivity;

    /**
     * Display a listing of projects.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query();

        // Apply company filter for non-Super Admin users
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                // Company Admin sees only their company's projects
                $query->where('company_id', $user->company_id);
            } elseif ($user->hasAnyRole(['Site Manager', 'Supervisor'])) {
                // Site Manager/Supervisor sees only assigned projects
                $query->whereHas('users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            }
        }

        // Filter by company
        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by project type
        if ($request->has('project_type')) {
            $query->where('project_type', $request->project_type);
        }

        // Filter by ongoing projects
        if ($request->boolean('ongoing_only')) {
            $query->ongoing();
        }

        // Filter by completed projects
        if ($request->boolean('completed_only')) {
            $query->completed();
        }

        // Filter by overdue projects
        if ($request->boolean('overdue_only')) {
            $query->where('status', '!=', 'completed')
                ->where('end_date', '<', now());
        }

        // Search by name or code
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%');
            });
        }

        // Include relationships
        $with = [];
        if ($request->boolean('with_company')) {
            $with[] = 'company';
        }
        if ($request->boolean('with_sites')) {
            $with[] = 'sites';
        }
        if ($request->boolean('with_sites_count')) {
            $query->withCount('sites');
        }
        if ($request->boolean('with_users_count')) {
            $query->withCount('users');
        }

        if (!empty($with)) {
            $query->with($with);
        }

        // Sort
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        // Paginate
        $perPage = $request->get('per_page', 15);
        $projects = $query->paginate($perPage);

        return ProjectResource::collection($projects);
    }

    /**
     * Store a newly created project.
     *
     * @param  \App\Http\Requests\StoreProjectRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreProjectRequest $request)
    {
        $project = Project::create($request->validated());

        // Log activity
        $this->logCreated($project, [
            'project_name' => $project->name,
            'project_code' => $project->code,
            'project_type' => $project->project_type,
            'company_id' => $project->company_id,
        ]);

        return (new ProjectResource($project->load('company')))
            ->additional([
                'message' => 'Project created successfully',
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified project.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        // Load relationships if requested
        if ($request->boolean('with_company')) {
            $project->load('company');
        }
        if ($request->boolean('with_sites')) {
            $project->load('sites');
        }
        if ($request->boolean('with_users')) {
            $project->load('users');
        }

        return new ProjectResource($project);
    }

    /**
     * Update the specified project.
     *
     * @param  \App\Http\Requests\UpdateProjectRequest  $request
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateProjectRequest $request, Project $project)
    {
        $oldData = $project->only(['name', 'status', 'project_type', 'budget', 'start_date', 'end_date']);
        
        $project->update($request->validated());

        // Log activity
        $this->logUpdated($project, $oldData, $project->only(['name', 'status', 'project_type', 'budget', 'start_date', 'end_date']));

        return (new ProjectResource($project->load('company')))
            ->additional([
                'message' => 'Project updated successfully',
            ]);
    }

    /**
     * Remove the specified project (soft delete).
     *
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function destroy(Project $project)
    {
        $this->authorize('delete', $project);

        // Check if project has sites
        if ($project->hasSites()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete project with active sites',
            ], 422);
        }

        $projectName = $project->name;
        $projectCode = $project->code;
        $project->delete();

        // Log activity
        $this->logDeleted($project, [
            'project_name' => $projectName,
            'project_code' => $projectCode,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully',
        ]);
    }

    /**
     * Restore a soft-deleted project.
     *
     * @param  string  $uuid
     * @return \Illuminate\Http\Response
     */
    public function restore($uuid)
    {
        $project = Project::withTrashed()->where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('restore', $project);

        $project->restore();

        // Log activity
        $this->logRestored($project, [
            'project_name' => $project->name,
            'project_code' => $project->code,
        ]);

        return (new ProjectResource($project->load('company')))
            ->additional([
                'message' => 'Project restored successfully',
            ]);
    }

    /**
     * Get project statistics.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function statistics(Request $request)
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query();

        // Apply company filter for non-Super Admin users
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                $query->where('company_id', $user->company_id);
            } elseif ($user->hasAnyRole(['Site Manager', 'Supervisor'])) {
                $query->whereHas('users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            }
        }

        $stats = [
            'total_projects' => (clone $query)->count(),
            'active_projects' => (clone $query)->where('status', 'active')->count(),
            'planning_projects' => (clone $query)->where('status', 'planning')->count(),
            'on_hold_projects' => (clone $query)->where('status', 'on_hold')->count(),
            'completed_projects' => (clone $query)->where('status', 'completed')->count(),
            'cancelled_projects' => (clone $query)->where('status', 'cancelled')->count(),
            'overdue_projects' => (clone $query)->where('status', '!=', 'completed')
                ->where('end_date', '<', now())->count(),
            'by_type' => (clone $query)->select('project_type')
                ->selectRaw('count(*) as count')
                ->groupBy('project_type')
                ->get()
                ->pluck('count', 'project_type'),
            'total_budget' => (clone $query)->sum('budget'),
            'total_spent' => (clone $query)->sum('total_spent'),
            'recent_projects' => (clone $query)->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['uuid', 'name', 'code', 'status', 'created_at']),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get sites of a project.
     *
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function sites(Project $project)
    {
        $this->authorize('view', $project);

        $sites = $project->sites()
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $sites,
        ]);
    }

    /**
     * Get users assigned to a project.
     *
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function users(Project $project)
    {
        $this->authorize('view', $project);

        $users = $project->users()
            ->withPivot('role', 'assigned_at')
            ->orderBy('project_user.created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Assign users to a project.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function assignUsers(Request $request, Project $project)
    {
        $this->authorize('assignUsers', $project);

        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'role' => 'nullable|string|max:50',
        ]);

        $userData = [];
        foreach ($request->user_ids as $userId) {
            $userData[$userId] = [
                'role' => $request->role ?? 'member',
                'assigned_at' => now(),
            ];
        }

        $project->users()->syncWithoutDetaching($userData);

        // Log activity
        $this->logActivity(
            'assigned',
            "Assigned users to project: {$project->name}",
            $project,
            [
                'user_ids' => $request->user_ids,
                'role' => $request->role,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Users assigned to project successfully',
        ]);
    }

    /**
     * Remove users from a project.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\Response
     */
    public function removeUsers(Request $request, Project $project)
    {
        $this->authorize('assignUsers', $project);

        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $project->users()->detach($request->user_ids);

        // Log activity
        $this->logActivity(
            'removed',
            "Removed users from project: {$project->name}",
            $project,
            [
                'user_ids' => $request->user_ids,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Users removed from project successfully',
        ]);
    }
}
