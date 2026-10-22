<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentSimulation extends Model
{
    use HasFactory;

    protected $table = 'payment_simulations';

    protected $fillable = [
        'uuid',
        'simulation_run_id',
        'scenario_name',
        'channel',
        'gateway_name',
        'amount',
        'currency',
        'status',
        'steps_executed',
        'payment_intent_id',
        'payment_id',
        'transaction_id',
        'webhook_log_id',
        'refund_id',
        'dispute_id',
        'execution_duration_ms',
        'assertions_count',
        'passed_assertions_count',
        'error_message',
        'executed_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'steps_executed' => 'array',
        'execution_duration_ms' => 'integer',
        'assertions_count' => 'integer',
        'passed_assertions_count' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->simulation_run_id)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->simulation_run_id = sprintf('SIM-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function webhookLog(): BelongsTo
    {
        return $this->belongsTo(PaymentWebhookLog::class);
    }

    public function refund(): BelongsTo
    {
        return $this->belongsTo(PaymentRefund::class);
    }

    public function dispute(): BelongsTo
    {
        return $this->belongsTo(PaymentDispute::class);
    }

    public function executedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }
}
