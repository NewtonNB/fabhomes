<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class NotificationDispatchLog extends Model
{
    use HasFactory;

    protected $table = 'notification_dispatch_logs';

    protected $fillable = [
        'uuid',
        'notification_id',
        'recipient_type',
        'recipient_id',
        'recipient_phone',
        'recipient_email',
        'channel',
        'status',
        'gateway_provider',
        'gateway_message_id',
        'response_payload',
        'error_message',
        'cost_ugx',
        'dispatched_at',
    ];

    protected $casts = [
        'response_payload' => 'array',
        'cost_ugx' => 'decimal:2',
        'dispatched_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    /**
     * Parent notification relationship
     */
    public function notification(): BelongsTo
    {
        return $this->belongsTo(AppNotification::class, 'notification_id');
    }
}
