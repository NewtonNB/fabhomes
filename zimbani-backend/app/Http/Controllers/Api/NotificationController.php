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

    /**
     * Get user notification preferences
     */
    public function preferences(Request $request): JsonResponse
    {
        $preferences = $this->dispatcherService->getUserPreferences($request->user());

        return response()->json([
            'success' => true,
            'data' => $preferences,
        ]);
    }

    /**
     * Update user notification preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channels' => 'nullable|array',
            'channels.sms' => 'nullable|boolean',
            'channels.email' => 'nullable|boolean',
            'channels.whatsapp' => 'nullable|boolean',
            'channels.push' => 'nullable|boolean',
            'channels.in_app' => 'nullable|boolean',
            'categories' => 'nullable|array',
            'categories.financial' => 'nullable|boolean',
            'categories.construction' => 'nullable|boolean',
            'categories.legal' => 'nullable|boolean',
            'categories.support' => 'nullable|boolean',
            'categories.general' => 'nullable|boolean',
            'quiet_hours_enabled' => 'nullable|boolean',
            'quiet_hours_start' => 'nullable|string|max:10',
            'quiet_hours_end' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:50',
        ]);

        $updated = $this->dispatcherService->updateUserPreferences($request->user(), $validated);

        return response()->json([
            'success' => true,
            'message' => 'Notification preferences updated successfully',
            'data' => $updated,
        ]);
    }

    /**
     * Retry failed notification dispatch log
     */
    public function retryLog(Request $request, int $id): JsonResponse
    {
        $retried = $this->dispatcherService->retryDispatchLog($id);

        return response()->json([
            'success' => true,
            'message' => 'Notification dispatch retry executed',
            'data' => $retried,
        ]);
    }

    /**
     * Get notification analytics and delivery metrics
     */
    public function analytics(Request $request): JsonResponse
    {
        $analytics = $this->dispatcherService->getNotificationAnalytics($request->all());

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Send campaign broadcast to targeted audience
     */
    public function sendCampaign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_segment' => 'required|string|in:all_clients,active_savers,plot_holders,site_investors,all_users',
            'channels' => 'required|array|min:1',
            'channels.*' => 'in:in_app,sms,email,whatsapp,push',
            'category' => 'nullable|in:financial,construction,legal,support,security,general',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'action_url' => 'nullable|string|max:255',
        ]);

        $result = $this->dispatcherService->sendCampaignBroadcast($validated, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Campaign broadcast dispatched to {$result['total_dispatched']} recipients",
            'data' => $result,
        ], 201);
    }
}
