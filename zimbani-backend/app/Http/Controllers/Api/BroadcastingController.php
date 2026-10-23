<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Services\Notifications\RealtimeBroadcasterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BroadcastingController extends Controller
{
    protected RealtimeBroadcasterService $broadcaster;

    public function __construct(RealtimeBroadcasterService $broadcaster)
    {
        $this->broadcaster = $broadcaster;
    }

    /**
     * Get authorized broadcasting channels for current authenticated user
     */
    public function getChannels(Request $request): JsonResponse
    {
        $channels = $this->broadcaster->getUserAuthorizedChannels($request->user());

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $request->user()->id,
                'channels' => $channels,
            ],
        ]);
    }

    /**
     * Test trigger a broadcast event to verify WebSocket connectivity
     */
    public function testBroadcast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => 'nullable|in:notification,milestone,deposit',
            'title' => 'nullable|string',
            'message' => 'nullable|string',
        ]);

        $eventType = $validated['event_type'] ?? 'notification';
        $user = $request->user();

        if ($eventType === 'deposit') {
            $event = $this->broadcaster->broadcastSavingsDeposit($user->id, [
                'account_number' => 'SA-TEST-999',
                'amount' => 1500000,
                'new_balance' => 8500000,
                'transaction_number' => 'TX-TEST-' . rand(1000, 9999),
            ]);
        } elseif ($eventType === 'milestone') {
            $event = $this->broadcaster->broadcastMilestoneInspection($user->id, 0, [
                'verification_uuid' => 'test-verification-uuid',
                'milestone_name' => 'Roofing & Waterproofing',
                'project_name' => 'Lake View Heights',
                'status' => 'certified',
                'release_amount' => 4500000,
                'sign_off_required' => true,
            ]);
        } else {
            $notification = new AppNotification([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'type' => 'test_broadcast',
                'title' => $validated['title'] ?? 'Real-Time WebSocket Test Alert',
                'message' => $validated['message'] ?? 'This event was broadcast instantly via Laravel Reverb / Pusher.',
                'category' => 'general',
                'priority' => 'normal',
                'action_url' => '/client-portal',
            ]);
            $notification->created_at = now();

            $event = $this->broadcaster->broadcastNotification($user->id, $notification);
        }

        return response()->json([
            'success' => true,
            'message' => 'Real-time broadcast event dispatched',
            'data' => [
                'event' => class_basename($event),
                'channel' => method_exists($event, 'broadcastOn') ? array_map(fn($c) => $c->name, $event->broadcastOn()) : [],
                'payload' => method_exists($event, 'broadcastWith') ? $event->broadcastWith() : [],
            ],
        ], 200);
    }
}
