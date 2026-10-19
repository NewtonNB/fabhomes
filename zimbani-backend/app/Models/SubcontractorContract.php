<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorContract extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'contract_number',
        'title',
        'subcontractor_name',
        'subcontractor_contact_person',
        'subcontractor_phone',
        'subcontractor_email',
        'tax_identification_number',
        'project_id',
        'site_id',
        'trade_category',
        'scope_of_work',
        'contract_sum',
        'currency',
        'retention_percentage',
        'retention_amount',
        'start_date',
        'expected_completion_date',
        'actual_completion_date',
        'payment_terms',
        'status',
        'signed_at',
        'signed_by',
        'approved_at',
        'approved_by',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'contract_sum' => 'decimal:2',
        'retention_percentage' => 'decimal:2',
        'retention_amount' => 'decimal:2',
        'start_date' => 'date',
        'expected_completion_date' => 'date',
        'actual_completion_date' => 'date',
        'signed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'total_certified_gross',
        'total_retention_held',
        'total_net_payable',
        'total_paid',
        'remaining_balance',
        'percentage_completed',
    ];

    protected static function booted()
    {
        static::creating(function ($contract) {
            if (empty($contract->uuid)) {
                $contract->uuid = (string) Str::uuid();
            }

            if (empty($contract->contract_number)) {
                $contract->contract_number = static::generateContractNumber();
            }

            if (empty($contract->currency)) {
                $contract->currency = 'UGX';
            }

            if (empty($contract->status)) {
                $contract->status = 'draft';
            }

            $rate = (float) ($contract->retention_percentage ?? 5.00);
            $sum = (float) ($contract->contract_sum ?? 0.00);
            $contract->retention_amount = round($sum * ($rate / 100), 2);
        });

        static::updating(function ($contract) {
            if ($contract->isDirty(['contract_sum', 'retention_percentage'])) {
                $rate = (float) ($contract->retention_percentage ?? 5.00);
                $sum = (float) ($contract->contract_sum ?? 0.00);
                $contract->retention_amount = round($sum * ($rate / 100), 2);
            }
        });
    }

    /**
     * Generate unique contract number: CNT-YYYYMMDD-XXXX
     */
    public static function generateContractNumber(): string
    {
        $date = now()->format('Ymd');
        $lastContract = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastContract ? intval(substr($lastContract->contract_number, -4)) + 1 : 1;

        return 'CNT-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function signedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_by');
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

    public function paymentCertificates(): HasMany
    {
        return $this->hasMany(PaymentCertificate::class, 'contract_id')->latest('valuation_date');
    }

    public function contractMilestones(): HasMany
    {
        return $this->hasMany(ContractMilestone::class, 'contract_id');
    }

    public function milestones(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(ConstructionMilestone::class, 'contract_milestones', 'contract_id', 'milestone_id')
            ->withPivot(['uuid', 'allocated_amount', 'weight_percentage', 'status', 'certified_amount', 'paid_amount', 'notes'])
            ->withTimestamps();
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeForSite($query, $siteId)
    {
        return $query->where('site_id', $siteId);
    }

    public function scopeByTrade($query, $trade)
    {
        return $query->where('trade_category', $trade);
    }

    // Accessors

    public function getTotalCertifiedGrossAttribute(): float
    {
        return (float) $this->paymentCertificates()
            ->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])
            ->sum('current_gross_amount');
    }

    public function getTotalRetentionHeldAttribute(): float
    {
        return (float) $this->paymentCertificates()
            ->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])
            ->sum('retention_deducted');
    }

    public function getTotalNetPayableAttribute(): float
    {
        return (float) $this->paymentCertificates()
            ->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])
            ->sum('net_certified_amount');
    }

    public function getTotalPaidAttribute(): float
    {
        return (float) $this->paymentCertificates()
            ->where('status', 'paid')
            ->sum('net_certified_amount');
    }

    public function getRemainingBalanceAttribute(): float
    {
        $certified = $this->total_certified_gross;
        return max(0.0, (float) $this->contract_sum - $certified);
    }

    public function getPercentageCompletedAttribute(): float
    {
        $sum = (float) $this->contract_sum;
        if ($sum <= 0) return 0.0;
        return round(($this->total_certified_gross / $sum) * 100, 2);
    }

    // Lifecycle methods

    public function activate($user = null): bool
    {
        $userId = $user instanceof User ? $user->id : ($user ?? auth()->id());
        $this->status = 'active';
        $this->signed_at = now();
        $this->signed_by = $userId;
        return $this->save();
    }

    public function approve($user = null): bool
    {
        $userId = $user instanceof User ? $user->id : ($user ?? auth()->id());
        $this->status = 'active';
        $this->approved_at = now();
        $this->approved_by = $userId;
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

    public function complete(): bool
    {
        $this->status = 'completed';
        $this->actual_completion_date = now()->toDateString();
        return $this->save();
    }

    public function terminate(?string $reason = null): bool
    {
        $this->status = 'terminated';
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "[Terminated on " . now()->toDateTimeString() . "]: " . $reason;
        }
        return $this->save();
    }
}
