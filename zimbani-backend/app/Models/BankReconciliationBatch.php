<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BankReconciliationBatch extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'bank_reconciliation_batches';

    protected $fillable = [
        'uuid',
        'batch_number',
        'bank_name',
        'account_number',
        'currency',
        'statement_period_start',
        'statement_period_end',
        'opening_balance',
        'closing_balance',
        'total_credits',
        'total_debits',
        'total_entries_count',
        'matched_entries_count',
        'unmatched_entries_count',
        'variance_amount',
        'status',
        'reconciled_by',
        'reconciled_at',
        'metadata',
    ];

    protected $casts = [
        'statement_period_start' => 'date',
        'statement_period_end' => 'date',
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'total_credits' => 'decimal:2',
        'total_debits' => 'decimal:2',
        'variance_amount' => 'decimal:2',
        'reconciled_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->batch_number)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->batch_number = sprintf('BNK-REC-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function entries(): HasMany
    {
        return $this->hasMany(BankStatementEntry::class, 'batch_id')->orderBy('value_date');
    }

    public function reconciledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
