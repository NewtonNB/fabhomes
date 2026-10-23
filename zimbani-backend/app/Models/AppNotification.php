<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AppNotification extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'app_notifications';

    protected $fillable = [
        'uuid',
        'user_id',
        'client_id',
        'type',
        'title',
        'message',
        'action_url',
        'data',
        'category',
        'priority',
        'read_at',
        'is_dismissed',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'is_dismissed' => 'boolean',
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

    /**
     * Recipient user relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Recipient client relationship
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Delivery dispatch logs across all channels
     */
    public function dispatchLogs(): HasMany
    {
        return $this->hasMany(NotificationDispatchLog::class, 'notification_id');
    }

    /**
     * Scopes
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at')->where('is_dismissed', false);
    }

    public function scopeActive($query)
    {
        return $query->where('is_dismissed', false);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): bool
    {
        if (is_null($this->read_at)) {
            $this->read_at = now();
            return $this->save();
        }
        return true;
    }

    /**
     * Dismiss notification
     */
    public function dismiss(): bool
    {
        $this->is_dismissed = true;
        if (is_null($this->read_at)) {
            $this->read_at = now();
        }
        return $this->save();
    }
}
