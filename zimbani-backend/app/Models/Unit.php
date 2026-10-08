<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Unit extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'unit_number',
        'name',
        'site_id',
        'project_id',
        'unit_type',
        'status',
        'floor_number',
        'block_number',
        'area',
        'area_unit',
        'bedrooms',
        'bathrooms',
        'has_balcony',
        'has_parking',
        'parking_slots',
        'base_price',
        'current_price',
        'discount',
        'currency',
        'price_type',
        'client_id',
        'reserved_date',
        'sold_date',
        'handover_date',
        'amount_paid',
        'balance',
        'construction_start_date',
        'expected_completion_date',
        'actual_completion_date',
        'completion_percentage',
        'features',
        'amenities',
        'specifications',
        'location_description',
        'facing_direction',
        'view_description',
        'images',
        'floor_plans',
        'documents',
        'maintenance_fee',
        'maintenance_frequency',
        'last_inspection_date',
        'next_inspection_date',
        'inspection_notes',
        'is_defect_free',
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
        'area' => 'decimal:2',
        'bedrooms' => 'integer',
        'bathrooms' => 'integer',
        'has_balcony' => 'boolean',
        'has_parking' => 'boolean',
        'parking_slots' => 'integer',
        'base_price' => 'decimal:2',
        'current_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'reserved_date' => 'date',
        'sold_date' => 'date',
        'handover_date' => 'date',
        'construction_start_date' => 'date',
        'expected_completion_date' => 'date',
        'actual_completion_date' => 'date',
        'completion_percentage' => 'integer',
        'features' => 'array',
        'amenities' => 'array',
        'specifications' => 'array',
        'images' => 'array',
        'floor_plans' => 'array',
        'documents' => 'array',
        'maintenance_fee' => 'decimal:2',
        'last_inspection_date' => 'date',
        'next_inspection_date' => 'date',
        'is_defect_free' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * Boot method to handle model events.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($unit) {
            if (empty($unit->uuid)) {
                $unit->uuid = (string) Str::uuid();
            }
            
            // Auto-calculate balance if not set
            if ($unit->current_price && $unit->amount_paid !== null && $unit->balance === null) {
                $unit->balance = $unit->current_price - $unit->amount_paid;
            }
        });

        static::updating(function ($unit) {
            // Auto-update balance when price or payment changes
            if ($unit->isDirty(['current_price', 'amount_paid']) && $unit->current_price) {
                $unit->balance = $unit->current_price - ($unit->amount_paid ?? 0);
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
     * Get the site that owns the unit.
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /**
     * Get the project that owns the unit.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the client (owner) of the unit.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /**
     * Helper Methods
     */

    /**
     * Check if the unit is available for sale/rent.
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    /**
     * Check if the unit is sold.
     */
    public function isSold(): bool
    {
        return $this->status === 'sold';
    }

    /**
     * Check if the unit is reserved.
     */
    public function isReserved(): bool
    {
        return $this->status === 'reserved';
    }

    /**
     * Check if the unit is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed' || $this->completion_percentage >= 100;
    }

    /**
     * Check if the unit is overdue for completion.
     */
    public function isOverdue(): bool
    {
        if (!$this->expected_completion_date || $this->actual_completion_date) {
            return false;
        }

        return now()->isAfter($this->expected_completion_date);
    }

    /**
     * Get the payment progress percentage.
     */
    public function getPaymentProgress(): float
    {
        if (!$this->current_price || $this->current_price == 0) {
            return 0;
        }

        return round(($this->amount_paid / $this->current_price) * 100, 2);
    }

    /**
     * Check if the unit is fully paid.
     */
    public function isFullyPaid(): bool
    {
        if (!$this->current_price) {
            return false;
        }

        return $this->amount_paid >= $this->current_price;
    }

    /**
     * Get the remaining balance.
     */
    public function getRemainingBalance(): float
    {
        if (!$this->current_price) {
            return 0;
        }

        return max(0, $this->current_price - ($this->amount_paid ?? 0));
    }

    /**
     * Get the final price after discount.
     */
    public function getFinalPrice(): float
    {
        if (!$this->current_price) {
            return 0;
        }

        return max(0, $this->current_price - ($this->discount ?? 0));
    }

    /**
     * Get the price per square meter.
     */
    public function getPricePerSqm(): ?float
    {
        if (!$this->current_price || !$this->area || $this->area == 0) {
            return null;
        }

        return round($this->current_price / $this->area, 2);
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
     * Get construction duration in days.
     */
    public function getConstructionDuration(): ?int
    {
        if (!$this->construction_start_date || !$this->expected_completion_date) {
            return null;
        }

        return $this->construction_start_date->diffInDays($this->expected_completion_date);
    }

    /**
     * Check if the unit needs inspection.
     */
    public function needsInspection(): bool
    {
        if (!$this->next_inspection_date) {
            return false;
        }

        return now()->isAfter($this->next_inspection_date);
    }

    /**
     * Get the full unit identifier (block + floor + unit).
     */
    public function getFullIdentifier(): string
    {
        $parts = array_filter([
            $this->block_number ? "Block {$this->block_number}" : null,
            $this->floor_number !== null ? "Floor {$this->floor_number}" : null,
            "Unit {$this->unit_number}",
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get unit specifications summary.
     */
    public function getSpecsSummary(): string
    {
        $specs = [];

        if ($this->bedrooms) {
            $specs[] = "{$this->bedrooms} BR";
        }

        if ($this->bathrooms) {
            $specs[] = "{$this->bathrooms} Bath";
        }

        if ($this->area) {
            $specs[] = "{$this->area} {$this->area_unit}";
        }

        if ($this->has_balcony) {
            $specs[] = "Balcony";
        }

        if ($this->has_parking) {
            $specs[] = ($this->parking_slots > 1 ? "{$this->parking_slots} Parking" : "Parking");
        }

        return implode(' | ', $specs);
    }

    /**
     * Scopes
     */

    /**
     * Scope a query to only include available units.
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    /**
     * Scope a query to only include sold units.
     */
    public function scopeSold($query)
    {
        return $query->where('status', 'sold');
    }

    /**
     * Scope a query to only include completed units.
     */
    public function scopeCompleted($query)
    {
        return $query->where(function ($q) {
            $q->where('status', 'completed')
                ->orWhere('completion_percentage', '>=', 100);
        });
    }

    /**
     * Scope a query to only include units at a specific site.
     */
    public function scopeAtSite($query, int $siteId)
    {
        return $query->where('site_id', $siteId);
    }

    /**
     * Scope a query to only include units in a specific project.
     */
    public function scopeInProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /**
     * Scope a query to only include units of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('unit_type', $type);
    }

    /**
     * Scope a query to only include units within a price range.
     */
    public function scopeInPriceRange($query, float $min, float $max)
    {
        return $query->whereBetween('current_price', [$min, $max]);
    }

    /**
     * Scope a query to only include units with specific bedroom count.
     */
    public function scopeWithBedrooms($query, int $bedrooms)
    {
        return $query->where('bedrooms', $bedrooms);
    }

    /**
     * Scope a query to only include overdue units.
     */
    public function scopeOverdue($query)
    {
        return $query->whereNull('actual_completion_date')
            ->whereNotNull('expected_completion_date')
            ->where('expected_completion_date', '<', now());
    }

    /**
     * Scope a query to only include units owned by a specific client.
     */
    public function scopeOwnedBy($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }
}
