<?php

namespace App\Services\Gateways\Contracts;

use App\Models\PaymentIntent;

interface PaymentGatewayInterface
{
    /**
     * Get the unique gateway name identifier.
     */
    public function getName(): string;

    /**
     * Initiate payment transaction on gateway.
     */
    public function initiatePayment(PaymentIntent $intent): array;

    /**
     * Verify payment status directly against gateway API.
     */
    public function verifyPayment(PaymentIntent $intent): array;

    /**
     * Query gateway transaction status.
     */
    public function queryStatus(PaymentIntent $intent): array;

    /**
     * Process automated refund or partial reversal.
     */
    public function processRefund(PaymentIntent $intent, float $amount, string $reason): array;

    /**
     * Validate authenticity of webhook request payload & signature.
     */
    public function validateWebhook(array $payload, array $headers): bool;

    /**
     * Parse webhook payload into standardized result structure.
     */
    public function parseWebhookPayload(array $payload): array;
}
