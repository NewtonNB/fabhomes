<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class OtherFeeCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'code',
        'name',
        'description',
        'standard_amount',
        'is_mandatory',
        'is_active',
    ];

    protected $casts = [
        'standard_amount' => 'decimal:2',
        'is_mandatory' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function ($cat) {
            if (empty($cat->uuid)) {
                $cat->uuid = (string) Str::uuid();
            }
        });
    }

    public function fees(): HasMany
    {
        return $this->hasMany(OtherFee::class, 'category_code', 'code');
    }
}
