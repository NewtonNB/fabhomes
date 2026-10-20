<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ConstructionSavingScheme extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'construction_saving_schemes';

    protected $fillable = [
        'uuid',
        'scheme_code',
        'name',
        'description',
        'project_type',
        'currency',
        'standard_target_amount',
        'minimum_initial_deposit',
        'minimum_milestone_threshold_percentage',
        'waterfall_auto_allocation',
        'is_active',
        'milestone_template',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'standard_target_amount' => 'decimal:2',
        'minimum_initial_deposit' => 'decimal:2',
        'minimum_milestone_threshold_percentage' => 'decimal:2',
        'waterfall_auto_allocation' => 'boolean',
        'is_active' => 'boolean',
        'milestone_template' => 'array',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($scheme) {
            if (empty($scheme->uuid)) {
                $scheme->uuid = (string) Str::uuid();
            }
            if (empty($scheme->scheme_code)) {
                $scheme->scheme_code = static::generateSchemeCode($scheme->project_type ?? 'RES');
            }
        });
    }

    public static function generateSchemeCode(string $prefix = 'CSS'): string
    {
        $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $prefix), 0, 4));
        $random = strtoupper(Str::random(4));
        return 'CSS-' . $code . '-' . $random;
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function savingsAccounts(): HasMany
    {
        return $this->hasMany(SavingsAccount::class, 'construction_saving_scheme_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ==========================================
    // STANDARD TEMPLATES GENERATOR
    // ==========================================

    public static function getStandardMilestoneTemplates(string $type = 'residential_villa'): array
    {
        return [
            [
                'tier_order' => 1,
                'name' => 'Substructure & Foundation',
                'weight_percentage' => 20.00,
                'description' => 'Site excavation, strip/pad footings, ground beam, damp-proof membrane, and ground slab casting.',
            ],
            [
                'tier_order' => 2,
                'name' => 'Superstructure & Framing',
                'weight_percentage' => 25.00,
                'description' => 'Reinforced concrete columns, ring beams, load-bearing masonry walls, and lintels.',
            ],
            [
                'tier_order' => 3,
                'name' => 'Roofing & Waterproofing',
                'weight_percentage' => 15.00,
                'description' => 'Roof trusses, timber/steel framing, roofing sheets/tiles, fascia, and gutters.',
            ],
            [
                'tier_order' => 4,
                'name' => 'MEP & Wall Plastering',
                'weight_percentage' => 15.00,
                'description' => 'Electrical conduit installation, plumbing pipework rough-in, and internal/external cement plaster.',
            ],
            [
                'tier_order' => 5,
                'name' => 'Finishing, Tiling & Glazing',
                'weight_percentage' => 15.00,
                'description' => 'Floor/wall tiling, ceiling boards, aluminum doors and windows, and base coat painting.',
            ],
            [
                'tier_order' => 6,
                'name' => 'Fittings, External Works & Handover',
                'weight_percentage' => 10.00,
                'description' => 'Sanitary fixtures, electrical fittings, perimeter fencing, compound paving, and clean-up for handover.',
            ],
        ];
    }
}
