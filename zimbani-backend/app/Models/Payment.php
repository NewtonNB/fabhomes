<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'payment_number',
        'reference_number',
        'unit_id',
        'client_id',
        'savings_account_id',
        'processed_by',
        'payment_type',
        'payment_method',
        'status',
        'amount',
        'currency',
        'penalty_amount',
        'discount_amount',
        'total_amount',
        'payment_date',
        'due_date',
        'confirmed_at_date',
        'confirmed_by',
        'bank_name',
        'bank_account',
        'transaction_id',
        'check_number',
        'mobile_money_number',
        'notes',
        'receipt_path',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'penalty_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_date' => 'date',
        'due_date' => 'date',
        'confirmed_at_date' => 'date',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            if (empty($payment->uuid)) {
                $payment->uuid = (string) Str::uuid();
            }

            if (empty($payment->payment_number)) {
                $payment->payment_number = static::generatePaymentNumber();
            }

            // Calculate total amount
            $payment->total_amount = $payment->amount 
                + ($payment->penalty_amount ?? 0) 
                - ($payment->discount_amount ?? 0);
        });

        static::updating(function ($payment) {
            // Recalculate total amount if financial fields change
            if ($payment->isDirty(['amount', 'penalty_amount', 'discount_amount'])) {
                $payment->total_amount = $payment->amount 
                    + ($payment->penalty_amount ?? 0) 
                    - ($payment->discount_amount ?? 0);
            }
        });
    }

    /**
     * Generate unique payment number: PAY-YYYYMMDD-XXXX
     */
    public static function generatePaymentNumber(): string
    {
        $date = now()->format('Ymd');
        $lastPayment = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastPayment ? intval(substr($lastPayment->payment_number, -4)) + 1 : 1;

        return 'PAY-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function transactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Transaction::class, 'payment_id')->latest('transaction_date');
    }

    public function refunds(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PaymentRefund::class, 'payment_id');
    }

    public function disputes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PaymentDispute::class, 'payment_id');
    }

    // Scopes

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForUnit($query, $unitId)
    {
        return $query->where('unit_id', $unitId);
    }

    public function scopeForClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('payment_type', $type);
    }

    public function scopeByMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    public function scopeOverdue($query)
    {
        return $query->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->whereIn('status', ['pending']);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('payment_date', [$from, $to]);
    }

    // Helper Methods

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function isVerified(): bool
    {
        return $this->status === 'verified';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && $this->isPending();
    }

    public function canBeConfirmed(): bool
    {
        return in_array($this->status, ['pending']);
    }

    public function canBeRejected(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    public function canBeRefunded(): bool
    {
        return in_array($this->status, ['confirmed', 'verified']);
    }

    public function confirm(?int $confirmedBy = null): bool
    {
        if (!$this->canBeConfirmed()) {
            return false;
        }

        $this->status = 'confirmed';
        $this->confirmed_at_date = now();
        $this->confirmed_by = $confirmedBy ?? auth()->id();

        return $this->save();
    }

    public function verify(): bool
    {
        if ($this->status !== 'confirmed') {
            return false;
        }

        $this->status = 'verified';
        return $this->save();
    }

    public function reject(): bool
    {
        if (!$this->canBeRejected()) {
            return false;
        }

        $this->status = 'rejected';
        return $this->save();
    }

    public function refund(): bool
    {
        if (!$this->canBeRefunded()) {
            return false;
        }

        $this->status = 'refunded';
        return $this->save();
    }

    public function cancel(): bool
    {
        if (!in_array($this->status, ['pending'])) {
            return false;
        }

        $this->status = 'cancelled';
        return $this->save();
    }

    // Computed Attributes

    public function getDaysOverdueAttribute(): ?int
    {
        if (!$this->isOverdue()) {
            return null;
        }

        return now()->diffInDays($this->due_date, false);
    }

    public function getHasPenaltyAttribute(): bool
    {
        return $this->penalty_amount > 0;
    }

    public function getHasDiscountAttribute(): bool
    {
        return $this->discount_amount > 0;
    }
}
