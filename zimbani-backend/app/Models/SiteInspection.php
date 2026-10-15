<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SiteInspection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'site_inspections';

    protected $fillable = [
        'uuid',
        'inspection_number',
        'title',
        'inspection_type',
        'site_id',
        'project_id',
        'unit_id',
        'task_id',
        'milestone_id',
        'inspector_id',
        'scheduled_date',
        'inspected_at',
        'status',
        'score',
        'checklist_items',
        'summary_notes',
        'conditions',
        'supervisor_id',
        'signed_off_at',
        'sign_off_notes',
        'created_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'inspected_at' => 'datetime',
        'signed_off_at' => 'datetime',
        'score' => 'decimal:2',
        'checklist_items' => 'array',
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

            if (empty($model->inspection_number)) {
                $datePart = now()->format('Ymd');
                $prefix = "INS-{$datePart}-";
                $countToday = static::withTrashed()
                    ->where('inspection_number', 'like', "{$prefix}%")
                    ->count();
                $model->inspection_number = sprintf('%s%04d', $prefix, $countToday + 1);
            }

            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

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

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function punchListItems(): HasMany
    {
        return $this->hasMany(PunchListItem::class, 'site_inspection_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // ==========================================
    // DOMAIN ACTIONS
    // ==========================================

    /**
     * Formal sign-off by Site Supervisor / Manager
     */
    public function signOff(int $supervisorId, ?string $notes = null): void
    {
        $this->update([
            'supervisor_id' => $supervisorId,
            'signed_off_at' => now(),
            'sign_off_notes' => $notes,
        ]);
    }

    /**
     * Complete the inspection assessment run
     */
    public function completeInspection(
        string $status,
        ?float $score = null,
        ?array $checklist = null,
        ?string $summary = null,
        ?string $conditions = null
    ): void {
        $data = [
            'status' => $status,
            'inspected_at' => now(),
        ];

        if ($score !== null) {
            $data['score'] = $score;
        }
        if ($checklist !== null) {
            $data['checklist_items'] = $checklist;
        }
        if ($summary !== null) {
            $data['summary_notes'] = $summary;
        }
        if ($conditions !== null) {
            $data['conditions'] = $conditions;
        }

        $this->update($data);
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopePassed($query)
    {
        return $query->where('status', 'passed');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeNeedsSignOff($query)
    {
        return $query->whereIn('status', ['passed', 'failed', 'passed_with_conditions'])
            ->whereNull('signed_off_at');
    }
}
