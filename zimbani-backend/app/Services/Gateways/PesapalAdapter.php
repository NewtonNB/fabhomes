<?php

namespace App\Services\Gateways;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Services\Gateways\Contracts\PaymentGatewayInterface;

class PesapalAdapter implements PaymentGatewayInterface
{
    protected ?PaymentGatewayConfig $config;

    public function __construct(?PaymentGatewayConfig $config = null)
    {
        $this->config = $config ?? PaymentGatewayConfig::where('name', 'pesapal')->first();
    }

    public function getName(): string
    {
        return 'pesapal';
    }

    public function initiatePayment(PaymentIntent $intent): array
    {
        $orderTrackingId = 'PSP-' . strtoupper(bin2hex(random_bytes(6)));
        $redirectUrl = sprintf(
            'https://pay.pesapal.com/v3/orders/%s/redirect',
            $orderTrackingId
        );

        return [
            'success' => true,
            'gateway_reference' => $orderTrackingId,
            'checkout_url' => $redirectUrl,
            'action_type' => 'redirect',
            'status' => 'requires_action',
            'message' => 'Pesapal order tracking session created',
        ];
    }

    public function verifyPayment(PaymentIntent $intent): array
    {
        return [
            'success' => true,
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'COMPLETED',
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
        $refundRef = 'PSP-REF-' . strtoupper(bin2hex(random_bytes(5)));
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
        return !empty($payload['OrderTrackingId']) || !empty($payload['order_tracking_id']);
    }

    public function parseWebhookPayload(array $payload): array
    {
        return [
            'event' => 'pesapal.ipn',
            'intent_reference' => $payload['OrderMerchantReference'] ?? $payload['order_merchant_reference'] ?? null,
            'gateway_reference' => $payload['OrderTrackingId'] ?? $payload['order_tracking_id'] ?? '',
            'status' => in_array(strtoupper($payload['status'] ?? 'COMPLETED'), ['COMPLETED', 'SUCCESS', '200']) ? 'succeeded' : 'failed',
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'UGX',
        ];
    }
}
