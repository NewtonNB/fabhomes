<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMilestoneRequest;
use App\Http\Requests\UpdateMilestoneRequest;
use App\Http\Resources\MilestoneResource;
use App\Models\ConstructionMilestone;
use App\Models\Project;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MilestoneController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of milestones
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ConstructionMilestone::class);

        $query = ConstructionMilestone::with(['project', 'completedByUser'])
            ->withCount('tasks');

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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $milestones = $query->orderBy('milestone_order')->get();

        return response()->json([
            'success' => true,
            'data' => MilestoneResource::collection($milestones),
        ]);
    }

    /**
     * Get milestones for a specific project
     */
    public function projectMilestones(string $projectUuid): JsonResponse
    {
        $project = Project::where('uuid', $projectUuid)->orWhere('id', $projectUuid)->firstOrFail();
        $this->authorize('view', $project);

        $milestones = ConstructionMilestone::where('project_id', $project->id)
            ->with(['completedByUser', 'tasks.assignedUser'])
            ->withCount('tasks')
            ->orderBy('milestone_order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => MilestoneResource::collection($milestones),
        ]);
    }

    /**
     * Store a newly created milestone
     */
    public function store(StoreMilestoneRequest $request): JsonResponse
    {
        $this->authorize('create', ConstructionMilestone::class);

        $data = $request->validated();
        $milestone = ConstructionMilestone::create($data);
        $milestone->load(['project', 'completedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'milestone_created',
            'entity_type' => ConstructionMilestone::class,
            'entity_id' => $milestone->id,
            'description' => "Created milestone {$milestone->milestone_name} for project #{$milestone->project_id}",
            'properties' => ['project_id' => $milestone->project_id, 'milestone_order' => $milestone->milestone_order],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Milestone created successfully',
            'data' => new MilestoneResource($milestone),
        ], 201);
    }

    /**
     * Display the specified milestone
     */
    public function show(ConstructionMilestone $milestone): JsonResponse
    {
        $this->authorize('view', $milestone);

        $milestone->load([
            'project',
            'completedByUser',
            'tasks.assignedUser',
            'documents',
        ])->loadCount('tasks');

        return response()->json([
            'success' => true,
            'data' => new MilestoneResource($milestone),
        ]);
    }

    /**
     * Update milestone progress / status (conforms to API Spec Section 9.3)
     */
    public function update(UpdateMilestoneRequest $request, ConstructionMilestone $milestone): JsonResponse
    {
        $this->authorize('update', $milestone);

        $data = $request->validated();
        $milestone->update($data);
        $milestone->load(['project', 'completedByUser', 'tasks']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'milestone_updated',
            'entity_type' => ConstructionMilestone::class,
            'entity_id' => $milestone->id,
            'description' => "Updated milestone {$milestone->milestone_name}",
            'properties' => ['changes' => $milestone->getChanges()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Milestone updated successfully',
            'data' => new MilestoneResource($milestone),
        ]);
    }

    /**
     * Remove the specified milestone
     */
    public function destroy(Request $request, ConstructionMilestone $milestone): JsonResponse
    {
        $this->authorize('delete', $milestone);

        $name = $milestone->milestone_name;
        $milestone->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'milestone_deleted',
            'entity_type' => ConstructionMilestone::class,
            'entity_id' => $milestone->id,
            'description' => "Deleted milestone {$name}",
            'properties' => ['milestone_name' => $name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Milestone deleted successfully',
        ]);
    }
}
