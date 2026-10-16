<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ExpenseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'expense_claim_id',
        'item_description',
        'expense_category',
        'quantity',
        'unit_of_measure',
        'unit_price',
        'total_price',
        'receipt_reference',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->uuid)) {
                $item->uuid = (string) Str::uuid();
            }

            $qty = (float) ($item->quantity ?? 1.00);
            $price = (float) ($item->unit_price ?? 0.00);
            $item->total_price = round($qty * $price, 2);
        });

        static::updating(function ($item) {
            if ($item->isDirty(['quantity', 'unit_price'])) {
                $qty = (float) ($item->quantity ?? 1.00);
                $price = (float) ($item->unit_price ?? 0.00);
                $item->total_price = round($qty * $price, 2);
            }
        });

        static::saved(function ($item) {
            $item->expenseClaim?->recalculateTotal();
        });

        static::deleted(function ($item) {
            $item->expenseClaim?->recalculateTotal();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function expenseClaim(): BelongsTo
    {
        return $this->belongsTo(ExpenseClaim::class);
    }
}
