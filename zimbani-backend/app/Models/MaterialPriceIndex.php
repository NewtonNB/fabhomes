<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialPriceIndex extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'material_price_indices';

    protected $fillable = [
        'uuid',
        'index_code',
        'name',
        'description',
        'project_type',
        'base_period',
        'base_index_value',
        'current_index_value',
        'escalation_percentage',
        'tolerance_threshold_percentage',
        'is_active',
        'last_calculated_at',
        'created_by',
    ];

    protected $casts = [
        'base_index_value' => 'decimal:4',
        'current_index_value' => 'decimal:4',
        'escalation_percentage' => 'decimal:2',
        'tolerance_threshold_percentage' => 'decimal:2',
        'is_active' => 'boolean',
        'last_calculated_at' => 'datetime',
    ];

    protected $appends = [
        'is_tolerance_exceeded',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->index_code)) {
                $model->index_code = 'MPI-' . strtoupper(Str::random(6));
            }
            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });
    }

    public function getIsToleranceExceededAttribute(): bool
    {
        return abs((float) $this->escalation_percentage) >= (float) $this->tolerance_threshold_percentage;
    }

    public function priceRecords(): HasMany
    {
        return $this->hasMany(MaterialPriceRecord::class, 'material_price_index_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Compute composite index value using weighted price ratios
     */
    public function recalculateIndex(): float
    {
        $records = $this->priceRecords()->get();
        if ($records->isEmpty()) {
            return (float) $this->base_index_value;
        }

        $compositeIndex = 0.0;
        foreach ($records as $record) {
            $basePrice = (float) $record->base_unit_price;
            $currentPrice = (float) $record->current_unit_price;
            $weight = (float) $record->basket_weight_percentage / 100.0;

            if ($basePrice > 0) {
                $priceRatio = $currentPrice / $basePrice;
                $compositeIndex += ($weight * $priceRatio * 100.0);
            }
        }

        $baseIndex = (float) $this->base_index_value > 0 ? (float) $this->base_index_value : 100.0;
        $escalationPct = round((($compositeIndex - $baseIndex) / $baseIndex) * 100, 2);

        $this->update([
            'current_index_value' => round($compositeIndex, 4),
            'escalation_percentage' => $escalationPct,
            'last_calculated_at' => now(),
        ]);

        return round($compositeIndex, 4);
    }
}
