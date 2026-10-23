<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class UserNotificationPreference extends Model
{
    use HasFactory;

    protected $table = 'user_notification_preferences';

    protected $fillable = [
        'uuid',
        'user_id',
        'channels',
        'categories',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'timezone',
    ];

    protected $casts = [
        'channels' => 'array',
        'categories' => 'array',
        'quiet_hours_enabled' => 'boolean',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public static function getDefaultChannels(): array
    {
        return [
            'sms' => true,
            'email' => true,
            'whatsapp' => true,
            'push' => true,
            'in_app' => true,
        ];
    }

    public static function getDefaultCategories(): array
    {
        return [
            'financial' => true,
            'construction' => true,
            'legal' => true,
            'support' => true,
            'general' => true,
        ];
    }
}
