<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'company_id',
        'name',
        'code',
        'description',
        'project_type',
        'status',
        'start_date',
        'end_date',
        'actual_completion_date',
        'budget',
        'currency',
        'total_spent',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'contact_person',
        'contact_email',
        'contact_phone',
        'total_units',
        'total_area',
        'area_unit',
        'completion_percentage',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'actual_completion_date' => 'date',
        'budget' => 'decimal:2',
        'total_spent' => 'decimal:2',
        'completion_percentage' => 'decimal:2',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'total_area' => 'decimal:2',
        'metadata' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($project) {
            if (empty($project->uuid)) {
                $project->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the route key for the model.
     *
     * @return string
     */
    public function getRouteKeyName()
    {
        return 'uuid';
    }

    /**
     * Get the company that owns the project.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the sites for the project.
     */
    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }

    /**
     * Get the users assigned to the project.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user')
            ->withPivot('role', 'assigned_at')
            ->withTimestamps();
    }

    /**
     * Get the milestones for the project.
     */
    public function milestones(): HasMany
    {
        return $this->hasMany(ConstructionMilestone::class, 'project_id')->orderBy('milestone_order');
    }

    /**
     * Get the tasks for the project.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'project_id');
    }

    /**
     * Get material requisitions for the project.
     */
    public function materialRequisitions(): HasMany
    {
        return $this->hasMany(MaterialRequisition::class, 'project_id');
    }

    /**
     * Get material usage logs for the project.
     */
    public function materialUsages(): HasMany
    {
        return $this->hasMany(MaterialUsage::class, 'project_id');
    }

    /**
     * Get equipment dispatches for the project.
     */
    public function equipmentDispatches(): HasMany
    {
        return $this->hasMany(EquipmentDispatch::class, 'project_id');
    }

    /**
     * Get site inspections for the project.
     */
    public function siteInspections(): HasMany
    {
        return $this->hasMany(SiteInspection::class, 'project_id');
    }

    /**
     * Get punch list items for the project.
     */
    public function punchListItems(): HasMany
    {
        return $this->hasMany(PunchListItem::class, 'project_id');
    }

    /**
     * Get site daily logs for the project.
     */
    public function siteDailyLogs(): HasMany
    {
        return $this->hasMany(SiteDailyLog::class, 'project_id');
    }

    /**
     * Get safety incident reports for the project.
     */
    public function safetyIncidents(): HasMany
    {
        return $this->hasMany(SafetyIncident::class, 'project_id');
    }

    /**
     * Get safety toolbox talks for the project.
     */
    public function safetyToolboxTalks(): HasMany
    {
        return $this->hasMany(SafetyToolboxTalk::class, 'project_id');
    }

    /**
     * Get equipment utilization logs for the project.
     */
    public function equipmentUtilizationLogs(): HasMany
    {
        return $this->hasMany(EquipmentUtilizationLog::class, 'project_id');
    }

    /**
     * Get the documents for the project.
     */
    public function documents(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Get savings accounts linked to this construction project.
     */
    public function savingsAccounts(): HasMany
    {
        return $this->hasMany(SavingsAccount::class, 'project_id');
    }

    /**
     * Scope a query to only include active projects.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include projects of a specific type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('project_type', $type);
    }

    /**
     * Scope a query to only include projects for a specific company.
     */
    public function scopeForCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope a query to only include ongoing projects.
     */
    public function scopeOngoing($query)
    {
        return $query->whereIn('status', ['planning', 'active', 'on_hold']);
    }

    /**
     * Scope a query to only include completed projects.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Check if project is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if project is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if project is overdue.
     */
    public function isOverdue(): bool
    {
        if ($this->status === 'completed' || !$this->end_date) {
            return false;
        }
        
        return now()->isAfter($this->end_date);
    }

    /**
     * Get the project's progress percentage.
     */
    public function getProgressPercentage(): float
    {
        if ($this->status === 'completed') {
            return 100;
        }

        if ($this->status === 'cancelled') {
            return 0;
        }

        if (!$this->start_date || !$this->end_date) {
            return 0;
        }

        $totalDays = $this->start_date->diffInDays($this->end_date);
        if ($totalDays === 0) {
            return 0;
        }

        $daysElapsed = $this->start_date->diffInDays(now());
        $percentage = ($daysElapsed / $totalDays) * 100;

        return min(100, max(0, round($percentage, 2)));
    }

    /**
     * Get the budget utilization percentage.
     */
    public function getBudgetUtilization(): float
    {
        if (!$this->budget || $this->budget == 0) {
            return 0;
        }

        return round(($this->total_spent / $this->budget) * 100, 2);
    }

    /**
     * Get the remaining budget.
     */
    public function getRemainingBudget(): float
    {
        return max(0, $this->budget - $this->total_spent);
    }

    /**
     * Get the full address as a single string.
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->city,
            $this->state,
            $this->country,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get the project duration in days.
     */
    public function getDurationInDays(): ?int
    {
        if (!$this->start_date || !$this->end_date) {
            return null;
        }

        return $this->start_date->diffInDays($this->end_date);
    }

    /**
     * Check if project has sites.
     */
    public function hasSites(): bool
    {
        return $this->sites()->exists();
    }
}
