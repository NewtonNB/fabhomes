<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialUsage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'material_usages';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'usage_number',
        'material_id',
        'site_id',
        'project_id',
        'task_id',
        'milestone_id',
        'unit_id',
        'quantity_used',
        'unit_of_measure',
        'unit_cost_at_usage',
        'total_cost',
        'used_date',
        'logged_by',
        'purpose',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity_used' => 'decimal:2',
        'unit_cost_at_usage' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'used_date' => 'date',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($usage) {
            if (empty($usage->uuid)) {
                $usage->uuid = (string) Str::uuid();
            }

            if (empty($usage->usage_number)) {
                $usage->usage_number = static::generateUsageNumber();
            }

            if (auth()->check() && empty($usage->logged_by)) {
                $usage->logged_by = auth()->id();
            }

            // Fetch current unit cost from material if not specified
            if (empty($usage->unit_cost_at_usage) && $usage->material_id) {
                $mat = Material::find($usage->material_id);
                if ($mat) {
                    $usage->unit_cost_at_usage = $mat->unit_cost;
                    if (empty($usage->unit_of_measure)) {
                        $usage->unit_of_measure = $mat->unit_of_measure;
                    }
                }
            }

            // Calculate total cost
            if (empty($usage->total_cost) && $usage->quantity_used && $usage->unit_cost_at_usage) {
                $usage->total_cost = (float) $usage->quantity_used * (float) $usage->unit_cost_at_usage;
            }
        });

        static::created(function ($usage) {
            // Automatically decrement material stock level upon usage
            if ($usage->material_id) {
                $material = Material::find($usage->material_id);
                if ($material) {
                    $material->adjustStock(
                        -(float) $usage->quantity_used,
                        "Consumed for {$usage->purpose} (#{$usage->usage_number})"
                    );
                }
            }
        });
    }

    /**
     * Generate unique usage number: USG-YYYYMMDD-XXXX
     */
    public static function generateUsageNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->usage_number, -4)) + 1 : 1;
        return 'USG-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Route model binding uses UUID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Material consumed.
     */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    /**
     * Site where material was consumed.
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Associated project (optional).
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Associated task (optional).
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    /**
     * Associated construction milestone (optional).
     */
    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    /**
     * Associated unit (optional).
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    /**
     * User who recorded the material consumption.
     */
    public function loggedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
