<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MotherTitleTransfer extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'mother_title_transfers';

    protected $fillable = [
        'uuid',
        'mother_title_id',
        'date_taken',
        'date_of_return',
        'verified_by',
        'purpose',
        'status',
        'remarks',
    ];

    protected $casts = [
        'date_taken' => 'date',
        'date_of_return' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function motherTitle(): BelongsTo
    {
        return $this->belongsTo(MotherTitle::class);
    }
}
