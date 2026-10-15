<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class SafetyToolboxTalk extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'safety_toolbox_talks';

    protected $fillable = [
        'uuid',
        'talk_number',
        'site_id',
        'project_id',
        'site_daily_log_id',
        'conducted_by',
        'topic',
        'category',
        'conducted_at',
        'duration_minutes',
        'attendees_count',
        'attendees_names',
        'key_discussion_points',
        'hazards_identified',
        'supervisor_notes',
    ];

    protected $casts = [
        'conducted_at' => 'date',
        'duration_minutes' => 'integer',
        'attendees_count' => 'integer',
        'attendees_names' => 'array',
    ];

    /**
     * Boot model events for automatic UUID and talk_number generation.
     */
    protected static function booted(): void
    {
        static::creating(function (SafetyToolboxTalk $model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }

            if (empty($model->talk_number)) {
                $datePrefix = date('Ymd');
                $countToday = static::whereDate('created_at', today())->count() + 1;
                $model->talk_number = sprintf('TLK-%s-%04d', $datePrefix, $countToday);
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

    public function conductedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducted_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
