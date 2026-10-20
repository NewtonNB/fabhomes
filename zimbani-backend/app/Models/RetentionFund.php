<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class RetentionFund extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'retention_funds';

    protected $fillable = [
        'uuid',
        'fund_number',
        'project_id',
        'unit_id',
        'contract_id',
        'client_id',
        'beneficiary_type',
        'beneficiary_name',
        'fund_type',
        'total_withheld_amount',
        'total_deductions_amount',
        'total_released_amount',
        'current_balance',
        'currency',
        'retention_rate',
        'status',
        'practical_completion_date',
        'dlp_commenced_at',
        'dlp_expiry_date',
        'dlp_period_days',
        'eligible_for_release',
        'cleared_for_release_at',
        'cleared_by',
        'notes',
    ];

    protected $casts = [
        'total_withheld_amount' => 'decimal:2',
        'total_deductions_amount' => 'decimal:2',
        'total_released_amount' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'retention_rate' => 'decimal:2',
        'practical_completion_date' => 'date',
        'dlp_commenced_at' => 'date',
        'dlp_expiry_date' => 'date',
        'eligible_for_release' => 'boolean',
        'cleared_for_release_at' => 'datetime',
    ];

    protected $appends = [
        'days_remaining_in_dlp',
        'is_dlp_matured',
        'release_rate_percentage',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($fund) {
            if (empty($fund->uuid)) {
                $fund->uuid = (string) Str::uuid();
            }
            if (empty($fund->fund_number)) {
                $fund->fund_number = static::generateFundNumber();
            }
        });
    }

    public static function generateFundNumber(): string
    {
        $prefix = 'RET-' . date('Ym');
        $latest = static::where('fund_number', 'like', "{$prefix}-%")
            ->orderBy('id', 'desc')
            ->value('fund_number');

        $nextSeq = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $m)) {
            $nextSeq = ((int) $m[1]) + 1;
        }

        return sprintf('%s-%04d', $prefix, $nextSeq);
    }

    /**
     * Number of days remaining in Defect Liability Period.
     */
    public function getDaysRemainingInDlpAttribute(): int
    {
        if (!$this->dlp_expiry_date) {
            return 0;
        }

        $now = Carbon::today();
        $expiry = Carbon::parse($this->dlp_expiry_date);

        if ($now->greaterThan($expiry)) {
            return 0;
        }

        return $now->diffInDays($expiry);
    }

    /**
     * Whether Defect Liability Period has matured (reached or passed expiry).
     */
    public function getIsDlpMaturedAttribute(): bool
    {
        if (!$this->dlp_expiry_date) {
            return false;
        }

        return Carbon::today()->greaterThanOrEqualTo(Carbon::parse($this->dlp_expiry_date));
    }

    /**
     * Percentage of retention released so far.
     */
    public function getReleaseRatePercentageAttribute(): float
    {
        $withheld = (float) $this->total_withheld_amount;
        if ($withheld <= 0) {
            return 0.0;
        }

        return round(((float) $this->total_released_amount / $withheld) * 100, 1);
    }

    // Relationships
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SubcontractorContract::class, 'contract_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function clearedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cleared_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(RetentionTransaction::class, 'retention_fund_id')->orderBy('id', 'desc');
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(DefectLiabilityCertificate::class, 'retention_fund_id')->orderBy('id', 'desc');
    }
}
