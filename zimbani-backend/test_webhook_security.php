<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Models\PaymentWebhookLog;
use App\Services\PaymentProcessingService;
use App\Services\WebhookVerificationService;

echo "=== Testing Phase 10 Day 2: Universal Webhook Ingestion & Cryptographic Verification ===\n\n";

$webhookService = app(WebhookVerificationService::class);
$processingService = app(PaymentProcessingService::class);

$processingService->seedInitialGateways();
$client = Client::first();

// Test 1: Valid HMAC-SHA256 Webhook Ingestion
echo "1. Testing Cryptographically Valid Webhook Ingestion...\n";
$intent = $processingService->createPaymentIntent([
    'amount' => 1200000.00,
    'currency' => 'UGX',
    'gateway_name' => 'flutterwave',
    'payment_method' => 'card',
    'client_id' => $client?->id,
    'client_phone' => '+256772112233',
    'client_name' => 'Webhook Tester',
]);

$payload = [
    'event' => 'charge.completed',
    'data' => [
        'id' => 7712349,
        'tx_ref' => $intent->intent_reference,
        'flw_ref' => 'FLW-WEBHOOK-TEST-001',
        'status' => 'successful',
        'amount' => 1200000.00,
        'currency' => 'UGX',
        'customer' => [
            'email' => 'client@fabhomes.ug',
            'phone_number' => '+256772112233',
        ],
    ],
];
$secret = 'flw_secret_test_hash';
$validHeaders = ['verif-hash' => $secret];

$result = $webhookService->ingestWebhook('flutterwave', $payload, $validHeaders, '197.239.1.5');
assert($result['success'] === true, "Valid webhook must be processed successfully");
$intent->refresh();
assert($intent->status === 'succeeded', "Payment intent must be marked succeeded");

$log = PaymentWebhookLog::find($result['log_id']);
assert($log->signature_valid === true, "Signature must be flagged valid in log");
assert($log->is_replay === false, "First submission must not be flagged replay");
assert($log->processing_duration_ms >= 0, "Processing duration must be recorded");

echo "   Webhook Status: {$result['status']}\n";
echo "   Signature Verified: " . ($log->signature_valid ? "YES" : "NO") . "\n";
echo "   Payload Hash: " . substr($log->payload_hash, 0, 16) . "...\n";
echo "   Processing Latency: {$log->processing_duration_ms} ms\n";
echo "   Intent Status: {$intent->status}\n\n";

// Test 2: Forged / Invalid Signature Rejection
echo "2. Testing Forged Signature Rejection...\n";
$forgedHeaders = ['verif-hash' => 'hacker_forged_fake_signature_xyz'];
// Temporarily enforce signature verification
$flwConfig = PaymentGatewayConfig::where('name', 'flutterwave')->first();
$flwConfig->update(['enforce_signature' => true, 'environment' => 'production']);

$invalidResult = $webhookService->ingestWebhook('flutterwave', $payload, $forgedHeaders, '197.239.1.5');
assert($invalidResult['success'] === false, "Forged webhook must be rejected");

$invalidLog = PaymentWebhookLog::find($invalidResult['log_id']);
assert($invalidLog->signature_valid === false, "Signature must be marked invalid");
echo "   Rejection Message: {$invalidResult['message']}\n";
echo "   Log Status: {$invalidLog->status}\n";
echo "   Signature Valid Flag: " . ($invalidLog->signature_valid ? "TRUE" : "FALSE") . "\n\n";

// Restore sandbox mode
$flwConfig->update(['enforce_signature' => false, 'environment' => 'sandbox']);

// Test 3: Replay Attack Detection
echo "3. Testing Replay Attack Detection (Duplicate Payload Prevention)...\n";
// Re-submitting identical payload that was already processed in Test 1
$replayResult = $webhookService->ingestWebhook('flutterwave', $payload, $validHeaders, '197.239.1.5');
assert($replayResult['success'] === false, "Replay submission must be blocked");
assert($replayResult['status'] === 'ignored', "Replay submission status must be ignored");

$replayLog = PaymentWebhookLog::find($replayResult['log_id']);
assert($replayLog->is_replay === true, "is_replay flag must be set to true");
echo "   Replay Blocked: " . ($replayLog->is_replay ? "YES" : "NO") . "\n";
echo "   Replay Action: {$replayResult['status']}\n";
echo "   Message: {$replayResult['message']}\n\n";

