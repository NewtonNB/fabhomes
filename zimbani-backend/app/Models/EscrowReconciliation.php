<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EscrowReconciliation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'escrow_reconciliations';

    protected $fillable = [
        'uuid',
        'reconciliation_number',
        'savings_account_id',
        'project_id',
        'institution_name',
        'statement_reference',
        'statement_date',
        'statement_balance',
        'book_balance',
        'variance_amount',
        'currency',
        'matched_items_count',
        'unmatched_items_count',
        'status',
        'notes',
        'reconciled_by',
        'reconciled_at',
        'approved_by',
        'approved_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'statement_date' => 'date',
        'statement_balance' => 'decimal:2',
        'book_balance' => 'decimal:2',
        'variance_amount' => 'decimal:2',
        'matched_items_count' => 'integer',
        'unmatched_items_count' => 'integer',
        'reconciled_at' => 'datetime',
        'approved_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'is_balanced',
        'match_rate_percentage',
    ];

    protected static function booted(): void
    {
        static::creating(function ($rec) {
            if (empty($rec->uuid)) {
                $rec->uuid = (string) Str::uuid();
            }
            if (empty($rec->reconciliation_number)) {
                $rec->reconciliation_number = static::generateReconciliationNumber();
            }
        });
    }

    /**
     * Generate standard human-readable reconciliation number: ESC-REC-YYYYMMDD-XXXX
     */
    public static function generateReconciliationNumber(): string
    {
        $dateStr = now()->format('Ymd');
        $countToday = static::whereDate('created_at', now()->toDateString())->count();
        $sequence = str_pad($countToday + 1, 4, '0', STR_PAD_LEFT);
        return "ESC-REC-{$dateStr}-{$sequence}";
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // ==========================================
    // ACCESSORS
    // ==========================================

    public function getIsBalancedAttribute(): bool
    {
        return abs((float) $this->variance_amount) < 0.01;
    }

    public function getMatchRatePercentageAttribute(): float
    {
        $total = $this->matched_items_count + $this->unmatched_items_count;
        if ($total === 0) {
            return 100.00;
        }
        return round(($this->matched_items_count / $total) * 100, 1);
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

    public function items(): HasMany
    {
        return $this->hasMany(EscrowReconciliationItem::class, 'escrow_reconciliation_id');
    }

    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
