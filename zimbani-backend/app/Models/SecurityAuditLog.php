<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SecurityAuditLog extends Model
{
    use HasFactory;

    protected $table = 'security_audit_logs';

    public $timestamps = false; // Only created_at is used

    protected $fillable = [
        'uuid',
        'event_type',
        'user_id',
        'ip_address',
        'user_agent',
        'endpoint',
        'method',
        'severity',
        'details',
        'created_at',
    ];

    protected $casts = [
        'details' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Record a security event log entry
     */
    public static function record(
        string $eventType,
        array $details = [],
        ?User $user = null,
        string $severity = 'warning',
        ?Request $request = null
    ): self {
        $req = $request ?? request();

        return static::create([
            'event_type' => $eventType,
            'user_id' => $user?->id ?? $req?->user()?->id,
            'ip_address' => $req?->ip() ?? '127.0.0.1',
            'user_agent' => substr($req?->userAgent() ?? 'System', 0, 500),
            'endpoint' => substr($req?->path() ?? '/', 0, 255),
            'method' => $req?->method() ?? 'GET',
            'severity' => $severity,
            'details' => $details,
        ]);
    }
}
