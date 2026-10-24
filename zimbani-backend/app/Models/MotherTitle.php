<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MotherTitle extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'mother_titles';

    protected $fillable = [
        'uuid',
        'record_no',
        'phase',
        'scheme',
        'title_no',
        'block_no',
        'district',
        'sub_county',
        'village',
        'estate_name',
        'area_acres',
        'subdivision_date',
        'date_of_return',
        'new_plot_no',
        'title_status',
        'verified_by',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'area_acres' => 'decimal:2',
        'subdivision_date' => 'date',
        'date_of_return' => 'date',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->record_no)) {
                $count = static::withTrashed()->count() + 1;
                $model->record_no = 'MT-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(MotherTitleTransfer::class);
    }
}
