<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentRefund extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'payment_refunds';

    protected $fillable = [
        'uuid',
        'refund_number',
        'payment_id',
        'payment_intent_id',
        'client_id',
        'savings_account_id',
        'reversal_transaction_id',
        'phase_name',
        'scheme_name',
        'notice_date',
        'amount',
        'deduction_percentage',
        'deduction_amount',
        'balance_after_refund',
        'currency',
        'fee_refunded',
        'reason_category',
        'reason_description',
        'withdrawal_reason',
        'payment_method',
        'notes',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'processed_at',
        'gateway_refund_reference',
        'gateway_response',
        'metadata',
    ];

    protected $casts = [
        'notice_date' => 'date',
        'amount' => 'decimal:2',
        'deduction_percentage' => 'decimal:2',
        'deduction_amount' => 'decimal:2',
        'balance_after_refund' => 'decimal:2',
        'fee_refunded' => 'decimal:2',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'processed_at' => 'datetime',
        'gateway_response' => 'array',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->refund_number)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->refund_number = sprintf('REF-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class);
    }

    public function reversalTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'reversal_transaction_id');
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function disputes(): HasMany
    {
        return $this->hasMany(PaymentDispute::class, 'refund_id');
    }
}
