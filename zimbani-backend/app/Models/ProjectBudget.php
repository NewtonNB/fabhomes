<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectBudget extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'site_id',
        'budget_code',
        'name',
        'cost_category',
        'allocated_amount',
        'currency',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($budget) {
            if (empty($budget->uuid)) {
                $budget->uuid = (string) Str::uuid();
            }

            if (empty($budget->currency)) {
                $budget->currency = 'UGX';
            }

            if (auth()->check() && empty($budget->created_by)) {
                $budget->created_by = auth()->id();
            }
        });

        static::updating(function ($budget) {
            if (auth()->check()) {
                $budget->updated_by = auth()->id();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Standard Construction Cost Code Catalog Template
     */
    public static function standardCostCodes(): array
    {
        return [
            [
                'budget_code' => 'CC-SUBSTRUCTURE',
                'name' => 'Substructure, Earthworks & Foundations',
                'cost_category' => 'subcontractor',
                'percentage' => 12.0,
            ],
            [
                'budget_code' => 'CC-CONCRETE',
                'name' => 'Reinforced Concrete Columns, Beams & Slabs',
                'cost_category' => 'subcontractor',
                'percentage' => 15.0,
            ],
            [
                'budget_code' => 'CC-MASONRY',
                'name' => 'Blockwork, Walling & Partitions',
                'cost_category' => 'subcontractor',
                'percentage' => 10.0,
            ],
            [
                'budget_code' => 'CC-ROOFING',
                'name' => 'Roof Structure, Trusses, Sheets & Rainwater Goods',
                'cost_category' => 'subcontractor',
                'percentage' => 10.0,
            ],
            [
                'budget_code' => 'CC-PLUMBING',
                'name' => 'Plumbing, Drainage, Sanitaryware & Tanks',
                'cost_category' => 'subcontractor',
                'percentage' => 8.0,
            ],
            [
                'budget_code' => 'CC-ELECTRICAL',
                'name' => 'Electrical Conduit, Reticulation & Fixtures',
                'cost_category' => 'subcontractor',
                'percentage' => 8.0,
            ],
            [
                'budget_code' => 'CC-FINISHES',
                'name' => 'Plastering, Floor Tiling, Painting & Ceiling Finishes',
                'cost_category' => 'subcontractor',
                'percentage' => 14.0,
            ],
            [
                'budget_code' => 'CC-MATERIALS',
                'name' => 'Bulk Cement, Sand, Aggregates & Steel Rebar',
                'cost_category' => 'materials',
                'percentage' => 8.0,
            ],
            [
                'budget_code' => 'CC-EQUIPMENT',
                'name' => 'Plant, Excavators, Concrete Mixers & Fuel',
                'cost_category' => 'equipment',
                'percentage' => 5.0,
            ],
            [
                'budget_code' => 'CC-LOGISTICS',
                'name' => 'Direct Site Purchases & Site Transport Logistics',
                'cost_category' => 'direct_purchasing',
                'percentage' => 3.0,
            ],
            [
                'budget_code' => 'CC-PERMITS',
                'name' => 'Council Approvals, Statutory Permits & Inspections',
                'cost_category' => 'permits_legal',
                'percentage' => 2.0,
            ],
            [
                'budget_code' => 'CC-CONTINGENCY',
                'name' => 'Unforeseen Works & Site Contingency Pool',
                'cost_category' => 'contingency',
                'percentage' => 5.0,
            ],
        ];
    }
}
