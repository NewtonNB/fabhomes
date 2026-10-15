<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Equipment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'equipment';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'equipment_code',
        'name',
        'type',
        'model_number',
        'serial_number',
        'registration_number',
        'ownership_type',
        'hourly_rate',
        'daily_rate',
        'currency',
        'current_site_id',
        'assigned_operator_id',
        'status',
        'condition',
        'total_hours_operated',
        'last_service_date',
        'next_service_due_date',
        'purchase_date',
        'purchase_price',
        'supplier_or_vendor',
        'notes',
        'metadata',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'total_hours_operated' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'last_service_date' => 'date',
        'next_service_due_date' => 'date',
        'purchase_date' => 'date',
        'metadata' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($equipment) {
            if (empty($equipment->uuid)) {
                $equipment->uuid = (string) Str::uuid();
            }

            if (empty($equipment->equipment_code)) {
                $equipment->equipment_code = static::generateEquipmentCode();
            }

            if (auth()->check() && empty($equipment->created_by)) {
                $equipment->created_by = auth()->id();
            }
        });
    }

    /**
     * Generate unique equipment code: EQP-YYYYMMDD-XXXX
     */
    public static function generateEquipmentCode(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->equipment_code, -4)) + 1 : 1;
        return 'EQP-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Route model binding uses UUID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Relationships
     */
    public function currentSite(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'current_site_id');
    }

    public function assignedOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_operator_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(EquipmentDispatch::class, 'equipment_id');
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(EquipmentMaintenanceLog::class, 'equipment_id');
    }

    public function utilizationLogs(): HasMany
    {
        return $this->hasMany(EquipmentUtilizationLog::class, 'equipment_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Scopes
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeBySite($query, $siteId)
    {
        return $query->where('current_site_id', $siteId);
    }

    public function scopeNeedsService($query)
    {
        return $query->where('condition', 'needs_repair')
            ->orWhere(function ($q) {
                $q->whereNotNull('next_service_due_date')
                  ->where('next_service_due_date', '<=', now()->addDays(7));
            });
    }
}
