<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MilestoneTriggerLog extends Model
{
    use HasFactory;

    protected $table = 'milestone_trigger_logs';

    protected $fillable = [
        'uuid',
        'milestone_verification_id',
        'milestone_payment_release_id',
        'savings_account_id',
        'trigger_event',
        'status',
        'escrow_balance',
        'required_amount',
        'shortfall_amount',
        'details',
        'triggered_by',
    ];

    protected $casts = [
        'escrow_balance' => 'decimal:2',
        'required_amount' => 'decimal:2',
        'shortfall_amount' => 'decimal:2',
        'details' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function ($log) {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // ==========================================
    // RELATIONSHIPS
    // ==========================================

    public function verification(): BelongsTo
    {
        return $this->belongsTo(MilestoneVerification::class, 'milestone_verification_id');
    }

    public function paymentRelease(): BelongsTo
    {
        return $this->belongsTo(MilestonePaymentRelease::class, 'milestone_payment_release_id');
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'savings_account_id');
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
