<?php

namespace App\Services\Gateways;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Services\Gateways\Contracts\PaymentGatewayInterface;

class BankTransferAdapter implements PaymentGatewayInterface
{
    protected ?PaymentGatewayConfig $config;

    public function __construct(?PaymentGatewayConfig $config = null)
    {
        $this->config = $config ?? PaymentGatewayConfig::where('name', 'bank_transfer')->first();
    }

    public function getName(): string
    {
        return 'bank_transfer';
    }

    public function initiatePayment(PaymentIntent $intent): array
    {
        // Generates dedicated virtual account & payment voucher for bank counter deposit / EFT
        $accountNumber = '90300' . str_pad((string) ($intent->id ?? mt_rand(10000, 99999)), 5, '0', STR_PAD_LEFT);
        $bankRef = 'BNK-EFT-' . strtoupper(bin2hex(random_bytes(5)));

        return [
            'success' => true,
            'gateway_reference' => $bankRef,
            'bank_name' => 'Stanbic Bank Uganda Limited',
            'account_name' => 'FAB HOMES UGANDA CLIENT ESCROW',
            'account_number' => $accountNumber,
            'payment_reference' => $intent->intent_reference,
            'action_type' => 'bank_instructions',
            'status' => 'requires_action',
            'message' => sprintf(
                'Please transfer %s %s to Stanbic Bank A/C %s using Reference: %s',
                $intent->currency,
                number_format($intent->total_charge_amount, 2),
                $accountNumber,
                $intent->intent_reference
            ),
        ];
    }

    public function verifyPayment(PaymentIntent $intent): array
    {
        return [
            'success' => true,
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'settled',
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
        $refundRef = 'BNK-REV-' . strtoupper(bin2hex(random_bytes(5)));
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
        return !empty($payload['narration']) || !empty($payload['bank_reference']);
    }

    public function parseWebhookPayload(array $payload): array
    {
        return [
            'event' => 'bank.credit',
            'intent_reference' => $payload['narration'] ?? $payload['reference'] ?? null,
            'gateway_reference' => $payload['bank_reference'] ?? '',
            'status' => 'succeeded',
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'UGX',
        ];
    }
}
