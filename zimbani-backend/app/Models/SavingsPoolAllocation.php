<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SavingsPoolAllocation extends Model
{
    use HasFactory;

    protected $table = 'savings_pool_allocations';

    protected $fillable = [
        'uuid',
        'savings_account_id',
        'milestone_savings_pool_id',
        'payment_id',
        'milestone_payment_release_id',
        'source_pool_id',
        'allocation_type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_number',
        'notes',
        'allocated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($allocation) {
            if (empty($allocation->uuid)) {
                $allocation->uuid = (string) Str::uuid();
            }
            if (empty($allocation->reference_number)) {
                $allocation->reference_number = static::generateReferenceNumber($allocation->allocation_type ?? 'deposit_allocation');
            }
        });
    }

    public static function generateReferenceNumber(string $type = 'deposit_allocation'): string
    {
        $prefix = match ($type) {
            'manual_rebalance' => 'REB',
            'escrow_lock' => 'LCK',
            'milestone_disbursement' => 'DIS',
            'refund_unlock' => 'UNL',
            default => 'ALC',
        };

        $ymd = now()->format('Ymd');
        $random = strtoupper(Str::random(4));
        return sprintf("%s-%s-%s", $prefix, $ymd, $random);
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function milestonePool(): BelongsTo
    {
        return $this->belongsTo(MilestoneSavingsPool::class, 'milestone_savings_pool_id');
    }

    public function sourcePool(): BelongsTo
    {
        return $this->belongsTo(MilestoneSavingsPool::class, 'source_pool_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function milestonePaymentRelease(): BelongsTo
    {
        return $this->belongsTo(MilestonePaymentRelease::class, 'milestone_payment_release_id');
    }

    public function allocatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }
}
