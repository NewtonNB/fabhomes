<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Notifications\NotificationDispatcherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    protected NotificationDispatcherService $dispatcherService;

    public function __construct(NotificationDispatcherService $dispatcherService)
    {
        $this->dispatcherService = $dispatcherService;
    }

    /**
     * Get paginated notifications for current authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['category', 'unread_only', 'per_page']);
        $notifications = $this->dispatcherService->getUserNotifications($request->user(), $filters);

        return response()->json([
            'success' => true,
            'data' => $notifications,
        ]);
    }

    /**
     * Get unread badge count & recent alert preview
     */
    public function summary(Request $request): JsonResponse
    {
        $summary = $this->dispatcherService->getUnreadSummary($request->user());

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Mark single notification as read
     */
    public function markAsRead(Request $request, string $identifier): JsonResponse
    {
        $notification = $this->dispatcherService->markAsRead($request->user(), $identifier);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'data' => $notification,
        ]);
    }

    /**
     * Bulk mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $updatedCount = $this->dispatcherService->markAllAsRead($request->user());

        return response()->json([
            'success' => true,
            'message' => "{$updatedCount} notifications marked as read",
            'data' => ['updated_count' => $updatedCount],
        ]);
    }

    /**
     * Dismiss a notification
     */
    public function dismiss(Request $request, string $identifier): JsonResponse
    {
        $notification = $this->dispatcherService->dismiss($request->user(), $identifier);

        return response()->json([
            'success' => true,
            'message' => 'Notification dismissed',
            'data' => $notification,
        ]);
    }

    /**
     * Test notification dispatch across SMS, Email, In-App
     */
    public function dispatchTest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'category' => 'nullable|in:financial,construction,legal,support,security,general',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'channels' => 'nullable|array',
            'channels.*' => 'in:in_app,sms,email,whatsapp,push',
        ]);

        $result = $this->dispatcherService->dispatchToUser($request->user(), $validated);

        return response()->json([
            'success' => true,
            'message' => 'Test notification dispatched successfully',
            'data' => $result,
        ], 201);
    }

    /**
     * Get dispatch delivery audit logs
     */
    public function dispatchLogs(Request $request): JsonResponse
    {
        $logs = $this->dispatcherService->getDispatchLogs($request->all());

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
