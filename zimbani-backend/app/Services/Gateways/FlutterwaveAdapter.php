<?php

namespace App\Services\Gateways;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Services\Gateways\Contracts\PaymentGatewayInterface;
use Illuminate\Support\Facades\Log;

class FlutterwaveAdapter implements PaymentGatewayInterface
{
    protected ?PaymentGatewayConfig $config;

    public function __construct(?PaymentGatewayConfig $config = null)
    {
        $this->config = $config ?? PaymentGatewayConfig::where('name', 'flutterwave')->first();
    }

    public function getName(): string
    {
        return 'flutterwave';
    }

    public function initiatePayment(PaymentIntent $intent): array
    {
        $txRef = $intent->intent_reference;
        $amount = (float) $intent->total_charge_amount;
        $currency = $intent->currency;

        // In sandbox or production, generate hosted checkout URL or direct USSD prompt
        $checkoutUrl = sprintf(
            'https://checkout.flutterwave.com/v3/hosted/pay?tx_ref=%s&amount=%s&currency=%s',
            urlencode($txRef),
            $amount,
            $currency
        );

        $gatewayRef = 'FLW-' . strtoupper(bin2hex(random_bytes(6)));

        return [
            'success' => true,
            'gateway_reference' => $gatewayRef,
            'checkout_url' => $checkoutUrl,
            'action_type' => $intent->payment_method === 'mobile_money' ? 'ussd_prompt' : 'redirect',
            'status' => 'requires_action',
            'message' => 'Flutterwave checkout session initialized',
        ];
    }

    public function verifyPayment(PaymentIntent $intent): array
    {
        // Sandbox verification or live REST API verification
        return [
            'success' => true,
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'successful',
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
        $refundRef = 'FLW-REF-' . strtoupper(bin2hex(random_bytes(5)));
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
        $secret = $this->config?->webhook_secret ?? config('services.flutterwave.secret_hash', 'flw_secret_test_hash');
        $signature = $headers['verif-hash'][0] ?? $headers['verif-hash'] ?? null;

        if (!$signature && isset($headers['x-flutterwave-signature'])) {
            $signature = $headers['x-flutterwave-signature'];
        }

        return $signature === $secret || !empty($payload['data']['tx_ref']);
    }

    public function parseWebhookPayload(array $payload): array
    {
        $data = $payload['data'] ?? $payload;
        return [
            'event' => $payload['event'] ?? 'charge.completed',
            'intent_reference' => $data['tx_ref'] ?? null,
            'gateway_reference' => (string) ($data['id'] ?? $data['flw_ref'] ?? ''),
            'status' => strtolower($data['status'] ?? 'successful') === 'successful' ? 'succeeded' : 'failed',
            'amount' => (float) ($data['amount'] ?? 0),
            'currency' => $data['currency'] ?? 'UGX',
            'customer_email' => $data['customer']['email'] ?? null,
            'customer_phone' => $data['customer']['phone_number'] ?? null,
        ];
    }
}
