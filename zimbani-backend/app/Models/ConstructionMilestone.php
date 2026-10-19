<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ConstructionMilestone extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'construction_milestones';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'project_id',
        'milestone_name',
        'milestone_order',
        'description',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'estimated_cost',
        'actual_cost',
        'currency',
        'status',
        'completion_percentage',
        'completed_at',
        'completed_by',
        'notes',
        'completion_notes',
        'metadata',
        'created_by',
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'milestone_order' => 'integer',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'completed_at' => 'datetime',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'completion_percentage' => 'decimal:2',
        'metadata' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($milestone) {
            if (empty($milestone->uuid)) {
                $milestone->uuid = (string) Str::uuid();
            }

            if (empty($milestone->milestone_order)) {
                $maxOrder = static::where('project_id', $milestone->project_id)->max('milestone_order') ?? 0;
                $milestone->milestone_order = $maxOrder + 1;
            }

            if (auth()->check() && empty($milestone->created_by)) {
                $milestone->created_by = auth()->id();
            }
        });

        static::updating(function ($milestone) {
            if (auth()->check()) {
                $milestone->updated_by = auth()->id();
            }

            // If marked as completed and completed_at is not set
            if ($milestone->isDirty('status') && $milestone->status === 'completed') {
                if (empty($milestone->completed_at)) {
                    $milestone->completed_at = now();
                }
                if (empty($milestone->completed_by) && auth()->check()) {
                    $milestone->completed_by = auth()->id();
                }
                $milestone->completion_percentage = 100.00;
            }
        });

        static::saved(function ($milestone) {
            // Automatically update parent project completion percentage (FR-CONST-003)
            $milestone->syncProjectProgress();
        });

        static::deleted(function ($milestone) {
            $milestone->syncProjectProgress();
        });
    }

    /**
     * Recalculate and synchronize parent project's completion percentage.
     */
    public function syncProjectProgress(): void
    {
        if ($this->project_id) {
            $project = Project::find($this->project_id);
            if ($project) {
                $avg = static::where('project_id', $this->project_id)
                    ->whereNull('deleted_at')
                    ->avg('completion_percentage');
                
                $project->update([
                    'completion_percentage' => round($avg ?? 0.00, 2)
                ]);
            }
        }
    }

    /**
     * Route model binding uses UUID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Parent project.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Tasks linked to this milestone.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'milestone_id');
    }

    /**
     * User who verified/completed milestone.
     */
    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * User who created milestone.
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Polymorphic documents & photos attached to milestone.
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Material usages logged against this milestone.
     */
    public function materialUsages(): HasMany
    {
        return $this->hasMany(MaterialUsage::class, 'milestone_id');
    }

    /**
     * Multi-signature physical verifications for this milestone.
     */
    public function verifications(): HasMany
    {
        return $this->hasMany(MilestoneVerification::class, 'milestone_id');
    }

    /**
     * Milestone payment releases linked to this milestone.
     */
    public function paymentReleases(): HasMany
    {
        return $this->hasMany(MilestonePaymentRelease::class, 'milestone_id');
    }

    /**
     * Subcontractor contract milestone allocations.
     */
    public function contractMilestones(): HasMany
    {
        return $this->hasMany(ContractMilestone::class, 'milestone_id');
    }

    /**
     * Subcontractors assigned to this milestone.
     */
    public function subcontractorContracts(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(SubcontractorContract::class, 'contract_milestones', 'milestone_id', 'contract_id')
            ->withPivot(['uuid', 'allocated_amount', 'weight_percentage', 'status', 'certified_amount', 'paid_amount', 'notes'])
            ->withTimestamps();
    }

    /**
     * Payment certificates issued for this milestone.
     */
    public function paymentCertificates(): HasMany
    {
        return $this->hasMany(PaymentCertificate::class, 'milestone_id');
    }
}
