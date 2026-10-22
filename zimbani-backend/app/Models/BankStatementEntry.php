<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BankStatementEntry extends Model
{
    use HasFactory;

    protected $table = 'bank_statement_entries';

    protected $fillable = [
        'uuid',
        'batch_id',
        'entry_reference',
        'bank_transaction_id',
        'value_date',
        'booking_date',
        'narration',
        'entry_type',
        'amount',
        'currency',
        'running_balance',
        'matching_status',
        'match_confidence_score',
        'matched_payment_id',
        'matched_payment_intent_id',
        'matched_transaction_id',
        'matching_rule',
        'discrepancy_notes',
    ];

    protected $casts = [
        'value_date' => 'date',
        'booking_date' => 'date',
        'amount' => 'decimal:2',
        'running_balance' => 'decimal:2',
        'match_confidence_score' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->entry_reference)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->entry_reference = sprintf('STMT-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(BankReconciliationBatch::class, 'batch_id');
    }

    public function matchedPayment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'matched_payment_id');
    }

    public function matchedPaymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'matched_payment_intent_id');
    }

    public function matchedTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'matched_transaction_id');
    }
}
