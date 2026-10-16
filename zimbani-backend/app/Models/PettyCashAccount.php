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

class PettyCashAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'account_number',
        'name',
        'project_id',
        'site_id',
        'custodian_id',
        'float_limit',
        'current_balance',
        'currency',
        'status',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'float_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($account) {
            if (empty($account->uuid)) {
                $account->uuid = (string) Str::uuid();
            }

            if (empty($account->account_number)) {
                $account->account_number = static::generateAccountNumber();
            }

            if (empty($account->currency)) {
                $account->currency = 'UGX';
            }

            if (empty($account->status)) {
                $account->status = 'active';
            }
        });
    }

    /**
     * Generate unique account sequence: PC-YYYYMMDD-XXXX
     */
    public static function generateAccountNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->account_number, -4)) + 1 : 1;

        return 'PC-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'custodian_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PettyCashTransaction::class, 'petty_cash_account_id')->latest();
    }

    public function expenseClaims(): HasMany
    {
        return $this->hasMany(ExpenseClaim::class, 'petty_cash_account_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // Single-entry Float Operations

    /**
     * Top-up / Replenish float atomically.
     */
    public function topUp(float $amount, string $description, ?string $referenceNumber = null, $user = null): PettyCashTransaction
    {
        return DB::transaction(function () use ($amount, $description, $referenceNumber, $user) {
            $this->lockForUpdate();
            $before = (float) $this->current_balance;
            $after = $before + $amount;
            $this->current_balance = $after;
            $this->save();

            $userId = $user instanceof User ? $user->id : ($user ?? auth()->id());

            return PettyCashTransaction::create([
                'petty_cash_account_id' => $this->id,
                'transaction_type' => $before == 0 ? 'initial_allocation' : 'replenishment',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'currency' => $this->currency,
                'reference_number' => $referenceNumber,
                'description' => $description,
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * Disburse an expense from this petty cash float.
     */
    public function disburse(float $amount, string $description, ?int $expenseClaimId = null, ?string $referenceNumber = null, $user = null): PettyCashTransaction
    {
        return DB::transaction(function () use ($amount, $description, $expenseClaimId, $referenceNumber, $user) {
            $this->lockForUpdate();
            $before = (float) $this->current_balance;
            if ($amount > $before) {
                throw new \InvalidArgumentException("Insufficient float balance. Current balance is UGX " . number_format($before, 2) . ", requested UGX " . number_format($amount, 2));
            }

            $after = $before - $amount;
            $this->current_balance = $after;
            $this->save();

            $userId = $user instanceof User ? $user->id : ($user ?? auth()->id());

            return PettyCashTransaction::create([
                'petty_cash_account_id' => $this->id,
                'transaction_type' => 'expense_disbursement',
                'amount' => -$amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'currency' => $this->currency,
                'expense_claim_id' => $expenseClaimId,
                'reference_number' => $referenceNumber,
                'description' => $description,
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * Return surplus float funds to treasury.
     */
    public function returnFunds(float $amount, string $reason, ?string $referenceNumber = null, $user = null): PettyCashTransaction
    {
        return DB::transaction(function () use ($amount, $reason, $referenceNumber, $user) {
            $this->lockForUpdate();
            $before = (float) $this->current_balance;
            if ($amount > $before) {
                throw new \InvalidArgumentException("Cannot return more than current float balance: UGX " . number_format($before, 2));
            }

            $after = $before - $amount;
            $this->current_balance = $after;
            $this->save();

            $userId = $user instanceof User ? $user->id : ($user ?? auth()->id());

            return PettyCashTransaction::create([
                'petty_cash_account_id' => $this->id,
                'transaction_type' => 'return_of_funds',
                'amount' => -$amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'currency' => $this->currency,
                'reference_number' => $referenceNumber,
                'description' => "Return of surplus float: {$reason}",
                'created_by' => $userId,
            ]);
        });
    }
}
