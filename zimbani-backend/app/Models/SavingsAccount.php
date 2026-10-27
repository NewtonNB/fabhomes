<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SavingsAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'account_number',
        'client_id',
        'account_type',
        'scheme_name',
        'group_code',
        'cohort_year',
        'package_code',
        'target_amount',
        'current_balance',
        'currency',
        'status',
        'opened_date',
        'target_date',
        'closed_date',
        'plot_id',
        'project_id',
        'construction_saving_scheme_id',
        'is_waterfall_allocation_enabled',
        'total_allocated_to_pools',
        'total_locked_in_pools',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'total_allocated_to_pools' => 'decimal:2',
        'total_locked_in_pools' => 'decimal:2',
        'is_waterfall_allocation_enabled' => 'boolean',
        'opened_date' => 'date',
        'target_date' => 'date',
        'closed_date' => 'date',
    ];

    protected $appends = [
        'progress_percentage',
        'remaining_amount',
        'unallocated_balance',
        'is_active',
        'is_completed',
        'is_suspended',
        'is_closed',
    ];

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($account) {
            if (empty($account->uuid)) {
                $account->uuid = (string) Str::uuid();
            }

            if (empty($account->account_number)) {
                $account->account_number = static::generateAccountNumber();
            }

            if (empty($account->opened_date)) {
                $account->opened_date = now()->toDateString();
            }
        });
    }

    /**
     * Generate unique account number: SACC-YYYYMMDD-XXXX
     */
    public static function generateAccountNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::withTrashed()
            ->whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $last ? intval(substr($last->account_number, -4)) + 1 : 1;

        return 'SACC-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    // ==========================================
    // ACCESSORS
    // ==========================================

    public function getProgressPercentageAttribute(): float
    {
        if ($this->target_amount <= 0) {
            return 0.0;
        }

        $percentage = ($this->current_balance / $this->target_amount) * 100;
        return round(min(100.0, max(0.0, $percentage)), 1);
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0.0, (float) $this->target_amount - (float) $this->current_balance);
    }

    public function getUnallocatedBalanceAttribute(): float
    {
        return max(0.0, round((float) $this->current_balance - (float) $this->total_allocated_to_pools, 2));
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'active';
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }

    public function getIsSuspendedAttribute(): bool
    {
        return $this->status === 'suspended';
    }

    public function getIsClosedAttribute(): bool
    {
        return $this->status === 'closed';
    }

    // ==========================================
    // LIFECYCLE / STATE TRANSITIONS
    // ==========================================

    public function activate(): bool
    {
        $this->status = 'active';
        return $this->save();
    }

    public function suspend(?string $reason = null): bool
    {
        $this->status = 'suspended';
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "[Suspended on " . now()->toDateTimeString() . "]: " . $reason;
        }
        return $this->save();
    }

    public function close(?string $notes = null): bool
    {
        $this->status = 'closed';
        $this->closed_date = now()->toDateString();
        if ($notes) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "[Closed on " . now()->toDateTimeString() . "]: " . $notes;
        }
        return $this->save();
    }

    public function adjustBalance(float $newBalance, ?string $reason = null, ?int $userId = null): bool
    {
        $oldBalance = $this->current_balance;
        $this->current_balance = $newBalance;
        $this->updated_by = $userId ?? auth()->id();

        // Auto-complete if target reached
        if ($this->current_balance >= $this->target_amount && $this->status === 'active') {
            $this->status = 'completed';
        }

        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') .
                "[Balance Adjustment: " . number_format($oldBalance, 2) . " -> " . number_format($newBalance, 2) . "]: " . $reason;
        }

        return $this->save();
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeLandSaving($query)
    {
        return $query->where('account_type', 'land_saving');
    }

    public function scopeConstructionSaving($query)
    {
        return $query->where('account_type', 'construction_saving');
    }

    public function scopeForClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function plot(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'plot_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'savings_account_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'account_id')->latest('transaction_date');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function escrowReconciliations(): HasMany
    {
        return $this->hasMany(EscrowReconciliation::class, 'savings_account_id');
    }

    public function milestoneTriggerLogs(): HasMany
    {
        return $this->hasMany(MilestoneTriggerLog::class, 'savings_account_id');
    }

    public function constructionScheme(): BelongsTo
    {
        return $this->belongsTo(ConstructionSavingScheme::class, 'construction_saving_scheme_id');
    }

    public function milestonePools(): HasMany
    {
        return $this->hasMany(MilestoneSavingsPool::class, 'savings_account_id')->orderBy('tier_order');
    }

    public function poolAllocations(): HasMany
    {
        return $this->hasMany(SavingsPoolAllocation::class, 'savings_account_id')->latest();
    }
}
