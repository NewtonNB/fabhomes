<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tasks';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'task_number',
        'title',
        'description',
        'project_id',
        'site_id',
        'unit_id',
        'milestone_id',
        'assigned_to',
        'created_by',
        'updated_by',
        'priority',
        'status',
        'completion_percentage',
        'start_date',
        'due_date',
        'completed_at',
        'estimated_hours',
        'actual_hours',
        'notes',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'completion_percentage' => 'decimal:2',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'metadata' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($task) {
            if (empty($task->uuid)) {
                $task->uuid = (string) Str::uuid();
            }

            if (empty($task->task_number)) {
                $task->task_number = static::generateTaskNumber();
            }

            if (auth()->check() && empty($task->created_by)) {
                $task->created_by = auth()->id();
            }
        });

        static::updating(function ($task) {
            if (auth()->check()) {
                $task->updated_by = auth()->id();
            }

            // Auto-handle completion transition
            if ($task->isDirty('status') && $task->status === 'completed') {
                if (empty($task->completed_at)) {
                    $task->completed_at = now();
                }
                $task->completion_percentage = 100.00;
            }
        });
    }

    /**
     * Generate unique task number: TSK-YYYYMMDD-XXXX
     */
    public static function generateTaskNumber(): string
    {
        $date = now()->format('Ymd');
        $lastTask = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastTask ? intval(substr($lastTask->task_number, -4)) + 1 : 1;

        return 'TSK-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
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
     * Optional parent site.
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Optional parent unit.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    /**
     * Optional construction milestone.
     */
    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    /**
     * Assigned worker or supervisor.
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * User who created the task.
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Polymorphic documents & photos attached to task.
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Material usages logged against this task.
     */
    public function materialUsages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MaterialUsage::class, 'task_id');
    }

    /**
     * Site inspections conducted for this task.
     */
    public function siteInspections(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SiteInspection::class, 'task_id');
    }

    /**
     * Punch list items associated with this task.
     */
    public function punchListItems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PunchListItem::class, 'task_id');
    }

    /**
     * Scopes
     */
    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeForSite($query, $siteId)
    {
        return $query->where('site_id', $siteId);
    }

    public function scopeForMilestone($query, $milestoneId)
    {
        return $query->where('milestone_id', $milestoneId);
    }

    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }
}
