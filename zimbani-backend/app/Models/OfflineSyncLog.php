<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OfflineSyncLog extends Model
{
    use HasFactory;

    protected $table = 'offline_sync_logs';

    protected $fillable = [
        'uuid',
        'device_id',
        'user_id',
        'sync_type',
        'total_items_processed',
        'total_conflicts',
        'payload_summary',
        'client_version',
        'ip_address',
        'status',
    ];

    protected $casts = [
        'payload_summary' => 'array',
        'total_items_processed' => 'integer',
        'total_conflicts' => 'integer',
    ];

    /**
     * Use UUID for route model binding
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Booted model hooks
     */
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
        return $this->belongsTo(User::class, 'user_id');
    }
}
