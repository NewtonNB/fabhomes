<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class SafetyIncident extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'safety_incidents';

    protected $fillable = [
        'uuid',
        'incident_number',
        'site_id',
        'project_id',
        'site_daily_log_id',
        'incident_type',
        'severity',
        'incident_date',
        'incident_time',
        'location_details',
        'title',
        'description',
        'immediate_actions_taken',
        'root_cause_analysis',
        'preventative_measures',
        'injured_person_name',
        'injured_person_type',
        'reported_by',
        'investigated_by',
        'investigated_at',
        'status',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'incident_date' => 'date',
        'investigated_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    /**
     * Boot model events for automatic UUID and incident_number generation.
     */
    protected static function booted(): void
    {
        static::creating(function (SafetyIncident $model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }

            if (empty($model->incident_number)) {
                $datePrefix = date('Ymd');
                $countToday = static::whereDate('created_at', today())->count() + 1;
                $model->incident_number = sprintf('INC-%s-%04d', $datePrefix, $countToday);
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
     * Start safety incident investigation.
     */
    public function startInvestigation(int $investigatorId): self
    {
        $this->update([
            'status' => 'investigating',
            'investigated_by' => $investigatorId,
            'investigated_at' => now(),
        ]);

        return $this;
    }

    /**
     * Close safety incident with root cause analysis & preventative actions.
     */
    public function closeIncident(int $closerId, ?string $rootCause = null, ?string $preventative = null): self
    {
        $data = [
            'status' => 'closed',
            'closed_at' => now(),
            'closed_by' => $closerId,
        ];

        if ($rootCause) {
            $data['root_cause_analysis'] = $rootCause;
        }

        if ($preventative) {
            $data['preventative_measures'] = $preventative;
        }

        $this->update($data);

        return $this;
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', ['reported', 'investigating', 'action_required']);
    }

    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity', 'critical');
    }

    public function scopeLostTime(Builder $query): Builder
    {
        return $query->where('incident_type', 'lost_time_injury');
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

    public function siteDailyLog(): BelongsTo
    {
        return $this->belongsTo(SiteDailyLog::class, 'site_daily_log_id');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function investigatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investigated_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
