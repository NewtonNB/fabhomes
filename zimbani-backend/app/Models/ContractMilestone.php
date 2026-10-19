<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Traits\LogsActivity;

class ContractMilestone extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'contract_milestones';

    protected $fillable = [
        'uuid',
        'contract_id',
        'milestone_id',
        'allocated_amount',
        'weight_percentage',
        'start_date',
        'due_date',
        'status',
        'certified_amount',
        'paid_amount',
        'notes',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'weight_percentage' => 'decimal:2',
        'certified_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'start_date' => 'date',
        'due_date' => 'date',
    ];

    protected $appends = [
        'remaining_to_certify',
        'percentage_certified',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($cm) {
            if (empty($cm->uuid)) {
                $cm->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Appended calculated attributes
    public function getRemainingToCertifyAttribute(): float
    {
        return max(0.0, (float) $this->allocated_amount - (float) $this->certified_amount);
    }

    public function getPercentageCertifiedAttribute(): float
    {
        if ((float) $this->allocated_amount <= 0) {
            return 0.0;
        }

        return round(((float) $this->certified_amount / (float) $this->allocated_amount) * 100, 2);
    }

    // Relationships
    public function contract(): BelongsTo
    {
        return $this->belongsTo(SubcontractorContract::class, 'contract_id');
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ConstructionMilestone::class, 'milestone_id');
    }

    public function paymentCertificates(): HasMany
    {
        return $this->hasMany(PaymentCertificate::class, 'milestone_id', 'milestone_id');
    }
}
