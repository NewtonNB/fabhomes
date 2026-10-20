<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentWebhookLog extends Model
{
    use HasFactory;

    protected $table = 'payment_webhook_logs';

    protected $fillable = [
        'uuid',
        'provider',
        'event_type',
        'external_reference',
        'headers',
        'payload',
        'ip_address',
        'status',
        'processing_error',
        'mobile_money_transaction_id',
        'processed_at',
    ];

    protected $casts = [
        'headers' => 'array',
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($log) {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }
        });
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function mobileMoneyTransaction(): BelongsTo
    {
        return $this->belongsTo(MobileMoneyTransaction::class, 'mobile_money_transaction_id');
    }
}
