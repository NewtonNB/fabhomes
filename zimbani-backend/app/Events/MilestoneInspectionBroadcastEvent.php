<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MilestoneInspectionBroadcastEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public int $projectId;
    public array $data;

    public function __construct(int $userId, int $projectId, array $data)
    {
        $this->userId = $userId;
        $this->projectId = $projectId;
        $this->data = array_merge($data, [
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('client.' . $this->userId),
        ];

        if ($this->projectId > 0) {
            $channels[] = new PrivateChannel('project.' . $this->projectId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'milestone.inspection_updated';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
