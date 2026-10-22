<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PlotReservation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'plot_reservations';

    protected $fillable = [
        'uuid',
        'reservation_number',
        'client_id',
        'user_id',
        'unit_id',
        'site_id',
        'project_id',
        'status',
        'reservation_fee',
        'reservation_fee_paid',
        'payment_intent_id',
        'payment_method',
        'reserved_at',
        'expires_at',
        'terms_accepted',
        'client_notes',
        'admin_notes',
        'cancellation_reason',
        'metadata',
    ];

    protected $casts = [
        'reserved_at' => 'datetime',
        'expires_at' => 'datetime',
        'terms_accepted' => 'boolean',
        'reservation_fee' => 'decimal:2',
        'reservation_fee_paid' => 'decimal:2',
        'metadata' => 'array',
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
            if (empty($model->reservation_number)) {
                $model->reservation_number = 'RES-' . date('Y') . '-' . strtoupper(Str::random(6));
            }
            if (empty($model->reserved_at)) {
                $model->reserved_at = now();
            }
            if (empty($model->expires_at)) {
                $model->expires_at = now()->addDays(14); // 14-day hold period
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired' || ($this->expires_at && $this->expires_at->isPast() && $this->status === 'pending');
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'confirmed'])
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }
}
