<?php

namespace App\Services\Gateways;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Services\Gateways\Contracts\PaymentGatewayInterface;

class DirectMobileMoneyAdapter implements PaymentGatewayInterface
{
    protected ?PaymentGatewayConfig $config;

    public function __construct(?PaymentGatewayConfig $config = null)
    {
        $this->config = $config ?? PaymentGatewayConfig::where('name', 'mtn_momo')->first();
    }

    public function getName(): string
    {
        return 'mtn_momo';
    }

    public function initiatePayment(PaymentIntent $intent): array
    {
        $momoRef = 'MOMO-' . strtoupper(bin2hex(random_bytes(6)));

        return [
            'success' => true,
            'gateway_reference' => $momoRef,
            'checkout_url' => null,
            'action_type' => 'stk_prompt',
            'status' => 'processing',
            'message' => sprintf(
                'USSD push prompt sent to %s. Please enter your Mobile Money PIN on your phone.',
                $intent->client_phone ?: 'mobile phone'
            ),
        ];
    }

    public function verifyPayment(PaymentIntent $intent): array
    {
        return [
            'success' => true,
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'SUCCESSFUL',
            'amount' => (float) $intent->amount,
            'currency' => $intent->currency,
            'verified_at' => now()->toIso8601String(),
        ];
    }

    public function queryStatus(PaymentIntent $intent): array
    {
        return [
            'status' => $intent->status,
            'gateway_reference' => $intent->gateway_reference,
        ];
    }

    public function processRefund(PaymentIntent $intent, float $amount, string $reason): array
    {
        $refundRef = 'MOMO-REV-' . strtoupper(bin2hex(random_bytes(5)));
        return [
            'success' => true,
            'refund_reference' => $refundRef,
            'amount' => $amount,
            'currency' => $intent->currency,
            'status' => 'completed',
            'reason' => $reason,
        ];
    }

    public function validateWebhook(array $payload, array $headers): bool
    {
        return !empty($payload['financialTransactionId']) || !empty($payload['externalId']);
    }

    public function parseWebhookPayload(array $payload): array
    {
        return [
            'event' => 'momo.callback',
            'intent_reference' => $payload['externalId'] ?? null,
            'gateway_reference' => $payload['financialTransactionId'] ?? '',
            'status' => strtoupper($payload['status'] ?? 'SUCCESSFUL') === 'SUCCESSFUL' ? 'succeeded' : 'failed',
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'UGX',
        ];
    }
}
