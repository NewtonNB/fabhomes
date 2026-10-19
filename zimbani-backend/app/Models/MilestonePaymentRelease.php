<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MilestonePaymentRelease extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'milestone_payment_releases';

    protected $fillable = [
        'uuid',
        'release_number',
        'milestone_verification_id',
        'milestone_id',
        'project_id',
        'site_id',
        'unit_id',
        'client_id',
        'savings_account_id',
        'source_type',
        'gross_amount',
        'retention_percentage',
        'retention_amount',
        'net_release_amount',
        'currency',
        'status',
        'authorized_by',
        'authorized_at',
        'authorization_notes',
        'disbursed_by',
        'disbursed_at',
        'payment_method',
        'disbursement_reference',
        'transaction_id',
        'payment_id',
        'retention_released_at',
        'retention_released_by',
        'retention_transaction_id',
        'retention_notes',
        'notes',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'retention_percentage' => 'decimal:2',
        'retention_amount' => 'decimal:2',
        'net_release_amount' => 'decimal:2',
        'authorized_at' => 'datetime',
        'disbursed_at' => 'datetime',
        'retention_released_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($release) {
            if (empty($release->uuid)) {
                $release->uuid = (string) Str::uuid();
            }

            if (empty($release->release_number)) {
                $release->release_number = static::generateReleaseNumber();
            }

            if (empty($release->currency)) {
                $release->currency = 'UGX';
            }

            if (empty($release->status)) {
                $release->status = 'pending_authorization';
            }

            if (empty($release->retention_percentage)) {
                $release->retention_percentage = 5.00; // Standard 5% defect liability retention
            }

            // Auto calculate retention amount and net release amount
            $gross = (float) ($release->gross_amount ?? 0);
            $retentionPct = (float) $release->retention_percentage;
            $release->retention_amount = round(($gross * $retentionPct) / 100, 2);
            $release->net_release_amount = round($gross - $release->retention_amount, 2);

            if (auth()->check() && empty($release->created_by)) {
                $release->created_by = auth()->id();
            }
        });

        static::updating(function ($release) {
            if ($release->isDirty(['gross_amount', 'retention_percentage'])) {
                $gross = (float) $release->gross_amount;
                $retentionPct = (float) $release->retention_percentage;
                $release->retention_amount = round(($gross * $retentionPct) / 100, 2);
                $release->net_release_amount = round($gross - $release->retention_amount, 2);
            }

            if (auth()->check()) {
                $release->updated_by = auth()->id();
            }
        });
    }

    /**
     * Generate unique release number: MPR-YYYYMMDD-XXXX
     */
    public static function generateReleaseNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $seq = $last ? intval(substr($last->release_number, -4)) + 1 : 1;

        return 'MPR-' . $date . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships
    public function milestoneVerification(): BelongsTo
    {
        return $this->belongsTo(MilestoneVerification::class, 'milestone_verification_id');
    }

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

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function authorizedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    public function disbursedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disbursed_by');
    }

    public function retentionReleasedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'retention_released_by');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }

    public function retentionTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'retention_transaction_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
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

    // Status helpers
    public function isPending(): bool
    {
        return $this->status === 'pending_authorization';
    }

    public function isAuthorized(): bool
    {
        return $this->status === 'authorized';
    }

    public function isDisbursed(): bool
    {
        return $this->status === 'disbursed';
    }

    public function isRetentionReleased(): bool
    {
        return !is_null($this->retention_released_at);
    }

    public function triggerLogs(): HasMany
    {
        return $this->hasMany(MilestoneTriggerLog::class, 'milestone_payment_release_id');
    }

    public function reconciliationItems(): HasMany
    {
        return $this->hasMany(EscrowReconciliationItem::class, 'milestone_payment_release_id');
    }
}
