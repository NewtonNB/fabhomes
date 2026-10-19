<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Traits\LogsActivity;

class MilestoneProgressPhoto extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'milestone_progress_photos';

    protected $fillable = [
        'uuid',
        'milestone_verification_id',
        'milestone_id',
        'project_id',
        'site_id',
        'unit_id',
        'title',
        'caption',
        'photo_url',
        'thumbnail_url',
        'photo_stage',
        'captured_at',
        'gps_latitude',
        'gps_longitude',
        'gps_accuracy',
        'camera_make_model',
        'uploaded_by',
        'is_client_visible',
        'is_featured',
        'client_flagged',
        'client_flag_notes',
        'client_flagged_at',
        'client_flagged_by',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'gps_latitude' => 'decimal:7',
        'gps_longitude' => 'decimal:7',
        'gps_accuracy' => 'decimal:2',
        'is_client_visible' => 'boolean',
        'is_featured' => 'boolean',
        'client_flagged' => 'boolean',
        'client_flagged_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($photo) {
            if (empty($photo->uuid)) {
                $photo->uuid = (string) Str::uuid();
            }
            if (empty($photo->captured_at)) {
                $photo->captured_at = now();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships
    public function milestoneVerification(): BelongsTo
    {
        return $this->belongsTo(MilestoneVerification::class, 'milestone_verification_id');
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function clientFlaggedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_flagged_by');
    }

    // Scopes
    public function scopeClientVisible($query)
    {
        return $query->where('is_client_visible', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeFlagged($query)
    {
        return $query->where('client_flagged', true);
    }
}
