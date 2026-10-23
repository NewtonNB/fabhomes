<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SavingsDepositBroadcastEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public array $data;

    public function __construct(int $userId, array $data)
    {
        $this->userId = $userId;
        $this->data = array_merge($data, [
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('client.' . $this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'savings.deposit_confirmed';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
