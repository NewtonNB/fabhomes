<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MilestoneVerification extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'milestone_verifications';

    protected $fillable = [
        'uuid',
        'verification_number',
        'milestone_id',
        'project_id',
        'site_id',
        'unit_id',
        'title',
        'stage',
        'physical_completion_percentage',
        'work_quality_rating',
        'inspection_date',
        'inspection_notes',
        'site_engineer_id',
        'engineer_signed_at',
        'structural_checks_passed',
        'engineer_notes',
        'quantity_surveyor_id',
        'qs_signed_at',
        'qs_certified_amount',
        'boq_compliance_status',
        'qs_notes',
        'client_id',
        'client_user_id',
        'client_signed_at',
        'client_approval_status',
        'client_feedback',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'physical_completion_percentage' => 'decimal:2',
        'qs_certified_amount' => 'decimal:2',
        'structural_checks_passed' => 'boolean',
        'inspection_date' => 'date',
        'engineer_signed_at' => 'datetime',
        'qs_signed_at' => 'datetime',
        'client_signed_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($verification) {
            if (empty($verification->uuid)) {
                $verification->uuid = (string) Str::uuid();
            }

            if (empty($verification->verification_number)) {
                $verification->verification_number = static::generateVerificationNumber();
            }

            if (empty($verification->stage)) {
                $verification->stage = 'draft';
            }

            if (empty($verification->client_approval_status)) {
                $verification->client_approval_status = 'pending';
            }

            if (auth()->check() && empty($verification->created_by)) {
                $verification->created_by = auth()->id();
            }
        });

        static::updating(function ($verification) {
            if (auth()->check()) {
                $verification->updated_by = auth()->id();
            }
        });
    }

    /**
     * Generate unique verification number: MV-YYYYMMDD-XXXX
     */
    public static function generateVerificationNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $seq = $last ? intval(substr($last->verification_number, -4)) + 1 : 1;

        return 'MV-' . $date . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships
    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function siteEngineer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'site_engineer_id');
    }

    public function quantitySurveyor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'quantity_surveyor_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function clientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function paymentReleases(): HasMany
    {
        return $this->hasMany(MilestonePaymentRelease::class, 'milestone_verification_id');
    }

    public function paymentCertificates(): HasMany
    {
        return $this->hasMany(PaymentCertificate::class, 'milestone_verification_id');
    }

    public function progressPhotos(): HasMany
    {
        return $this->hasMany(MilestoneProgressPhoto::class, 'milestone_verification_id')->orderBy('captured_at');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Helper state checkers
    public function isDraft(): bool
    {
        return $this->stage === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->stage === 'submitted';
    }

    public function isEngineerVerified(): bool
    {
        return in_array($this->stage, ['engineer_verified', 'qs_verified', 'client_approved']);
    }

    public function isQsVerified(): bool
    {
        return in_array($this->stage, ['qs_verified', 'client_approved']);
    }

    public function isClientApproved(): bool
    {
        return $this->stage === 'client_approved';
    }

    public function isRejected(): bool
    {
        return $this->stage === 'rejected';
    }
}
