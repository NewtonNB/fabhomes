<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Transaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'transaction_number',
        'account_id',
        'client_id',
        'payment_id',
        'related_transaction_id',
        'transaction_type',
        'amount',
        'currency',
        'balance_before',
        'balance_after',
        'description',
        'narration',
        'reference_number',
        'transaction_date',
        'value_date',
        'status',
        'reversed_at',
        'reversed_by',
        'reversal_reason',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'datetime',
        'value_date' => 'date',
        'reversed_at' => 'datetime',
    ];

    protected $appends = [
        'is_credit',
        'is_debit',
        'is_reversed',
    ];

    protected static function booted()
    {
        static::creating(function ($transaction) {
            if (empty($transaction->uuid)) {
                $transaction->uuid = (string) Str::uuid();
            }

            if (empty($transaction->transaction_number)) {
                $transaction->transaction_number = static::generateTransactionNumber();
            }

            if (empty($transaction->transaction_date)) {
                $transaction->transaction_date = now();
            }

            if (empty($transaction->value_date)) {
                $transaction->value_date = now()->toDateString();
            }

            if (empty($transaction->currency)) {
                $transaction->currency = 'UGX';
            }

            if (empty($transaction->status)) {
                $transaction->status = 'posted';
            }
        });
    }

    /**
     * Generate unique transaction number: TXN-YYYYMMDD-XXXX
     */
    public static function generateTransactionNumber(): string
    {
        $date = now()->format('Ymd');
        $lastTxn = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastTxn ? intval(substr($lastTxn->transaction_number, -4)) + 1 : 1;

        return 'TXN-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'account_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function relatedTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'related_transaction_id');
    }

    public function reversals(): HasMany
    {
        return $this->hasMany(Transaction::class, 'related_transaction_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // Scopes

    public function scopePosted($query)
    {
        return $query->where('status', 'posted');
    }

    public function scopeReversed($query)
    {
        return $query->where('status', 'reversed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForAccount($query, $accountId)
    {
        return $query->where('account_id', $accountId);
    }

    public function scopeForClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('transaction_date', [$from, $to]);
    }

    // Accessors

    public function getIsCreditAttribute(): bool
    {
        return (float) $this->amount > 0;
    }

    public function getIsDebitAttribute(): bool
    {
        return (float) $this->amount < 0;
    }

    public function getIsReversedAttribute(): bool
    {
        return $this->status === 'reversed';
    }

    public function canBeReversed(): bool
    {
        return $this->status === 'posted';
    }

    /**
     * Atomically record a transaction and adjust account balance if applicable.
     */
    public static function record(array $data): self
    {
        return DB::transaction(function () use ($data) {
            $accountId = $data['account_id'] ?? null;
            $balanceBefore = 0.00;
            $balanceAfter = 0.00;

            if ($accountId) {
                $account = SavingsAccount::where('id', $accountId)->lockForUpdate()->firstOrFail();
                $balanceBefore = (float) $account->current_balance;
                $balanceAfter = $balanceBefore + (float) $data['amount'];

                if ($balanceAfter < 0) {
                    throw new \InvalidArgumentException("Transaction would result in negative account balance (Current: {$balanceBefore}, Delta: {$data['amount']}).");
                }

                $account->current_balance = $balanceAfter;

                // Auto-complete if target reached
                if ($balanceAfter >= (float) $account->target_amount && $account->status === 'active') {
                    $account->status = 'completed';
                }

                $account->save();
            }

            $transaction = static::create([
                'account_id' => $accountId,
                'client_id' => $data['client_id'],
                'payment_id' => $data['payment_id'] ?? null,
                'related_transaction_id' => $data['related_transaction_id'] ?? null,
                'transaction_type' => $data['transaction_type'],
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'UGX',
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'description' => $data['description'],
                'narration' => $data['narration'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'transaction_date' => $data['transaction_date'] ?? now(),
                'value_date' => $data['value_date'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'posted',
                'created_by' => $data['created_by'] ?? auth()->id(),
            ]);

            return $transaction;
        });
    }

    /**
     * Reverse this posted transaction in compliance with immutable ledger principles.
     */
    public function reverse(int $reversedBy, string $reason): self
    {
        if (!$this->canBeReversed()) {
            throw new \DomainException("Only posted transactions can be reversed. Current status: {$this->status}");
        }

        return DB::transaction(function () use ($reversedBy, $reason) {
            $reversalAmount = -1 * (float) $this->amount;
            $balanceBefore = 0.00;
            $balanceAfter = 0.00;

            if ($this->account_id) {
                $account = SavingsAccount::where('id', $this->account_id)->lockForUpdate()->firstOrFail();
                $balanceBefore = (float) $account->current_balance;
                $balanceAfter = $balanceBefore + $reversalAmount;

                if ($balanceAfter < 0) {
                    throw new \InvalidArgumentException("Reversal would result in negative account balance ({$balanceAfter}).");
                }

                $account->current_balance = $balanceAfter;

                // Reopen account if balance dropped below target and was completed
                if ($balanceAfter < (float) $account->target_amount && $account->status === 'completed') {
                    $account->status = 'active';
                }

                $account->save();
            }

            // Create Reversal Transaction
            $reversalTxn = static::create([
                'account_id' => $this->account_id,
                'client_id' => $this->client_id,
                'payment_id' => $this->payment_id,
                'related_transaction_id' => $this->id,
                'transaction_type' => 'reversal',
                'amount' => $reversalAmount,
                'currency' => $this->currency,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'description' => "Reversal of {$this->transaction_number}: {$reason}",
                'narration' => $reason,
                'reference_number' => $this->transaction_number,
                'transaction_date' => now(),
                'value_date' => now()->toDateString(),
                'status' => 'posted',
                'created_by' => $reversedBy,
            ]);

            // Mark Original Transaction as Reversed
            $this->status = 'reversed';
            $this->reversed_at = now();
            $this->reversed_by = $reversedBy;
            $this->reversal_reason = $reason;
            $this->save();

            return $reversalTxn;
        });
    }
}
