<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EscrowReconciliationItem extends Model
{
    use HasFactory;

    protected $table = 'escrow_reconciliation_items';

    protected $fillable = [
        'uuid',
        'escrow_reconciliation_id',
        'transaction_id',
        'milestone_payment_release_id',
        'item_type',
        'external_reference',
        'external_date',
        'statement_amount',
        'ledger_amount',
        'variance',
        'status',
        'notes',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'statement_amount' => 'decimal:2',
        'ledger_amount' => 'decimal:2',
        'variance' => 'decimal:2',
        'external_date' => 'date',
        'resolved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($item) {
            if (empty($item->uuid)) {
                $item->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(EscrowReconciliation::class, 'escrow_reconciliation_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }

    public function paymentRelease(): BelongsTo
    {
        return $this->belongsTo(MilestonePaymentRelease::class, 'milestone_payment_release_id');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
