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
        'signature_valid',
        'signature_hash',
        'payload_hash',
        'is_replay',
        'ip_whitelisted',
        'processing_duration_ms',
        'retry_count',
        'max_retries',
        'next_retry_at',
        'processing_error',
        'mobile_money_transaction_id',
        'payment_intent_id',
        'processed_at',
    ];

    protected $casts = [
        'headers' => 'array',
        'payload' => 'array',
        'signature_valid' => 'boolean',
        'is_replay' => 'boolean',
        'ip_whitelisted' => 'boolean',
        'processed_at' => 'datetime',
        'next_retry_at' => 'datetime',
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

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
    }

    public function canRetry(): bool
    {
        return $this->status === 'failed' && $this->retry_count < $this->max_retries;
    }
}
