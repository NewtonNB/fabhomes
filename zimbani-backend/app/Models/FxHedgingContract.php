<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FxHedgingContract extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'fx_hedging_contracts';

    protected $fillable = [
        'uuid',
        'contract_number',
        'client_id',
        'savings_account_id',
        'milestone_savings_pool_id',
        'base_currency',
        'target_currency',
        'locked_exchange_rate',
        'committed_amount_foreign',
        'guaranteed_amount_local',
        'utilized_amount_foreign',
        'utilized_amount_local',
        'effective_date',
        'expiry_date',
        'status',
        'premium_fee_percentage',
        'premium_fee_amount',
        'notes',
        'approved_by',
    ];

    protected $casts = [
        'locked_exchange_rate' => 'decimal:6',
        'committed_amount_foreign' => 'decimal:2',
        'guaranteed_amount_local' => 'decimal:2',
        'utilized_amount_foreign' => 'decimal:2',
        'utilized_amount_local' => 'decimal:2',
        'premium_fee_percentage' => 'decimal:2',
        'premium_fee_amount' => 'decimal:2',
        'effective_date' => 'date',
        'expiry_date' => 'date',
    ];

    protected $appends = [
        'remaining_foreign_amount',
        'remaining_local_amount',
        'utilization_percentage',
        'is_expired',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->contract_number)) {
                $prefix = 'HEDGE-' . now()->format('Ym') . '-';
                $count = static::withTrashed()->where('contract_number', 'like', "{$prefix}%")->count();
                $model->contract_number = sprintf('%s%04d', $prefix, $count + 1);
            }
            if (empty($model->approved_by) && auth()->check()) {
                $model->approved_by = auth()->id();
            }
        });
    }

    // Accessors
    public function getRemainingForeignAmountAttribute(): float
    {
        return max(0.0, (float) $this->committed_amount_foreign - (float) $this->utilized_amount_foreign);
    }

    public function getRemainingLocalAmountAttribute(): float
    {
        return max(0.0, (float) $this->guaranteed_amount_local - (float) $this->utilized_amount_local);
    }

    public function getUtilizationPercentageAttribute(): float
    {
        if ((float) $this->committed_amount_foreign <= 0) {
            return 0.0;
        }
        return round(((float) $this->utilized_amount_foreign / (float) $this->committed_amount_foreign) * 100, 2);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date ? now()->toDateString() > $this->expiry_date->toDateString() : false;
    }

    // Relationships
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function milestoneSavingsPool(): BelongsTo
    {
        return $this->belongsTo(MilestoneSavingsPool::class, 'milestone_savings_pool_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
