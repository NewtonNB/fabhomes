<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Site extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'name',
        'code',
        'project_id',
        'site_type',
        'status',
        'address',
        'city',
        'region',
        'country',
        'latitude',
        'longitude',
        'boundaries',
        'total_area',
        'buildable_area',
        'supervisor_id',
        'start_date',
        'expected_completion_date',
        'actual_completion_date',
        'total_workers',
        'total_equipment',
        'total_units',
        'allocated_budget',
        'actual_spent',
        'currency',
        'utilities',
        'facilities',
        'safety_measures',
        'last_inspection_date',
        'next_inspection_date',
        'contact_person',
        'contact_phone',
        'contact_email',
        'description',
        'notes',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'boundaries' => 'array',
        'total_area' => 'decimal:2',
        'buildable_area' => 'decimal:2',
        'start_date' => 'date',
        'expected_completion_date' => 'date',
        'actual_completion_date' => 'date',
        'total_workers' => 'integer',
        'total_equipment' => 'integer',
        'total_units' => 'integer',
        'allocated_budget' => 'decimal:2',
        'actual_spent' => 'decimal:2',
        'utilities' => 'array',
        'facilities' => 'array',
        'safety_measures' => 'array',
        'last_inspection_date' => 'date',
        'next_inspection_date' => 'date',
        'metadata' => 'array',
    ];

    /**
     * Boot method to handle model events.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($site) {
            if (empty($site->uuid)) {
                $site->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Relationships
     */

    /**
     * Get the project that owns the site.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the supervisor of the site.
     */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    /**
     * Get the workers assigned to the site.
     */
    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'site_workers')
            ->withPivot('role', 'assigned_date', 'status')
            ->withTimestamps();
    }

    /**
     * Get the equipment at the site.
     */
    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }

    /**
     * Get the units/plots at the site.
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /**
     * Get the materials inventory at the site.
     */
    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }

    /**
     * Get the safety incidents at the site.
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Get the inspections conducted at the site.
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }

    /**
     * Helper Methods
     */

    /**
     * Check if the site is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if the site is overdue.
     */
    public function isOverdue(): bool
    {
        if (!$this->expected_completion_date || $this->actual_completion_date) {
            return false;
        }

        return now()->isAfter($this->expected_completion_date);
    }

    /**
     * Get the completion progress percentage.
     */
    public function getProgressPercentage(): float
    {
        if (!$this->start_date || !$this->expected_completion_date) {
            return 0;
        }

        $totalDays = $this->start_date->diffInDays($this->expected_completion_date);
        if ($totalDays === 0) {
            return 100;
        }

        $elapsedDays = $this->start_date->diffInDays(now());

        if ($this->actual_completion_date) {
            return 100;
        }

        return min(100, round(($elapsedDays / $totalDays) * 100, 2));
    }

    /**
     * Get the budget utilization percentage.
     */
    public function getBudgetUtilization(): float
    {
        if ($this->allocated_budget == 0) {
            return 0;
        }

        return round(($this->actual_spent / $this->allocated_budget) * 100, 2);
    }

    /**
     * Get the remaining budget.
     */
    public function getRemainingBudget(): float
    {
        return max(0, $this->allocated_budget - $this->actual_spent);
    }

    /**
     * Check if the site is over budget.
     */
    public function isOverBudget(): bool
    {
        return $this->actual_spent > $this->allocated_budget;
    }

    /**
     * Get the full address attribute.
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->city,
            $this->region,
            $this->country,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get the area utilization percentage.
     */
    public function getAreaUtilization(): float
    {
        if (!$this->total_area || $this->total_area == 0) {
            return 0;
        }

        if (!$this->buildable_area) {
            return 0;
        }

        return round(($this->buildable_area / $this->total_area) * 100, 2);
    }

    /**
     * Check if the site needs inspection.
     */
    public function needsInspection(): bool
    {
        if (!$this->next_inspection_date) {
            return false;
        }

        return now()->isAfter($this->next_inspection_date);
    }

    /**
     * Get days until expected completion.
     */
    public function getDaysUntilCompletion(): ?int
    {
        if (!$this->expected_completion_date || $this->actual_completion_date) {
            return null;
        }

        return now()->diffInDays($this->expected_completion_date, false);
    }

    /**
     * Scopes
     */

    /**
     * Scope a query to only include active sites.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include sites of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('site_type', $type);
    }

    /**
     * Scope a query to only include sites for a specific project.
     */
    public function scopeForProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /**
     * Scope a query to only include overdue sites.
     */
    public function scopeOverdue($query)
    {
        return $query->whereNull('actual_completion_date')
            ->whereNotNull('expected_completion_date')
            ->where('expected_completion_date', '<', now());
    }

    /**
     * Scope a query to only include sites supervised by a specific user.
     */
    public function scopeSupervisedBy($query, int $userId)
    {
        return $query->where('supervisor_id', $userId);
    }
}
