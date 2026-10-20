<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RetentionTransaction extends Model
{
    use HasFactory;

    protected $table = 'retention_transactions';

    protected $fillable = [
        'uuid',
        'retention_fund_id',
        'defect_liability_certificate_id',
        'payment_certificate_id',
        'milestone_payment_release_id',
        'ledger_transaction_id',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_number',
        'description',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'processed_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($txn) {
            if (empty($txn->uuid)) {
                $txn->uuid = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function retentionFund(): BelongsTo
    {
        return $this->belongsTo(RetentionFund::class, 'retention_fund_id');
    }

    public function defectCertificate(): BelongsTo
    {
        return $this->belongsTo(DefectLiabilityCertificate::class, 'defect_liability_certificate_id');
    }

    public function paymentCertificate(): BelongsTo
    {
        return $this->belongsTo(PaymentCertificate::class, 'payment_certificate_id');
    }

    public function milestonePaymentRelease(): BelongsTo
    {
        return $this->belongsTo(MilestonePaymentRelease::class, 'milestone_payment_release_id');
    }

    public function ledgerTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'ledger_transaction_id');
    }

    public function processedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
