<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PunchListItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'punch_list_items';

    protected $fillable = [
        'uuid',
        'item_number',
        'site_inspection_id',
        'site_id',
        'project_id',
        'unit_id',
        'task_id',
        'title',
        'description',
        'location_details',
        'category',
        'severity',
        'status',
        'due_date',
        'rectified_at',
        'rectification_notes',
        'assigned_to',
        'subcontractor_name',
        'reported_by',
        'verified_by',
        'verified_at',
        'verification_notes',
        'defect_liability_certificate_id',
        'is_dlp_defect',
    ];

    protected $casts = [
        'due_date' => 'date',
        'rectified_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_dlp_defect' => 'boolean',
    ];

    /**
     * Use UUID for route binding
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Booted model hooks
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }

            if (empty($model->item_number)) {
                $datePart = now()->format('Ymd');
                $prefix = "PNC-{$datePart}-";
                $countToday = static::withTrashed()
                    ->where('item_number', 'like', "{$prefix}%")
                    ->count();
                $model->item_number = sprintf('%s%04d', $prefix, $countToday + 1);
            }

            if (empty($model->reported_by) && auth()->check()) {
                $model->reported_by = auth()->id();
            }
        });
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function siteInspection(): BelongsTo
    {
        return $this->belongsTo(SiteInspection::class, 'site_inspection_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function defectLiabilityCertificate(): BelongsTo
    {
        return $this->belongsTo(DefectLiabilityCertificate::class, 'defect_liability_certificate_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // ==========================================
    // DOMAIN ACTIONS
    // ==========================================

    /**
     * Mark defect as rectified by tradesperson/worker
     */
    public function markRectified(?string $notes = null): void
    {
        $this->update([
            'status' => 'rectified',
            'rectified_at' => now(),
            'rectification_notes' => $notes ?? $this->rectification_notes,
        ]);
    }

    /**
     * Verify rectification and close punch list item
     */
    public function verifyAndClose(int $verifierId, ?string $notes = null): void
    {
        $this->update([
            'status' => 'verified_closed',
            'verified_by' => $verifierId,
            'verified_at' => now(),
            'verification_notes' => $notes ?? $this->verification_notes,
        ]);
    }

    /**
     * Waive defect (deemed acceptable by architect/engineer)
     */
    public function waive(?string $notes = null): void
    {
        $this->update([
            'status' => 'waived',
            'verification_notes' => $notes ?? $this->verification_notes,
        ]);
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress']);
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    public function scopeOverdue($query)
    {
        return $query->whereIn('status', ['open', 'in_progress'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString());
    }
}
