<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentGatewayConfig extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'payment_gateway_configs';

    protected $fillable = [
        'uuid',
        'name',
        'display_name',
        'provider_type',
        'is_active',
        'is_default',
        'environment',
        'public_key',
        'secret_key',
        'encryption_key',
        'webhook_secret',
        'merchant_id',
        'api_endpoint',
        'supported_currencies',
        'supported_methods',
        'transaction_fee_percentage',
        'flat_fee',
        'min_transaction_amount',
        'max_transaction_amount',
        'display_order',
        'instructions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'supported_currencies' => 'array',
        'supported_methods' => 'array',
        'transaction_fee_percentage' => 'decimal:2',
        'flat_fee' => 'decimal:2',
        'min_transaction_amount' => 'decimal:2',
        'max_transaction_amount' => 'decimal:2',
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

    /**
     * Scope active gateways.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('display_order');
    }

    /**
     * Compute processing fee for an amount.
     */
    public function calculateFee(float $amount): float
    {
        $percentageFee = round(($amount * (float) $this->transaction_fee_percentage) / 100, 2);
        return round($percentageFee + (float) $this->flat_fee, 2);
    }
}
