<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentIntent extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'payment_intents';

    protected $fillable = [
        'uuid',
        'intent_reference',
        'client_id',
        'user_id',
        'company_id',
        'project_id',
        'unit_id',
        'savings_account_id',
        'milestone_savings_pool_id',
        'payment_id',
        'gateway_name',
        'payment_method',
        'amount',
        'currency',
        'fee_amount',
        'total_charge_amount',
        'client_phone',
        'client_email',
        'client_name',
        'status',
        'gateway_reference',
        'gateway_checkout_url',
        'gateway_response',
        'failure_reason',
        'expires_at',
        'succeeded_at',
        'failed_at',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'total_charge_amount' => 'decimal:2',
        'gateway_response' => 'array',
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'succeeded_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->intent_reference)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->intent_reference = sprintf('INT-%s%02d-%04d', date('Y'), date('m'), $count);
            }
            if (empty($model->expires_at)) {
                $model->expires_at = Carbon::now()->addMinutes(45);
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class);
    }

    public function milestoneSavingsPool(): BelongsTo
    {
        return $this->belongsTo(MilestoneSavingsPool::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && Carbon::now()->greaterThan($this->expires_at);
    }

    public function canBeProcessed(): bool
    {
        return in_array($this->status, ['requires_payment_method', 'requires_action', 'processing']) && !$this->isExpired();
    }
}
