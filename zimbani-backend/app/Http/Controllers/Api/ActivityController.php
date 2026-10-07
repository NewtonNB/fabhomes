<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    /**
     * Display a listing of activities with filters.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // Only Super Admin and Company Admin can view all activities
        if (!$request->user()->hasAnyRole(['Super Admin', 'Company Admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view activity logs'
            ], 403);
        }

        $perPage = $request->input('per_page', 15);
        $userId = $request->input('user_id');
        $type = $request->input('type');
        $entityType = $request->input('entity_type');
        $entityId = $request->input('entity_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Activity::with('user')->latest();

        // Filter by user
        if ($userId) {
            $query->byUser($userId);
        }

        // Filter by activity type
        if ($type) {
            $query->byType($type);
        }

        // Filter by entity
        if ($entityType) {
            $modelClass = 'App\\Models\\' . $entityType;
            if (class_exists($modelClass)) {
                $query->byEntity($modelClass, $entityId);
            }
        }

        // Filter by date range
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $activities = $query->paginate($perPage);

        return ActivityResource::collection($activities)->additional([
            'success' => true,
            'meta' => [
                'total' => $activities->total(),
                'per_page' => $activities->perPage(),
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
            ]
        ]);
    }

    /**
     * Display the specified activity.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, int $id)
    {
        // Only Super Admin and Company Admin can view activity details
        if (!$request->user()->hasAnyRole(['Super Admin', 'Company Admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view activity details'
            ], 403);
        }

        $activity = Activity::with('user')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new ActivityResource($activity)
        ], 200);
    }

    /**
     * Get activities for the authenticated user.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function myActivities(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $type = $request->input('type');

        $query = Activity::byUser($request->user()->id)->latest();

        if ($type) {
            $query->byType($type);
        }

        $activities = $query->paginate($perPage);

        return ActivityResource::collection($activities)->additional([
            'success' => true,
            'meta' => [
                'total' => $activities->total(),
                'per_page' => $activities->perPage(),
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
            ]
        ]);
    }

    /**
     * Get activity statistics.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function statistics(Request $request)
    {
        // Only Super Admin and Company Admin can view statistics
        if (!$request->user()->hasAnyRole(['Super Admin', 'Company Admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view statistics'
            ], 403);
        }

        $days = $request->input('days', 30);

        $stats = [
            'total_activities' => Activity::where('created_at', '>=', now()->subDays($days))->count(),
            'by_type' => Activity::where('created_at', '>=', now()->subDays($days))
                ->selectRaw('type, count(*) as count')
                ->groupBy('type')
                ->pluck('count', 'type'),
            'by_user' => Activity::where('created_at', '>=', now()->subDays($days))
                ->selectRaw('user_id, count(*) as count')
                ->groupBy('user_id')
                ->with('user:id,name,email')
                ->get()
                ->map(function ($activity) {
                    return [
                        'user' => $activity->user?->name ?? 'System',
                        'count' => $activity->count
                    ];
                }),
            'recent_activities' => ActivityResource::collection(
                Activity::with('user')->latest()->limit(10)->get()
            ),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'period' => "{$days} days"
        ], 200);
    }
}
