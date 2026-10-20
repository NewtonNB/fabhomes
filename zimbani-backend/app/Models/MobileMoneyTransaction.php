<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MobileMoneyTransaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mobile_money_transactions';

    protected $fillable = [
        'uuid',
        'transaction_reference',
        'external_reference',
        'provider',
        'transaction_type',
        'phone_number',
        'payer_or_payee_name',
        'amount',
        'fee_amount',
        'net_amount',
        'currency',
        'status',
        'failure_reason',
        'purpose',
        'client_id',
        'savings_account_id',
        'milestone_savings_pool_id',
        'payment_id',
        'payment_certificate_id',
        'milestone_payment_release_id',
        'petty_cash_account_id',
        'ledger_transaction_id',
        'initiated_by',
        'authorized_by',
        'initiated_at',
        'completed_at',
        'request_payload',
        'response_payload',
        'callback_payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'initiated_at' => 'datetime',
        'completed_at' => 'datetime',
        'request_payload' => 'array',
        'response_payload' => 'array',
        'callback_payload' => 'array',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($tx) {
            if (empty($tx->uuid)) {
                $tx->uuid = (string) Str::uuid();
            }
            if (empty($tx->transaction_reference)) {
                $tx->transaction_reference = static::generateReference($tx->transaction_type ?? 'c2b_collection');
            }
            if (empty($tx->initiated_at)) {
                $tx->initiated_at = now();
            }
            if (!isset($tx->net_amount)) {
                $tx->net_amount = (float) $tx->amount - (float) ($tx->fee_amount ?? 0);
            }
        });
    }

    public static function generateReference(string $type = 'c2b_collection'): string
    {
        $prefix = $type === 'b2c_disbursement' ? 'DISB' : 'MOMO';
        $ymd = now()->format('Ymd');
        $random = strtoupper(Str::random(4));

        return sprintf("%s-%s-%s", $prefix, $ymd, $random);
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function milestonePool(): BelongsTo
    {
        return $this->belongsTo(MilestoneSavingsPool::class, 'milestone_savings_pool_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function paymentCertificate(): BelongsTo
    {
        return $this->belongsTo(PaymentCertificate::class, 'payment_certificate_id');
    }

    public function milestonePaymentRelease(): BelongsTo
    {
        return $this->belongsTo(MilestonePaymentRelease::class, 'milestone_payment_release_id');
    }

    public function pettyCashAccount(): BelongsTo
    {
        return $this->belongsTo(PettyCashAccount::class, 'petty_cash_account_id');
    }

    public function ledgerTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'ledger_transaction_id');
    }

    public function initiatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    public function authorizedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    public function webhookLogs(): HasMany
    {
        return $this->hasMany(PaymentWebhookLog::class, 'mobile_money_transaction_id');
    }
}
