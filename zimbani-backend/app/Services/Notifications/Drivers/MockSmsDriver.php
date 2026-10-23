<?php

namespace App\Services\Notifications\Drivers;

use App\Services\Notifications\Contracts\SmsDriverInterface;
use Illuminate\Support\Str;

class MockSmsDriver implements SmsDriverInterface
{
    protected float $defaultCostUgx = 45.00; // Standard East Africa local SMS tariff

    public function sendSms(string $to, string $message): array
    {
        // Sanitize recipient
        $cleanPhone = preg_replace('/[^\d+]/', '', $to);

        // Fail simulation if number is explicitly set to test invalid
        if (str_contains($cleanPhone, '000000')) {
            return [
                'success' => false,
                'gateway_provider' => 'mock_sms_gateway',
                'message_id' => null,
                'cost_ugx' => 0.00,
                'error' => 'Invalid destination number or network unreachable',
                'raw' => ['status' => 'failed', 'recipient' => $cleanPhone],
            ];
        }

        $messageId = 'AT-MOCK-' . Str::upper(Str::random(12));

        return [
            'success' => true,
            'gateway_provider' => 'mock_sms_gateway',
            'message_id' => $messageId,
            'cost_ugx' => $this->defaultCostUgx,
            'error' => null,
            'raw' => [
                'status' => 'success',
                'recipient' => $cleanPhone,
                'message_parts' => ceil(mb_strlen($message) / 160),
                'gateway_status' => 'Sent',
                'network_code' => str_starts_with($cleanPhone, '+25677') || str_starts_with($cleanPhone, '+25678') ? 'MTN_UG' : 'AIRTEL_UG',
            ],
        ];
    }
}
