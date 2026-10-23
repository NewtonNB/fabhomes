<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class NotificationCampaign extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'notification_campaigns';

    protected $fillable = [
        'uuid',
        'created_by',
        'title',
        'message',
        'target_segment',
        'channels',
        'category',
        'priority',
        'action_url',
        'total_targeted',
        'total_dispatched',
        'total_failed',
        'status',
        'scheduled_at',
        'dispatched_at',
        'metadata',
    ];

    protected $casts = [
        'channels' => 'array',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
