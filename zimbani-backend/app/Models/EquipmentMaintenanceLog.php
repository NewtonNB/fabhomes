<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EquipmentMaintenanceLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'equipment_maintenance_logs';

    protected $fillable = [
        'uuid',
        'maintenance_number',
        'equipment_id',
        'maintenance_type',
        'status',
        'scheduled_date',
        'completed_date',
        'hours_at_maintenance',
        'cost',
        'currency',
        'service_provider',
        'performed_by',
        'description',
        'parts_replaced',
        'next_service_due_date',
        'notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'completed_date' => 'date',
        'next_service_due_date' => 'date',
        'hours_at_maintenance' => 'decimal:2',
        'cost' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($log) {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }

            if (empty($log->maintenance_number)) {
                $log->maintenance_number = static::generateMaintenanceNumber();
            }

            if (auth()->check() && empty($log->performed_by)) {
                $log->performed_by = auth()->id();
            }
        });
    }

    public static function generateMaintenanceNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->maintenance_number, -4)) + 1 : 1;
        return 'MNT-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function performedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Start maintenance work
     */
    public function startMaintenance(): void
    {
        $this->update(['status' => 'in_progress']);
        if ($this->equipment) {
            $this->equipment->update([
                'status' => 'under_maintenance',
                'condition' => 'needs_repair',
            ]);
        }
    }

    /**
     * Complete maintenance work
     */
    public function completeMaintenance(?string $nextDueDate = null, ?float $hours = null): void
    {
        $this->update([
            'status' => 'completed',
            'completed_date' => now()->toDateString(),
            'hours_at_maintenance' => $hours ?? $this->hours_at_maintenance,
            'next_service_due_date' => $nextDueDate ?? $this->next_service_due_date,
        ]);

        if ($this->equipment) {
            $this->equipment->update([
                'status' => 'available',
                'condition' => 'good',
                'last_service_date' => now()->toDateString(),
                'next_service_due_date' => $nextDueDate ?? $this->next_service_due_date,
            ]);
        }
    }
}
