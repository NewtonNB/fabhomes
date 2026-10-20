<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MobileMoneyGateway extends Model
{
    use HasFactory;

    protected $table = 'mobile_money_gateways';

    protected $fillable = [
        'uuid',
        'provider',
        'account_name',
        'merchant_code',
        'api_user',
        'api_key_encrypted',
        'environment',
        'is_active',
        'currency',
        'daily_disbursement_limit',
        'current_daily_disbursed',
        'webhook_secret',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'daily_disbursement_limit' => 'decimal:2',
        'current_daily_disbursed' => 'decimal:2',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($gateway) {
            if (empty($gateway->uuid)) {
                $gateway->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Helper to detect provider from Uganda MSISDN.
     */
    public static function detectProviderFromPhone(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '256' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '7')) {
            $cleaned = '256' . $cleaned;
        }

        // MTN Uganda prefixes: 25677, 25678, 25676
        if (preg_match('/^256(77|78|76|39)/', $cleaned)) {
            return 'mtn_momo';
        }

        // Airtel Uganda prefixes: 25670, 25675, 25674
        if (preg_match('/^256(70|75|74)/', $cleaned)) {
            return 'airtel_money';
        }

        return 'mtn_momo'; // Default fallback
    }

    /**
     * Format phone number to standard international format (e.g. 256771234567).
     */
    public static function formatPhoneNumber(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($cleaned, '0')) {
            return '256' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '7')) {
            return '256' . $cleaned;
        } elseif (str_starts_with($cleaned, '+')) {
            return substr($cleaned, 1);
        }
        return $cleaned;
    }
}
