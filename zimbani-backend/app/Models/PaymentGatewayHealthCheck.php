<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentGatewayHealthCheck extends Model
{
    use HasFactory;

    protected $table = 'payment_gateway_health_checks';

    protected $fillable = [
        'uuid',
        'gateway_name',
        'status',
        'latency_ms',
        'http_status',
        'endpoint_tested',
        'message',
        'checked_at',
    ];

    protected $casts = [
        'latency_ms' => 'integer',
        'http_status' => 'integer',
        'checked_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->checked_at)) {
                $model->checked_at = now();
            }
        });
    }

    public function gatewayConfig(): BelongsTo
    {
        return $this->belongsTo(PaymentGatewayConfig::class, 'gateway_name', 'name');
    }
}
