<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentCertificate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'certificate_number',
        'contract_id',
        'project_id',
        'site_id',
        'milestone_id',
        'milestone_verification_id',
        'physical_completion_percentage',
        'boq_compliance_status',
        'qs_valuation_reference',
        'valuation_period_start',
        'valuation_period_end',
        'valuation_date',
        'certificate_type',
        'gross_amount',
        'previous_gross_amount',
        'current_gross_amount',
        'materials_on_site_value',
        'retention_rate',
        'retention_deducted',
        'withholding_tax_rate',
        'withholding_tax_amount',
        'other_deductions',
        'net_certified_amount',
        'currency',
        'description',
        'measurement_sheet_summary',
        'status',
        'site_manager_id',
        'site_manager_signed_at',
        'site_manager_notes',
        'finance_officer_id',
        'finance_officer_approved_at',
        'finance_officer_notes',
        'admin_id',
        'admin_authorized_at',
        'admin_notes',
        'paid_at',
        'paid_by',
        'payment_reference',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'previous_gross_amount' => 'decimal:2',
        'current_gross_amount' => 'decimal:2',
        'materials_on_site_value' => 'decimal:2',
        'retention_rate' => 'decimal:2',
        'retention_deducted' => 'decimal:2',
        'withholding_tax_rate' => 'decimal:2',
        'withholding_tax_amount' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'net_certified_amount' => 'decimal:2',
        'physical_completion_percentage' => 'decimal:2',
        'valuation_period_start' => 'date',
        'valuation_period_end' => 'date',
        'valuation_date' => 'date',
        'site_manager_signed_at' => 'datetime',
        'finance_officer_approved_at' => 'datetime',
        'admin_authorized_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($certificate) {
            if (empty($certificate->uuid)) {
                $certificate->uuid = (string) Str::uuid();
            }

            if (empty($certificate->certificate_number)) {
                $certificate->certificate_number = static::generateCertificateNumber();
            }

            if (empty($certificate->currency)) {
                $certificate->currency = 'UGX';
            }

            if (empty($certificate->status)) {
                $certificate->status = 'draft';
            }

            if (empty($certificate->certificate_type)) {
                $certificate->certificate_type = 'interim';
            }

            static::calculateCertificateFinancials($certificate);
        });

        static::updating(function ($certificate) {
            static::calculateCertificateFinancials($certificate);
        });
    }

    /**
     * Automatically compute current gross, retention, withholding tax, and net payable.
     */
    protected static function calculateCertificateFinancials($certificate): void
    {
        $gross = (float) ($certificate->gross_amount ?? 0.00);
        $prevGross = (float) ($certificate->previous_gross_amount ?? 0.00);
        $currentGross = max(0.0, $gross - $prevGross);
        $certificate->current_gross_amount = $currentGross;

        $matValue = (float) ($certificate->materials_on_site_value ?? 0.00);
        $subtotal = $currentGross + $matValue;

        $retRate = (float) ($certificate->retention_rate ?? 5.00);
        $retAmount = round($subtotal * ($retRate / 100), 2);
        $certificate->retention_deducted = $retAmount;

        $whtRate = (float) ($certificate->withholding_tax_rate ?? 6.00);
        $whtAmount = round($subtotal * ($whtRate / 100), 2);
        $certificate->withholding_tax_amount = $whtAmount;

        $other = (float) ($certificate->other_deductions ?? 0.00);
        $net = max(0.0, $subtotal - $retAmount - $whtAmount - $other);
        $certificate->net_certified_amount = $net;
    }

    /**
     * Generate unique certificate number: CERT-YYYYMMDD-XXXX
     */
    public static function generateCertificateNumber(): string
    {
        $date = now()->format('Ymd');
        $lastCert = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastCert ? intval(substr($lastCert->certificate_number, -4)) + 1 : 1;

        return 'CERT-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SubcontractorContract::class, 'contract_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    public function milestoneVerification(): BelongsTo
    {
        return $this->belongsTo(MilestoneVerification::class, 'milestone_verification_id');
    }

    public function siteManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'site_manager_id');
    }

    public function financeOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finance_officer_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // Scopes

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified_by_site_manager');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved_by_finance');
    }

    public function scopeAuthorized($query)
    {
        return $query->where('status', 'authorized_by_admin');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeForContract($query, $contractId)
    {
        return $query->where('contract_id', $contractId);
    }

    // Multi-Tier Workflow Methods

    public function submit(): bool
    {
        $this->status = 'submitted';
        return $this->save();
    }

    public function verifySiteManager($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'verified_by_site_manager';
        $this->site_manager_id = $userId;
        $this->site_manager_signed_at = now();
        $this->site_manager_notes = $notes;
        return $this->save();
    }

    public function approveFinance($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'approved_by_finance';
        $this->finance_officer_id = $userId;
        $this->finance_officer_approved_at = now();
        $this->finance_officer_notes = $notes;
        return $this->save();
    }

    public function authorizeAdmin($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'authorized_by_admin';
        $this->admin_id = $userId;
        $this->admin_authorized_at = now();
        $this->admin_notes = $notes;
        return $this->save();
    }

    public function markPaid($user, ?string $reference = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'paid';
        $this->paid_by = $userId;
        $this->paid_at = now();
        $this->payment_reference = $reference;
        return $this->save();
    }

    public function reject($user, string $reason): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'rejected';
        $this->rejection_reason = $reason . " (Rejected by User #{$userId} on " . now()->toDateTimeString() . ")";
        return $this->save();
    }
}
