<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SupportTicketMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'support_ticket_messages';

    protected $fillable = [
        'uuid',
        'support_ticket_id',
        'user_id',
        'sender_type',
        'sender_name',
        'message',
        'attachments',
        'is_internal_note',
        'read_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'is_internal_note' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
