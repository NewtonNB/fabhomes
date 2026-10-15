<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreToolboxTalkRequest;
use App\Http\Requests\UpdateToolboxTalkRequest;
use App\Http\Resources\SafetyToolboxTalkResource;
use App\Models\SafetyToolboxTalk;
use App\Models\Site;
use App\Models\Project;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SafetyToolboxTalkController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of safety toolbox briefings.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SafetyToolboxTalk::class);

        $query = SafetyToolboxTalk::with(['site', 'project', 'siteDailyLog', 'conductedByUser']);

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

        // Filter by Category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Date Range
        if ($request->filled('from_date')) {
            $query->whereDate('conducted_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('conducted_at', '<=', $request->to_date);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('talk_number', 'like', "%{$search}%")
                  ->orWhere('topic', 'like', "%{$search}%")
                  ->orWhere('key_discussion_points', 'like', "%{$search}%")
                  ->orWhere('hazards_identified', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'conducted_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['conducted_at', 'duration_minutes', 'attendees_count', 'category', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('conducted_at', 'desc')->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $talks = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => SafetyToolboxTalkResource::collection($talks),
            'meta' => [
                'current_page' => $talks->currentPage(),
                'last_page' => $talks->lastPage(),
                'per_page' => $talks->perPage(),
                'total' => $talks->total(),
            ],
            'pagination' => [
                'current_page' => $talks->currentPage(),
                'last_page' => $talks->lastPage(),
                'per_page' => $talks->perPage(),
                'total' => $talks->total(),
            ],
        ]);
    }

    /**
     * Store a newly created safety toolbox briefing.
     */
    public function store(StoreToolboxTalkRequest $request): JsonResponse
    {
        $this->authorize('create', SafetyToolboxTalk::class);

        $validated = $request->validated();
        $talk = SafetyToolboxTalk::create($validated);
        $talk->load(['site', 'project', 'siteDailyLog', 'conductedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_toolbox_talk_conducted',
            'entity_type' => SafetyToolboxTalk::class,
            'entity_id' => $talk->id,
            'description' => "Conducted safety toolbox talk {$talk->talk_number} - {$talk->topic} ({$talk->attendees_count} attendees)",
            'properties' => [
                'talk_number' => $talk->talk_number,
                'topic' => $talk->topic,
                'category' => $talk->category,
                'attendees_count' => $talk->attendees_count,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Safety toolbox briefing recorded successfully.',
            'data' => new SafetyToolboxTalkResource($talk),
        ], 201);
    }

    /**
     * Display the specified safety toolbox briefing.
     */
    public function show(string $uuid): JsonResponse
    {
        $talk = SafetyToolboxTalk::where('uuid', $uuid)
            ->with(['site', 'project', 'siteDailyLog', 'conductedByUser', 'documents'])
            ->firstOrFail();

        $this->authorize('view', $talk);

        return response()->json([
            'success' => true,
            'data' => new SafetyToolboxTalkResource($talk),
        ]);
    }

    /**
     * Update the specified safety toolbox briefing.
     */
    public function update(UpdateToolboxTalkRequest $request, string $uuid): JsonResponse
    {
        $talk = SafetyToolboxTalk::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $talk);

        $talk->update($request->validated());
        $talk->load(['site', 'project', 'siteDailyLog', 'conductedByUser']);

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_toolbox_talk_updated',
            'entity_type' => SafetyToolboxTalk::class,
            'entity_id' => $talk->id,
            'description' => "Updated safety toolbox talk {$talk->talk_number}",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Safety toolbox briefing updated successfully.',
            'data' => new SafetyToolboxTalkResource($talk),
        ]);
    }

    /**
     * Remove the specified safety toolbox briefing.
     */
    public function destroy(string $uuid): JsonResponse
    {
        $talk = SafetyToolboxTalk::where('uuid', $uuid)->firstOrFail();
        $this->authorize('delete', $talk);

        $num = $talk->talk_number;
        $talk->delete();

        Activity::create([
            'user_id' => auth()->id(),
            'type' => 'safety_toolbox_talk_deleted',
            'entity_type' => SafetyToolboxTalk::class,
            'entity_id' => $talk->id,
            'description' => "Deleted safety toolbox talk {$num}",
        ]);

        return response()->json([
            'success' => true,
            'message' => "Safety toolbox briefing {$num} deleted successfully.",
        ]);
    }
}