// Test 4: IP Whitelist Enforcement
echo "4. Testing IP Whitelisting & Untrusted Host Blocking...\n";
$flwConfig->update([
    'enforce_ip_whitelist' => true,
    'ip_whitelist' => ['197.239.1.5', '197.239.1.6'], // Only allow these IPs
]);

$untrustedPayload = $payload;
$untrustedPayload['data']['id'] = 9988112; // New payload hash
$untrustedResult = $webhookService->ingestWebhook('flutterwave', $untrustedPayload, $validHeaders, '185.220.101.5'); // Rogue IP
assert($untrustedResult['success'] === false, "Untrusted IP must be rejected");

$untrustedLog = PaymentWebhookLog::find($untrustedResult['log_id']);
assert($untrustedLog->ip_whitelisted === false, "ip_whitelisted flag must be false");
echo "   Untrusted IP Blocked: {$untrustedLog->ip_address}\n";
echo "   Whitelist Flag: " . ($untrustedLog->ip_whitelisted ? "TRUE" : "FALSE") . "\n";
echo "   Rejection Reason: {$untrustedResult['message']}\n\n";

// Restore whitelist config
$flwConfig->update(['enforce_ip_whitelist' => false]);

// Test 5: Dead-Letter Queue & Manual Retry Engine
echo "5. Testing Dead-Letter Queue & Failed Webhook Retry...\n";
// Simulate a failed webhook log
$failedIntent = $processingService->createPaymentIntent([
    'amount' => 800000.00,
    'currency' => 'UGX',
    'gateway_name' => 'flutterwave',
    'payment_method' => 'card',
    'client_id' => $client?->id,
]);

$failedLog = PaymentWebhookLog::create([
    'provider' => 'flutterwave',
    'event_type' => 'charge.completed',
    'external_reference' => 'FLW-FAILED-001',
    'headers' => $validHeaders,
    'payload' => [
        'event' => 'charge.completed',
        'data' => [
            'id' => 8812736,
            'tx_ref' => $failedIntent->intent_reference,
            'status' => 'successful',
            'amount' => 800000.00,
            'currency' => 'UGX',
        ],
    ],
    'ip_address' => '127.0.0.1',
    'status' => 'failed',
    'signature_valid' => true,
    'processing_error' => 'Database deadlock simulated during initial ingestion',
    'payment_intent_id' => $failedIntent->id,
    'retry_count' => 0,
    'max_retries' => 5,
]);

echo "   Initial Dead-Letter Webhook Status: {$failedLog->status} (Error: {$failedLog->processing_error})\n";
$retryResult = $webhookService->retryFailedWebhook($failedLog->id);
assert($retryResult['success'] === true, "Manual retry must succeed");
$failedLog->refresh();
assert($failedLog->status === 'processed', "Failed log must now be processed");
$failedIntent->refresh();
assert($failedIntent->status === 'succeeded', "Failed intent must now be succeeded");
echo "   Post-Retry Webhook Status: {$failedLog->status}\n";
echo "   Recovered Payment Intent Status: {$failedIntent->status}\n\n";

// Test 6: Webhook Security & Ingestion Metrics
echo "6. Testing Webhook Security & Ingestion Metrics...\n";
$metrics = $webhookService->getWebhookMetrics();
assert($metrics['total_webhooks_received'] > 0, "Total webhooks must be > 0");
assert($metrics['replay_attacks_blocked'] >= 1, "At least 1 replay attack must be recorded");
assert($metrics['signature_rejections_count'] >= 1, "At least 1 signature rejection must be recorded");
echo "   Total Webhooks Received: {$metrics['total_webhooks_received']}\n";
echo "   Processed Count: {$metrics['processed_count']}\n";
echo "   Replay Attacks Blocked: {$metrics['replay_attacks_blocked']}\n";
echo "   Signature Rejections: {$metrics['signature_rejections_count']}\n";
echo "   Average Latency: {$metrics['average_latency_ms']} ms\n";
echo "   Overall Ingestion Success Rate: {$metrics['success_rate_percentage']}%\n\n";

echo "=== All 6 Phase 10 Day 2 Webhook Security & Verification Test Steps PASSED! ===\n";
