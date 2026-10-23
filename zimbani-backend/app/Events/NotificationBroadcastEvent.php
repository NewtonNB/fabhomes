<?php

namespace App\Events;

use App\Models\AppNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationBroadcastEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public array $payload;

    public function __construct(int $userId, AppNotification $notification)
    {
        $this->userId = $userId;
        $this->payload = [
            'id' => $notification->id,
            'uuid' => $notification->uuid,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'category' => $notification->category,
            'priority' => $notification->priority,
            'action_url' => $notification->action_url,
            'created_at' => $notification->created_at->toIso8601String(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('client.' . $this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.received';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
