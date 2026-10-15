<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EquipmentDispatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'equipment_dispatches';

    protected $fillable = [
        'uuid',
        'dispatch_number',
        'equipment_id',
        'from_site_id',
        'to_site_id',
        'project_id',
        'operator_id',
        'dispatched_by',
        'received_by',
        'dispatched_at',
        'expected_return_date',
        'actual_return_date',
        'status',
        'purpose',
        'transport_cost',
        'notes',
    ];

    protected $casts = [
        'dispatched_at' => 'datetime',
        'expected_return_date' => 'date',
        'actual_return_date' => 'date',
        'transport_cost' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($dispatch) {
            if (empty($dispatch->uuid)) {
                $dispatch->uuid = (string) Str::uuid();
            }

            if (empty($dispatch->dispatch_number)) {
                $dispatch->dispatch_number = static::generateDispatchNumber();
            }

            if (empty($dispatch->dispatched_at)) {
                $dispatch->dispatched_at = now();
            }

            if (auth()->check() && empty($dispatch->dispatched_by)) {
                $dispatch->dispatched_by = auth()->id();
            }
        });
    }

    public static function generateDispatchNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->dispatch_number, -4)) + 1 : 1;
        return 'DSP-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function fromSite(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'from_site_id');
    }

    public function toSite(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'to_site_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function dispatchedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispatched_by');
    }

    public function receivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /**
     * Mark dispatch active on destination site
     */
    public function markActiveOnSite(?int $receivedById = null): void
    {
        $this->update([
            'status' => 'active_on_site',
            'received_by' => $receivedById ?? auth()->id(),
        ]);

        if ($this->equipment) {
            $this->equipment->update([
                'current_site_id' => $this->to_site_id,
                'assigned_operator_id' => $this->operator_id ?? $this->equipment->assigned_operator_id,
                'status' => 'in_use',
            ]);
        }
    }

    /**
     * Mark dispatch returned from site
     */
    public function markReturned(): void
    {
        $this->update([
            'status' => 'returned',
            'actual_return_date' => now()->toDateString(),
        ]);

        if ($this->equipment) {
            $this->equipment->update([
                'status' => 'available',
            ]);
        }
    }
}
