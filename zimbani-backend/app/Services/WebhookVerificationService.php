<?php

namespace App\Services;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Models\PaymentWebhookLog;
use App\Services\Gateways\PaymentGatewayManager;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookVerificationService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager,
        protected PaymentProcessingService $processingService
    ) {}

    /**
     * Verify cryptographic signature, replay attack, and IP whitelist.
     */
    public function verifyWebhookSecurity(
        string $gatewayName,
        array $payload,
        array $headers,
        ?string $clientIp = null
    ): array {
        $config = PaymentGatewayConfig::where('name', $gatewayName)->first();
        $payloadString = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $payloadHash = hash('sha256', $payloadString ?: '');

        // 1. Replay Attack Detection
        $replayWindow = $config?->replay_window_seconds ?? 300;
        $recentMatch = PaymentWebhookLog::where('payload_hash', $payloadHash)
            ->where('provider', $gatewayName)
            ->where('created_at', '>=', Carbon::now()->subSeconds($replayWindow))
            ->where('status', 'processed')
            ->first();

        $isReplay = (bool) $recentMatch;

        // 2. Cryptographic Signature Verification
        $signatureValid = false;
        $signatureHeader = null;

        $secret = $config?->webhook_secret ?? 'flw_secret_test_hash';

        // Check common webhook signature headers
        foreach (['verif-hash', 'x-flutterwave-signature', 'x-signature', 'x-webhook-signature', 'signature'] as $key) {
            if (isset($headers[$key])) {
                $signatureHeader = is_array($headers[$key]) ? $headers[$key][0] : $headers[$key];
                break;
            }
        }

        if ($signatureHeader) {
            // Verify HMAC-SHA256 signature or shared secret hash
            $expectedHmac = hash_hmac('sha256', $payloadString ?: '', $secret);
            if (hash_equals($signatureHeader, $secret) || hash_equals($signatureHeader, $expectedHmac)) {
                $signatureValid = true;
            }
        }

        // Sandbox fallback: If gateway is in sandbox or enforce_signature is false, allow structured payloads
        if (!$signatureValid && ($config && !$config->enforce_signature || $config?->environment === 'sandbox')) {
            $adapter = $this->gatewayManager->driver($gatewayName);
            $signatureValid = $adapter->validateWebhook($payload, $headers);
        }

        // 3. IP Whitelist Verification
        $ipWhitelisted = true;
        if ($config && $config->enforce_ip_whitelist && !empty($config->ip_whitelist)) {
            $allowedIps = $config->ip_whitelist;
            $ipWhitelisted = in_array($clientIp, $allowedIps, true);
        }

        $isValid = ($signatureValid && !$isReplay && $ipWhitelisted);

        return [
            'is_valid' => $isValid,
            'signature_valid' => $signatureValid,
            'signature_hash' => $signatureHeader,
            'payload_hash' => $payloadHash,
            'is_replay' => $isReplay,
            'ip_whitelisted' => $ipWhitelisted,
            'error' => !$signatureValid
                ? 'Invalid cryptographic signature'
                : ($isReplay ? 'Replay attack blocked: duplicate payload detected' : (!$ipWhitelisted ? 'Untrusted IP address' : null)),
        ];
    }

    /**
     * Ingest incoming webhook with full security verification and telemetry.
     */
    public function ingestWebhook(
        string $gatewayName,
        array $payload,
        array $headers,
        ?string $clientIp = null
    ): array {
        $startTime = microtime(true);
        $clientIp = $clientIp ?: (request()->ip() ?? '127.0.0.1');

        $security = $this->verifyWebhookSecurity($gatewayName, $payload, $headers, $clientIp);
        $adapter = $this->gatewayManager->driver($gatewayName);
        $parsed = $adapter->parseWebhookPayload($payload);

        $intentRef = $parsed['intent_reference'] ?? null;
        $paymentIntent = null;
        if ($intentRef) {
            $paymentIntent = PaymentIntent::where('intent_reference', $intentRef)->first();
        }

        // Initial Webhook Log creation
        $webhookLog = PaymentWebhookLog::create([
            'provider' => $gatewayName,
            'event_type' => $parsed['event'] ?? 'charge.event',
            'external_reference' => $parsed['gateway_reference'] ?? null,
            'headers' => $headers,
            'payload' => $payload,
            'ip_address' => $clientIp,
            'status' => 'received',
            'signature_valid' => $security['signature_valid'],
            'signature_hash' => $security['signature_hash'],
            'payload_hash' => $security['payload_hash'],
            'is_replay' => $security['is_replay'],
            'ip_whitelisted' => $security['ip_whitelisted'],
            'payment_intent_id' => $paymentIntent?->id,
            'processing_duration_ms' => 0,
        ]);

        // If security failed or replay attack detected
        if (!$security['is_valid']) {
            $duration = (int) round((microtime(true) - $startTime) * 1000);
            $webhookLog->update([
                'status' => $security['is_replay'] ? 'ignored' : 'failed',
                'processing_error' => $security['error'],
                'processing_duration_ms' => $duration,
            ]);

            return [
                'success' => false,
                'status' => $security['is_replay'] ? 'ignored' : 'rejected',
                'message' => $security['error'],
                'log_id' => $webhookLog->id,
            ];
        }

        // Process matching PaymentIntent
        try {
            if ($paymentIntent && $parsed['status'] === 'succeeded') {
                $this->processingService->confirmPaymentIntent($paymentIntent->id, $parsed);
            }

            $duration = (int) round((microtime(true) - $startTime) * 1000);
            $webhookLog->update([
                'status' => 'processed',
                'processed_at' => Carbon::now(),
                'processing_duration_ms' => $duration,
            ]);

            return [
                'success' => true,
                'status' => 'processed',
                'message' => 'Webhook validated and ledger updated successfully',
                'log_id' => $webhookLog->id,
                'intent_reference' => $intentRef,
            ];
        } catch (\Throwable $e) {
            $duration = (int) round((microtime(true) - $startTime) * 1000);
            $webhookLog->update([
                'status' => 'failed',
                'processing_error' => $e->getMessage(),
                'processing_duration_ms' => $duration,
                'retry_count' => 1,
                'next_retry_at' => Carbon::now()->addMinutes(1),
            ]);

            Log::error("Failed to process webhook ID [{$webhookLog->id}]: " . $e->getMessage());

            return [
                'success' => false,
                'status' => 'queued_for_retry',
                'message' => 'Processing error: ' . $e->getMessage(),
                'log_id' => $webhookLog->id,
            ];
        }
    }

    /**
     * Manually or automatically retry a failed webhook.
     */
    public function retryFailedWebhook(int $webhookLogId): array
    {
        $log = PaymentWebhookLog::with('paymentIntent')->findOrFail($webhookLogId);

        if (!$log->canRetry()) {
            return [
                'success' => false,
                'message' => 'Webhook has reached maximum retries or is not in a failed state',
            ];
        }

        $startTime = microtime(true);
        $adapter = $this->gatewayManager->driver($log->provider);
        $parsed = $adapter->parseWebhookPayload($log->payload);
        $intentRef = $parsed['intent_reference'] ?? null;

        $intent = $log->paymentIntent;
        if (!$intent && $intentRef) {
            $intent = PaymentIntent::where('intent_reference', $intentRef)->first();
        }

        try {
            if ($intent && $parsed['status'] === 'succeeded') {
                $this->processingService->confirmPaymentIntent($intent->id, $parsed);
            }

            $duration = (int) round((microtime(true) - $startTime) * 1000);
            $log->update([
                'status' => 'processed',
                'processed_at' => Carbon::now(),
                'processing_error' => null,
                'processing_duration_ms' => $duration,
            ]);

            return [
                'success' => true,
                'message' => 'Webhook reprocessed and payment intent settled successfully',
                'log' => $log->fresh(),
            ];
        } catch (\Throwable $e) {
            $duration = (int) round((microtime(true) - $startTime) * 1000);
            $nextRetry = Carbon::now()->addMinutes(min(60, pow(2, $log->retry_count) * 2));

            $log->update([
                'retry_count' => $log->retry_count + 1,
                'next_retry_at' => $nextRetry,
                'processing_error' => 'Retry failed: ' . $e->getMessage(),
                'processing_duration_ms' => $duration,
            ]);

            return [
                'success' => false,
                'message' => 'Retry attempt failed: ' . $e->getMessage(),
                'next_retry_at' => $nextRetry->toIso8601String(),
            ];
        }
    }

    /**
     * Get Paginated Webhook Telemetry Logs.
     */
    public function getWebhookTelemetry(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = PaymentWebhookLog::with(['paymentIntent.client', 'paymentIntent.project'])
            ->latest();

        if (!empty($filters['provider'])) {
            $query->where('provider', $filters['provider']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['signature_valid'])) {
            $query->where('signature_valid', (bool) $filters['signature_valid']);
        }

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('external_reference', 'like', "%{$s}%")
                  ->orWhere('ip_address', 'like', "%{$s}%")
                  ->orWhere('payload_hash', 'like', "%{$s}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Global Webhook Ingestion & Security Metrics.
     */
    public function getWebhookMetrics(): array
    {
        $totalReceived = PaymentWebhookLog::count();
        $processed = PaymentWebhookLog::where('status', 'processed')->count();
        $failed = PaymentWebhookLog::where('status', 'failed')->count();
        $replaysBlocked = PaymentWebhookLog::where('is_replay', true)->count();
        $signatureRejected = PaymentWebhookLog::where('signature_valid', false)->count();

        $avgDuration = (float) PaymentWebhookLog::where('processing_duration_ms', '>', 0)
            ->avg('processing_duration_ms');

        return [
            'total_webhooks_received' => $totalReceived,
            'processed_count' => $processed,
            'failed_count' => $failed,
            'replay_attacks_blocked' => $replaysBlocked,
            'signature_rejections_count' => $signatureRejected,
            'average_latency_ms' => round($avgDuration, 1),
            'success_rate_percentage' => $totalReceived > 0
                ? round(($processed / $totalReceived) * 100, 1)
                : 100.0,
        ];
    }
}
