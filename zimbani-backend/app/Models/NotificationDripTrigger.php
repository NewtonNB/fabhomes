<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class NotificationDripTrigger extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'notification_drip_triggers';

    protected $fillable = [
        'uuid',
        'campaign_type',
        'trigger_key',
        'recipient_user_id',
        'recipient_client_id',
        'entity_type',
        'entity_id',
        'title',
        'message',
        'channels_attempted',
        'channels_succeeded',
        'status',
        'is_dry_run',
        'dispatch_summary',
        'scheduled_at',
        'dispatched_at',
        'metadata',
    ];

    protected $casts = [
        'channels_attempted' => 'array',
        'channels_succeeded' => 'array',
        'is_dry_run' => 'boolean',
        'dispatch_summary' => 'array',
        'metadata' => 'array',
        'scheduled_at' => 'datetime',
        'dispatched_at' => 'datetime',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'recipient_client_id');
    }

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }
}
