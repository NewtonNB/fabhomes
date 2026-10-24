<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Employee extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'employees';

    protected $fillable = [
        'uuid',
        'employee_number',
        'user_id',
        'department_id',
        'first_name',
        'last_name',
        'nin',
        'gender',
        'phone',
        'email',
        'district',
        'position',
        'salary_grade',
        'base_salary',
        'date_joined',
        'status',
        'digital_signature',
        'metadata',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'date_joined' => 'date',
        'metadata' => 'array',
    ];

    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->employee_number)) {
                $count = static::withTrashed()->count() + 1;
                $model->employee_number = 'EMP-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(EmployeeLeaveRequest::class);
    }
}
