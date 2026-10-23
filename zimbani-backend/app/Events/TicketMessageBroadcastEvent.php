<?php

namespace App\Events;

use App\Models\SupportTicketMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketMessageBroadcastEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $ticketId;
    public array $data;

    public function __construct(int $ticketId, SupportTicketMessage $message, ?string $senderName = null)
    {
        $this->ticketId = $ticketId;
        $this->data = [
            'ticket_id' => $ticketId,
            'id' => $message->id,
            'uuid' => $message->uuid,
            'sender_type' => $message->sender_type,
            'sender_name' => $senderName ?? ($message->sender_type === 'client' ? 'Client' : 'Fab Homes Support Agent'),
            'message' => $message->message,
            'attachments' => $message->attachments ?? [],
            'created_at' => $message->created_at->toIso8601String(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('ticket.' . $this->ticketId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.message_sent';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
