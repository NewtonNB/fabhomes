<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class SiteDailyLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'site_daily_logs';

    protected $fillable = [
        'uuid',
        'log_number',
        'site_id',
        'project_id',
        'log_date',
        'weather_condition',
        'temperature_celsius',
        'work_delayed_by_weather',
        'delay_hours',
        'labor_headcount',
        'subcontractor_headcount',
        'work_performed_summary',
        'delays_or_impediments',
        'materials_received_notes',
        'equipment_on_site_notes',
        'visitors_log',
        'supervisor_id',
        'status',
        'submitted_at',
        'approved_at',
        'approved_by',
        'notes',
    ];

    protected $casts = [
        'log_date' => 'date',
        'temperature_celsius' => 'decimal:1',
        'work_delayed_by_weather' => 'boolean',
        'delay_hours' => 'decimal:2',
        'labor_headcount' => 'integer',
        'subcontractor_headcount' => 'integer',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    /**
     * Boot model events for automatic UUID and log_number generation.
     */
    protected static function booted(): void
    {
        static::creating(function (SiteDailyLog $model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }

            if (empty($model->log_number)) {
                $datePrefix = date('Ymd');
                $countToday = static::whereDate('created_at', today())->count() + 1;
                $model->log_number = sprintf('LOG-%s-%04d', $datePrefix, $countToday);
            }
        });
    }

    /**
     * Use UUID for route-model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // ==========================================
    // WORKFLOW TRANSITIONS
    // ==========================================

    /**
     * Submit log for supervisor review / management sign-off.
     */
    public function submit(): self
    {
        $this->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return $this;
    }

    /**
     * Approve submitted daily log.
     */
    public function approve(int $approverId, ?string $notes = null): self
    {
        $data = [
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $approverId,
        ];

        if ($notes) {
            $data['notes'] = $this->notes ? ($this->notes . "\n" . $notes) : $notes;
        }

        $this->update($data);

        return $this;
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeSubmitted(Builder $query): Builder
    {
        return $query->where('status', 'submitted');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    public function scopeDelayedByWeather(Builder $query): Builder
    {
        return $query->where('work_delayed_by_weather', true);
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function safetyIncidents(): HasMany
    {
        return $this->hasMany(SafetyIncident::class, 'site_daily_log_id');
    }

    public function toolboxTalks(): HasMany
    {
        return $this->hasMany(SafetyToolboxTalk::class, 'site_daily_log_id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
