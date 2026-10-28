<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class OtherFee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'fee_number',
        'client_id',
        'category_code',
        'category_name',
        'site_id',
        'unit_id',
        'savings_account_id',
        'title',
        'description',
        'amount',
        'amount_paid',
        'balance_due',
        'status',
        'due_date',
        'paid_at',
        'payment_method',
        'payment_reference',
        'receipt_number',
        'recorded_by',
        'approved_by',
        'waiver_reason',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'due_date' => 'date',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function ($fee) {
            if (empty($fee->uuid)) {
                $fee->uuid = (string) Str::uuid();
            }
            if (empty($fee->fee_number)) {
                $count = static::withTrashed()->count() + 1;
                $fee->fee_number = 'FEE-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
            if ($fee->balance_due === null) {
                $fee->balance_due = max(0, (float)$fee->amount - (float)$fee->amount_paid);
            }
            if (empty($fee->status)) {
                $fee->status = 'pending';
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
