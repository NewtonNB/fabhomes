<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialPriceRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'material_price_records';

    protected $fillable = [
        'uuid',
        'material_price_index_id',
        'material_id',
        'item_code',
        'item_name',
        'unit_of_measure',
        'basket_weight_percentage',
        'base_unit_price',
        'current_unit_price',
        'price_variance_percentage',
        'currency',
        'survey_source',
        'effective_date',
        'recorded_by',
    ];

    protected $casts = [
        'basket_weight_percentage' => 'decimal:2',
        'base_unit_price' => 'decimal:2',
        'current_unit_price' => 'decimal:2',
        'price_variance_percentage' => 'decimal:2',
        'effective_date' => 'date',
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
            if (empty($model->recorded_by) && auth()->check()) {
                $model->recorded_by = auth()->id();
            }
        });
    }

    public function priceIndex(): BelongsTo
    {
        return $this->belongsTo(MaterialPriceIndex::class, 'material_price_index_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
