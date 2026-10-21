<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FxExchangeRate extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'fx_exchange_rates';

    protected $fillable = [
        'uuid',
        'base_currency',
        'target_currency',
        'spot_rate',
        'buy_rate',
        'sell_rate',
        'source',
        'rate_date',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'spot_rate' => 'decimal:6',
        'buy_rate' => 'decimal:6',
        'sell_rate' => 'decimal:6',
        'rate_date' => 'date',
        'is_active' => 'boolean',
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
            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForPair($query, string $base, string $target = 'UGX')
    {
        return $query->where('base_currency', strtoupper($base))
            ->where('target_currency', strtoupper($target));
    }
}
