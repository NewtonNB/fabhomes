<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Material extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'materials';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'material_code',
        'name',
        'category',
        'unit_of_measure',
        'unit_cost',
        'currency',
        'site_id',
        'current_stock',
        'minimum_stock_level',
        'reorder_quantity',
        'storage_location',
        'supplier_name',
        'supplier_contact',
        'description',
        'status',
        'metadata',
        'created_by',
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'unit_cost' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'minimum_stock_level' => 'decimal:2',
        'reorder_quantity' => 'decimal:2',
        'metadata' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($material) {
            if (empty($material->uuid)) {
                $material->uuid = (string) Str::uuid();
            }

            if (empty($material->material_code)) {
                $material->material_code = static::generateMaterialCode();
            }

            if (auth()->check() && empty($material->created_by)) {
                $material->created_by = auth()->id();
            }

            $material->updateStatusFromStock();
        });

        static::updating(function ($material) {
            if (auth()->check()) {
                $material->updated_by = auth()->id();
            }

            $material->updateStatusFromStock();
        });
    }

    /**
     * Automatically update status according to current stock vs minimum stock level.
     */
    public function updateStatusFromStock(): void
    {
        if ($this->status === 'discontinued') {
            return;
        }

        $stock = (float) $this->current_stock;
        $min = (float) $this->minimum_stock_level;

        if ($stock <= 0) {
            $this->status = 'out_of_stock';
        } elseif ($min > 0 && $stock <= $min) {
            $this->status = 'low_stock';
        } else {
            $this->status = 'in_stock';
        }
    }

    /**
     * Generate unique material code: MAT-YYYYMMDD-XXXX
     */
    public static function generateMaterialCode(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->material_code, -4)) + 1 : 1;
        return 'MAT-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Route model binding uses UUID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Associated site (nullable for central warehouse/catalog).
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Material usages / consumption logs.
     */
    public function usages(): HasMany
    {
        return $this->hasMany(MaterialUsage::class, 'material_id');
    }

    /**
     * User who created the record.
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated the record.
     */
    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Polymorphic documents & specification sheets.
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Adjust stock level by a delta and save.
     */
    public function adjustStock(float $delta, string $reason = ''): void
    {
        $this->current_stock = max(0, (float) $this->current_stock + $delta);
        $this->updateStatusFromStock();
        $this->save();
    }
}
