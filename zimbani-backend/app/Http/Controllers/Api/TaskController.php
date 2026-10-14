<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Models\ConstructionMilestone;
use App\Models\User;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaskController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of tasks with filters
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        $query = Task::with([
            'project',
            'site',
            'unit',
            'milestone',
            'assignedUser',
            'createdByUser'
        ]);

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

        // Filter by Site
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

        // Filter by Unit
        if ($request->filled('unit_id')) {
            $unitId = $request->unit_id;
            if (!is_numeric($unitId)) {
                $u = Unit::where('uuid', $unitId)->first();
                $unitId = $u ? $u->id : null;
            }
            if ($unitId) {
                $query->where('unit_id', $unitId);
            }
        }

        // Filter by Milestone
        if ($request->filled('milestone_id')) {
            $mId = $request->milestone_id;
            if (!is_numeric($mId)) {
                $m = ConstructionMilestone::where('uuid', $mId)->first();
                $mId = $m ? $m->id : null;
            }
            if ($mId) {
                $query->where('milestone_id', $mId);
            }
        }

        // Filter by Assigned User
        if ($request->filled('assigned_to')) {
            $userId = $request->assigned_to;
            if (!is_numeric($userId)) {
                $u = User::where('uuid', $userId)->first();
                $userId = $u ? $u->id : null;
            }
            if ($userId) {
                $query->where('assigned_to', $userId);
            }
        }

        // Status & Priority
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        // Overdue check
        if ($request->boolean('overdue_only')) {
            $query->whereNotNull('due_date')
                ->where('due_date', '<', now()->toDateString())
                ->where('status', '!=', 'completed');
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('task_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $allowedSorts = ['created_at', 'due_date', 'priority', 'status', 'completion_percentage', 'title'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->get('per_page', 15);
        $tasks = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => TaskResource::collection($tasks),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ]
        ]);
    }

    /**
     * Store a newly created task
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $this->authorize('create', Task::class);

        $data = $request->validated();
        $task = Task::create($data);

        $task->load(['project', 'site', 'unit', 'milestone', 'assignedUser', 'createdByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'task_created',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'description' => "Created task {$task->task_number}: {$task->title}",
            'properties' => ['task_number' => $task->task_number, 'project_id' => $task->project_id],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully',
            'data' => new TaskResource($task),
        ], 201);
    }

    /**
     * Display the specified task
     */
    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $task->load([
            'project',
            'site',
            'unit',
            'milestone',
            'assignedUser',
            'createdByUser',
            'documents',
        ]);

        return response()->json([
            'success' => true,
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * Update the specified task
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $data = $request->validated();
        $task->update($data);

        $task->load(['project', 'site', 'unit', 'milestone', 'assignedUser', 'createdByUser', 'documents']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'task_updated',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'description' => "Updated task {$task->task_number}: {$task->title}",
            'properties' => ['changes' => $task->getChanges()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task updated successfully',
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * Remove the specified task (soft delete)
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $taskNumber = $task->task_number;
        $task->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'task_deleted',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'description' => "Deleted task {$taskNumber}",
            'properties' => ['task_number' => $taskNumber],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task deleted successfully',
        ]);
    }

    /**
     * Restore a soft-deleted task
     */
    public function restore(Request $request, string $uuid): JsonResponse
    {
        $task = Task::withTrashed()->where('uuid', $uuid)->firstOrFail();
        $this->authorize('delete', $task);

        $task->restore();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'task_restored',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'description' => "Restored task {$task->task_number}",
            'properties' => ['task_number' => $task->task_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task restored successfully',
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * Fast status and progress update
     */
    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,blocked,cancelled',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validated['status'] === 'completed') {
            $validated['completion_percentage'] = 100.00;
            $validated['completed_at'] = now();
        }

        $task->update($validated);
        $task->load(['project', 'site', 'unit', 'milestone', 'assignedUser']);

        return response()->json([
            'success' => true,
            'message' => "Task status updated to {$task->status}",
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * Get aggregate statistics for tasks
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        $query = Task::query();

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

        $total = (clone $query)->count();
        $pending = (clone $query)->where('status', 'pending')->count();
        $inProgress = (clone $query)->where('status', 'in_progress')->count();
        $completed = (clone $query)->where('status', 'completed')->count();
        $blocked = (clone $query)->where('status', 'blocked')->count();
        $cancelled = (clone $query)->where('status', 'cancelled')->count();

        $overdue = (clone $query)->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString())
            ->where('status', '!=', 'completed')
            ->count();

        $urgent = (clone $query)->where('priority', 'urgent')->where('status', '!=', 'completed')->count();
        $high = (clone $query)->where('priority', 'high')->where('status', '!=', 'completed')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'pending' => $pending,
                'in_progress' => $inProgress,
                'completed' => $completed,
                'blocked' => $blocked,
                'cancelled' => $cancelled,
                'overdue' => $overdue,
                'urgent' => $urgent,
                'high' => $high,
            ],
        ]);
    }
}
