<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PettyCashTransaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'transaction_number',
        'petty_cash_account_id',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'currency',
        'expense_claim_id',
        'reference_number',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($txn) {
            if (empty($txn->uuid)) {
                $txn->uuid = (string) Str::uuid();
            }

            if (empty($txn->transaction_number)) {
                $txn->transaction_number = static::generateTransactionNumber();
            }

            if (empty($txn->currency)) {
                $txn->currency = 'UGX';
            }
        });
    }

    /**
     * Generate unique sequence: PCT-YYYYMMDD-XXXX
     */
    public static function generateTransactionNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->transaction_number, -4)) + 1 : 1;

        return 'PCT-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function pettyCashAccount(): BelongsTo
    {
        return $this->belongsTo(PettyCashAccount::class);
    }

    public function expenseClaim(): BelongsTo
    {
        return $this->belongsTo(ExpenseClaim::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
