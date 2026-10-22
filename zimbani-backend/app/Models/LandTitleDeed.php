<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LandTitleDeed extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'land_title_deeds';

    protected $fillable = [
        'uuid',
        'deed_number',
        'title_number',
        'unit_id',
        'client_id',
        'project_id',
        'tenure_type',
        'overall_stage',
        'overall_progress_percentage',
        'cadastral_survey_status',
        'cadastral_survey_date',
        'surveyor_name',
        'boundary_opening_status',
        'beacon_coordinates',
        'mutation_status',
        'ministry_zonal_office',
        'zonal_reference_number',
        'submission_date',
        'approval_date',
        'deed_plan_status',
        'deed_plan_number',
        'deed_plan_date',
        'title_registration_status',
        'registration_date',
        'handover_status',
        'handover_date',
        'document_id',
        'estimated_completion_date',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'cadastral_survey_date' => 'date',
        'submission_date' => 'date',
        'approval_date' => 'date',
        'deed_plan_date' => 'date',
        'registration_date' => 'date',
        'handover_date' => 'date',
        'estimated_completion_date' => 'date',
        'overall_progress_percentage' => 'integer',
        'beacon_coordinates' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->deed_number)) {
                $model->deed_number = 'DEED-' . date('Y') . '-' . strtoupper(Str::random(6));
            }
            if (empty($model->overall_progress_percentage)) {
                $model->overall_progress_percentage = static::calculateProgressPercentage($model->overall_stage);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('overall_stage') && !$model->isDirty('overall_progress_percentage')) {
                $model->overall_progress_percentage = static::calculateProgressPercentage($model->overall_stage);
            }
        });
    }

    public static function calculateProgressPercentage(string $stage): int
    {
        return match ($stage) {
            'boundary_survey' => 20,
            'ministry_mutation' => 45,
            'deed_plan' => 65,
            'title_registration' => 85,
            'deed_handover' => 100,
            default => 10,
        };
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
