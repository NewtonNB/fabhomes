<?php

namespace App\Services\Notifications;

use App\Events\MilestoneInspectionBroadcastEvent;
use App\Events\NotificationBroadcastEvent;
use App\Events\SavingsDepositBroadcastEvent;
use App\Events\TicketMessageBroadcastEvent;
use App\Models\AppNotification;
use App\Models\Client;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class RealtimeBroadcasterService
{
    /**
     * Broadcast In-App Notification directly to private client channel
     */
    public function broadcastNotification(int $userId, AppNotification $notification): NotificationBroadcastEvent
    {
        $event = new NotificationBroadcastEvent($userId, $notification);
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed (offline/driver issue): ' . $e->getMessage());
        }
        return $event;
    }

    /**
     * Broadcast Milestone Inspection Update & Sign-Off Trigger
     */
    public function broadcastMilestoneInspection(int $userId, int $projectId, array $data): MilestoneInspectionBroadcastEvent
    {
        $event = new MilestoneInspectionBroadcastEvent($userId, $projectId, $data);
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: ' . $e->getMessage());
        }
        return $event;
    }

    /**
     * Broadcast Real-Time Ticket Message to Conversation Thread Channel
     */
    public function broadcastTicketMessage(int $ticketId, SupportTicketMessage $message, ?string $senderName = null): TicketMessageBroadcastEvent
    {
        $event = new TicketMessageBroadcastEvent($ticketId, $message, $senderName);
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: ' . $e->getMessage());
        }
        return $event;
    }

    /**
     * Broadcast Instant Savings Deposit Receipt Confirmation
     */
    public function broadcastSavingsDeposit(int $userId, array $data): SavingsDepositBroadcastEvent
    {
        $event = new SavingsDepositBroadcastEvent($userId, $data);
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: ' . $e->getMessage());
        }
        return $event;
    }

    /**
     * Determine if a user is authorized for a specific channel
     */
    public function isUserAuthorizedForChannel(User $user, string $channelName): bool
    {
        // Strip private- or presence- prefix if provided
        $clean = preg_replace('/^(private-|presence-)/', '', $channelName);

        // 1. client.{id}
        if (preg_match('/^client\.(\d+)$/', $clean, $matches)) {
            return (int) $user->id === (int) $matches[1];
        }

        // 2. ticket.{id}
        if (preg_match('/^ticket\.(\d+)$/', $clean, $matches)) {
            $ticket = SupportTicket::find($matches[1]);
            if (!$ticket) return false;
            if ((int) $ticket->user_id === (int) $user->id) return true;
            $client = Client::where('user_id', $user->id)->first();
            if ($client && (int) $ticket->client_id === (int) $client->id) return true;
            if ((int) $ticket->assigned_to === (int) $user->id) return true;
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'super_admin', 'estate_manager', 'support_agent'])) {
                return true;
            }
            return false;
        }

        // 3. project.{id}
        if (preg_match('/^project\.(\d+)$/', $clean, $matches)) {
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'super_admin', 'estate_manager', 'site_supervisor', 'engineer'])) {
                return true;
            }
            $client = Client::where('user_id', $user->id)->first();
            if ($client) {
                return Unit::where('project_id', $matches[1])->where('client_id', $client->id)->exists();
            }
            return false;
        }

        return false;
    }

    /**
     * Get list of authorized channels for a given user
     */
    public function getUserAuthorizedChannels(User $user): array
    {
        $channels = [
            'client.' . $user->id,
        ];

        // Linked tickets
        $client = Client::where('user_id', $user->id)->first();
        $ticketIds = SupportTicket::where('user_id', $user->id)
            ->when($client, fn($q) => $q->orWhere('client_id', $client->id))
            ->pluck('id')
            ->toArray();

        foreach ($ticketIds as $tId) {
            $channels[] = 'ticket.' . $tId;
        }

        // Project channels
        if ($client) {
            $projectIds = Unit::where('client_id', $client->id)->pluck('project_id')->unique()->toArray();
            foreach ($projectIds as $pId) {
                if ($pId) $channels[] = 'project.' . $pId;
            }
        }

        return $channels;
    }
}
