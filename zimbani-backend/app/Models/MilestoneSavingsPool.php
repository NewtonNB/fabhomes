<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MilestoneSavingsPool extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'milestone_savings_pools';

    protected $fillable = [
        'uuid',
        'pool_code',
        'savings_account_id',
        'project_id',
        'construction_milestone_id',
        'tier_order',
        'milestone_name',
        'description',
        'target_amount',
        'allocated_amount',
        'locked_amount',
        'disbursed_amount',
        'currency',
        'weight_percentage',
        'status',
        'funded_at',
        'commenced_at',
        'completed_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'allocated_amount' => 'decimal:2',
        'locked_amount' => 'decimal:2',
        'disbursed_amount' => 'decimal:2',
        'weight_percentage' => 'decimal:2',
        'funded_at' => 'datetime',
        'commenced_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'funding_percentage',
        'remaining_to_target',
        'available_to_lock',
        'can_commence_work',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($pool) {
            if (empty($pool->uuid)) {
                $pool->uuid = (string) Str::uuid();
            }
            if (empty($pool->pool_code)) {
                $pool->pool_code = static::generatePoolCode();
            }
        });
    }

    public static function generatePoolCode(): string
    {
        $ym = now()->format('Ym');
        $last = static::withTrashed()
            ->where('pool_code', 'LIKE', "POOL-{$ym}-%")
            ->latest('id')
            ->first();

        $seq = $last ? (int) substr($last->pool_code, -4) + 1 : 1;
        return sprintf("POOL-%s-%04d", $ym, $seq);
    }

    // ==========================================
    // ACCESSORS
    // ==========================================

    public function getFundingPercentageAttribute(): float
    {
        if ($this->target_amount <= 0) {
            return 100.0;
        }
        $ratio = ($this->allocated_amount / $this->target_amount) * 100;
        return round(min(100.0, max(0.0, $ratio)), 1);
    }

    public function getRemainingToTargetAttribute(): float
    {
        return max(0.0, round((float) $this->target_amount - (float) $this->allocated_amount, 2));
    }

    public function getAvailableToLockAttribute(): float
    {
        return max(0.0, round((float) $this->allocated_amount - (float) $this->locked_amount - (float) $this->disbursed_amount, 2));
    }

    public function getCanCommenceWorkAttribute(): bool
    {
        // Must be fully funded or at least meet the scheme threshold
        return $this->allocated_amount >= $this->target_amount || $this->status === 'fully_funded' || $this->status === 'locked';
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function constructionMilestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'construction_milestone_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(SavingsPoolAllocation::class, 'milestone_savings_pool_id')->latest();
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
