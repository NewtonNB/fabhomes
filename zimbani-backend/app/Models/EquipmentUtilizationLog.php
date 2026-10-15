<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EquipmentUtilizationLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'equipment_utilization_logs';

    protected $fillable = [
        'uuid',
        'log_number',
        'equipment_id',
        'site_id',
        'project_id',
        'task_id',
        'operator_id',
        'date',
        'start_meter_reading',
        'end_meter_reading',
        'hours_operated',
        'hourly_rate',
        'fuel_litres_used',
        'total_cost',
        'purpose',
        'logged_by',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'start_meter_reading' => 'decimal:2',
        'end_meter_reading' => 'decimal:2',
        'hours_operated' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'fuel_litres_used' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($log) {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }

            if (empty($log->log_number)) {
                $log->log_number = static::generateLogNumber();
            }

            if (empty($log->date)) {
                $log->date = now()->toDateString();
            }

            if (auth()->check() && empty($log->logged_by)) {
                $log->logged_by = auth()->id();
            }

            // Fallback hourly rate from equipment
            if (empty($log->hourly_rate) && $log->equipment_id) {
                $eq = Equipment::find($log->equipment_id);
                if ($eq && $eq->hourly_rate) {
                    $log->hourly_rate = $eq->hourly_rate;
                }
            }

            // Auto calculate total cost
            if (empty($log->total_cost) && $log->hours_operated && $log->hourly_rate) {
                $log->total_cost = (float) $log->hours_operated * (float) $log->hourly_rate;
            }
        });

        static::created(function ($log) {
            // Increment total hours operated on equipment
            if ($log->equipment_id && $log->hours_operated > 0) {
                $eq = Equipment::find($log->equipment_id);
                if ($eq) {
                    $eq->increment('total_hours_operated', (float) $log->hours_operated);
                }
            }
        });

        static::deleted(function ($log) {
            // Roll back total hours operated on cancellation
            if ($log->equipment_id && $log->hours_operated > 0) {
                $eq = Equipment::find($log->equipment_id);
                if ($eq && $eq->total_hours_operated >= (float) $log->hours_operated) {
                    $eq->decrement('total_hours_operated', (float) $log->hours_operated);
                }
            }
        });
    }

    public static function generateLogNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->log_number, -4)) + 1 : 1;
        return 'UTL-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function loggedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
