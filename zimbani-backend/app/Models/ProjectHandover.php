<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectHandover extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'uuid',
        'handover_number',
        'project_id',
        'unit_id',
        'client_id',
        'company_id',
        'handover_title',
        'status',
        // Milestones Clearance
        'substructure_cleared',
        'superstructure_cleared',
        'roofing_cleared',
        'mep_cleared',
        'finishes_cleared',
        'all_milestones_verified',
        // Punch List Clearance
        'total_snags_logged',
        'total_snags_resolved',
        'critical_snags_pending',
        'snags_cleared',
        // Dossier Checklist
        'has_occupancy_permit',
        'occupancy_permit_ref',
        'occupancy_permit_issued_at',
        'has_as_built_drawings',
        'as_built_drawings_ref',
        'has_mep_compliance_certs',
        'mep_compliance_notes',
        'has_warranty_manual',
        'has_keys_inventory',
        'key_sets_count',
        // Sign-off & Key Release
        'lead_architect_signed_by',
        'lead_architect_signed_at',
        'project_director_signed_by',
        'project_director_signed_at',
        'client_signed_at',
        'client_signature_name',
        'client_signature_hash',
        'client_signoff_ip',
        'keys_released_at',
        'keys_received_by_name',
        'dlp_start_date',
        'dlp_end_date',
        'dlp_period_days',
        'handover_notes',
    ];

    protected $casts = [
        'substructure_cleared' => 'boolean',
        'superstructure_cleared' => 'boolean',
        'roofing_cleared' => 'boolean',
        'mep_cleared' => 'boolean',
        'finishes_cleared' => 'boolean',
        'all_milestones_verified' => 'boolean',
        'snags_cleared' => 'boolean',
        'has_occupancy_permit' => 'boolean',
        'occupancy_permit_issued_at' => 'date',
        'has_as_built_drawings' => 'boolean',
        'has_mep_compliance_certs' => 'boolean',
        'has_warranty_manual' => 'boolean',
        'has_keys_inventory' => 'boolean',
        'lead_architect_signed_at' => 'datetime',
        'project_director_signed_at' => 'datetime',
        'client_signed_at' => 'datetime',
        'keys_released_at' => 'datetime',
        'dlp_start_date' => 'date',
        'dlp_end_date' => 'date',
    ];

    protected $appends = [
        'readiness_percentage',
        'dlp_days_remaining',
        'is_dlp_active',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->handover_number)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->handover_number = sprintf('HND-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function leadArchitect(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_architect_signed_by');
    }

    public function projectDirector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_director_signed_by');
    }

    public function finalSettlement(): HasOne
    {
        return $this->hasOne(ProjectFinalSettlement::class, 'project_handover_id');
    }

    /**
     * Calculate readiness score (0 - 100%) across milestones, punch items, and dossier.
     */
    public function getReadinessPercentageAttribute(): int
    {
        $checks = [
            $this->substructure_cleared,
            $this->superstructure_cleared,
            $this->roofing_cleared,
            $this->mep_cleared,
            $this->finishes_cleared,
            $this->snags_cleared,
            $this->has_occupancy_permit,
            $this->has_as_built_drawings,
            $this->has_mep_compliance_certs,
            $this->has_warranty_manual,
        ];

        $passed = count(array_filter($checks));
        return (int) round(($passed / count($checks)) * 100);
    }

    /**
     * Get DLP days remaining until final warranty expires.
     */
    public function getDlpDaysRemainingAttribute(): int
    {
        if (!$this->dlp_end_date) {
            return 0;
        }

        $endDate = Carbon::parse($this->dlp_end_date);
        $now = Carbon::now();

        if ($now->greaterThanOrEqualTo($endDate)) {
            return 0;
        }

        return (int) $now->diffInDays($endDate);
    }

    /**
     * Check if DLP warranty is actively running.
     */
    public function getIsDlpActiveAttribute(): bool
    {
        if (!$this->dlp_start_date || !$this->dlp_end_date) {
            return false;
        }

        $now = Carbon::now();
        return $now->between(
            Carbon::parse($this->dlp_start_date)->startOfDay(),
            Carbon::parse($this->dlp_end_date)->endOfDay()
        );
    }
}
