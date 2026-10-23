<?php

/**
 * Phase 13 Day 2 Verification Script
 * WhatsApp Business Cloud API & Webhooks Ingestion
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AppNotification;
use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\NotificationDispatchLog;
use App\Models\SavingsAccount;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppWebhookLog;
use App\Services\Notifications\Drivers\MockWhatsAppDriver;
use App\Services\Notifications\NotificationDispatcherService;
use App\Services\Notifications\WhatsAppWebhookService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

echo "\n========================================================\n";
echo "   PHASE 13 DAY 2: WHATSAPP CLOUD API & WEBHOOKS TEST   \n";
echo "========================================================\n\n";

$passCount = 0;
$failCount = 0;

function assertCondition(bool $condition, string $message, &$passCount, &$failCount) {
    if ($condition) {
        echo " [PASS] {$message}\n";
        $passCount++;
    } else {
        echo " [FAIL] {$message}\n";
        $failCount++;
    }
}

// 1. Setup Test User, Client & Savings Account
$testEmail = 'wa.test.' . Str::random(6) . '@fabhomes.ug';
$testPhone = '+25678' . rand(1000000, 9999999);

$user = User::create([
    'name' => 'WhatsApp Test Client',
    'email' => $testEmail,
    'phone' => $testPhone,
    'password' => Hash::make('Secret123!'),
    'status' => 'active',
]);

$client = Client::create([
    'user_id' => $user->id,
    'client_number' => 'CLT-WA-' . rand(1000, 9999),
    'first_name' => 'WhatsApp',
    'last_name' => 'Subscriber',
    'email' => $testEmail,
    'phone_primary' => $testPhone,
    'country' => 'Uganda',
    'status' => 'active',
]);

$savingsAccount = SavingsAccount::create([
    'uuid' => (string) Str::uuid(),
    'client_id' => $client->id,
    'account_number' => 'SA-WA-' . rand(1000, 9999),
    'scheme_type' => 'construction_saving',
    'target_amount' => 50000000,
    'current_balance' => 14500000,
    'status' => 'active',
]);

$securityProfile = ClientSecurityProfile::create([
    'user_id' => $user->id,
    'client_id' => $client->id,
    'notification_channels' => [
        'sms' => true,
        'email' => true,
        'whatsapp' => true,
        'push' => true,
    ],
]);

assertCondition($user->id > 0, "Test user registered with phone: {$testPhone}", $passCount, $failCount);
assertCondition($savingsAccount->current_balance == 14500000, "Savings account seeded with 14,500,000 UGX", $passCount, $failCount);

// 2. Service Initialization
$mockDriver = new MockWhatsAppDriver();
$webhookService = new WhatsAppWebhookService($mockDriver);

// 3. Webhook Challenge Verification (GET)
$challengeCode = 'CHALLENGE_CODE_' . Str::random(10);
$token = config('services.whatsapp.verify_token', env('WHATSAPP_VERIFY_TOKEN', 'fab_homes_meta_token_2026'));

$validReq = Request::create('/api/v1/webhooks/whatsapp', 'GET', [
    'hub_mode' => 'subscribe',
    'hub_verify_token' => $token,
    'hub_challenge' => $challengeCode,
]);
$verifiedChallenge = $webhookService->verifyChallenge($validReq);
assertCondition($verifiedChallenge === $challengeCode, "Valid webhook challenge correctly verified and echoed", $passCount, $failCount);

$invalidReq = Request::create('/api/v1/webhooks/whatsapp', 'GET', [
    'hub_mode' => 'subscribe',
    'hub_verify_token' => 'invalid_tampered_token',
    'hub_challenge' => $challengeCode,
]);
$failedChallenge = $webhookService->verifyChallenge($invalidReq);
assertCondition($failedChallenge === null, "Invalid webhook challenge correctly rejected", $passCount, $failCount);

// 4. HMAC-SHA256 Cryptographic Signature Verification (POST)
$testPayload = json_encode(['entry' => [['id' => '123456789']]]);
$appSecret = config('services.whatsapp.app_secret', env('WHATSAPP_APP_SECRET', 'fab_meta_secret_2026'));
$validSig = 'sha256=' . hash_hmac('sha256', $testPayload, $appSecret);
$invalidSig = 'sha256=' . hash_hmac('sha256', $testPayload, 'wrong_secret_key');

assertCondition($webhookService->verifySignature($testPayload, $validSig) === true, "Valid HMAC-SHA256 signature accepted", $passCount, $failCount);
assertCondition($webhookService->verifySignature($testPayload, $invalidSig) === false, "Forged signature rejected", $passCount, $failCount);
assertCondition($webhookService->verifySignature($testPayload, null) === false, "Missing signature header rejected", $passCount, $failCount);

// 5. Outbound WhatsApp Template Dispatch
$outboundMsg = $webhookService->dispatchTemplate(
    $testPhone,
    'savings_deposit_receipt',
    ['amount' => '3,500,000 UGX', 'balance' => '14,500,000 UGX'],
    [['sub_type' => 'quick_reply', 'payload' => 'VIEW_LEDGER']],
    $user,
    $client
);

assertCondition($outboundMsg->id > 0, "Outbound WhatsApp message created in database", $passCount, $failCount);
assertCondition($outboundMsg->status === 'sent', "Outbound message initial status is 'sent'", $passCount, $failCount);
assertCondition(str_starts_with($outboundMsg->wa_message_id, 'wamid.HBg'), "Generated valid Meta wamid identifier", $passCount, $failCount);

// 6. Ingestion: Message Delivery Status Callback (Delivered -> Read)
$wamid = $outboundMsg->wa_message_id;
$deliveryPayload = [
    'entry' => [
        [
            'id' => '123456789',
            'changes' => [
                [
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'metadata' => ['display_phone_number' => '256312000000', 'phone_number_id' => '1001'],
                        'statuses' => [
                            [
                                'id' => $wamid,
                                'status' => 'delivered',
                                'timestamp' => (string) time(),
                                'recipient_id' => preg_replace('/[^\d]/', '', $testPhone),
                            ],
                        ],
                    ],
                    'field' => 'messages',
                ],
            ],
        ],
    ],
];

$resDelivery = $webhookService->processWebhook($deliveryPayload, true);
assertCondition($resDelivery['status'] === 'processed', "Delivery status webhook processed successfully", $passCount, $failCount);

$outboundMsg->refresh();
assertCondition($outboundMsg->status === 'delivered', "WhatsApp message status updated to 'delivered'", $passCount, $failCount);
assertCondition(!is_null($outboundMsg->delivered_at), "Delivered timestamp successfully populated", $passCount, $failCount);

// Read receipt
$readPayload = [
    'entry' => [
        [
            'id' => '123456789',
            'changes' => [
                [
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'statuses' => [
                            [
                                'id' => $wamid,
                                'status' => 'read',
                                'timestamp' => (string) (time() + 15),
                                'recipient_id' => preg_replace('/[^\d]/', '', $testPhone),
                            ],
                        ],
                    ],
                    'field' => 'messages',
                ],
            ],
        ],
    ],
];
$webhookService->processWebhook($readPayload, true);
$outboundMsg->refresh();
assertCondition($outboundMsg->status === 'read', "WhatsApp message status transitioned to 'read'", $passCount, $failCount);
assertCondition(!is_null($outboundMsg->read_at), "Read timestamp successfully populated", $passCount, $failCount);

// 7. Ingestion: Inbound Interactive Quick-Reply Button Click
$buttonPayload = [
    'entry' => [
        [
            'id' => '123456789',
            'changes' => [
                [
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'messages' => [
                            [
                                'from' => preg_replace('/[^\d]/', '', $testPhone),
                                'id' => 'wamid.IN.BTN.' . Str::random(12),
                                'timestamp' => (string) time(),
                                'type' => 'interactive',
                                'interactive' => [
                                    'type' => 'button_reply',
                                    'button_reply' => [
                                        'id' => 'VIEW_LEDGER',
                                        'title' => 'View Ledger',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'field' => 'messages',
                ],
            ],
        ],
    ],
];

$resBtn = $webhookService->processWebhook($buttonPayload, true);
assertCondition($resBtn['status'] === 'processed', "Inbound button reply webhook processed successfully", $passCount, $failCount);

$inboundBtnMsg = WhatsAppMessage::where('message_type', 'button_reply')
    ->where('phone_number', 'LIKE', '%' . preg_replace('/[^\d]/', '', $testPhone) . '%')
    ->first();
assertCondition($inboundBtnMsg !== null, "Inbound button message recorded in database", $passCount, $failCount);
assertCondition($inboundBtnMsg->body === 'VIEW_LEDGER', "Inbound button payload correctly captured as 'VIEW_LEDGER'", $passCount, $failCount);

// 8. Ingestion: Inbound Keyword Text Commands ("BALANCE")
$balancePayload = [
    'entry' => [
        [
            'id' => '123456789',
            'changes' => [
                [
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'messages' => [
                            [
                                'from' => preg_replace('/[^\d]/', '', $testPhone),
                                'id' => 'wamid.IN.TXT.' . Str::random(12),
                                'timestamp' => (string) time(),
                                'type' => 'text',
                                'text' => [
                                    'body' => 'BALANCE',
                                ],
                            ],
                        ],
                    ],
                    'field' => 'messages',
                ],
            ],
        ],
    ],
];

$resBalance = $webhookService->processWebhook($balancePayload, true);
assertCondition($resBalance['status'] === 'processed', "Inbound 'BALANCE' keyword webhook processed", $passCount, $failCount);

$inboundTxtMsg = WhatsAppMessage::where('body', 'BALANCE')
    ->where('phone_number', 'LIKE', '%' . preg_replace('/[^\d]/', '', $testPhone) . '%')
    ->latest()
    ->first();
assertCondition($inboundTxtMsg !== null, "Inbound text message stored with direction 'inbound'", $passCount, $failCount);
assertCondition($inboundTxtMsg->user_id === $user->id, "Message automatically mapped to registered User ID", $passCount, $failCount);

// 9. Integration with NotificationDispatcherService
$dispatcher = new NotificationDispatcherService(null, null, $mockDriver);
$dispatchResult = $dispatcher->dispatchToUser($user, [
    'type' => 'savings_deposit',
    'title' => 'Savings Deposit Received',
    'message' => 'Your payment of 2,000,000 UGX was credited.',
    'channels' => ['in_app', 'whatsapp'],
]);

assertCondition(isset($dispatchResult['channels']['whatsapp']), "WhatsApp channel included in dispatch results", $passCount, $failCount);
assertCondition($dispatchResult['channels']['whatsapp']['status'] === 'dispatched', "WhatsApp channel status is 'dispatched'", $passCount, $failCount);

$dispatchLog = NotificationDispatchLog::where('notification_id', $dispatchResult['notification']->id)
    ->where('channel', 'whatsapp')
    ->first();
assertCondition($dispatchLog !== null, "NotificationDispatchLog record created for WhatsApp channel", $passCount, $failCount);
assertCondition(str_starts_with($dispatchLog->gateway_message_id, 'wamid.HBg'), "Gateway message ID recorded in dispatch log", $passCount, $failCount);

// 10. Webhook Audit Logs
$webhookLogsCount = WhatsAppWebhookLog::count();
assertCondition($webhookLogsCount >= 4, "WhatsAppWebhookLog captured all incoming webhook events ({$webhookLogsCount} logs)", $passCount, $failCount);

// 11. Controller Endpoints Verification
$controller = new \App\Http\Controllers\Api\WhatsAppWebhookController($webhookService);

// GET Webhook Verify
$reqGet = Request::create('/api/v1/webhooks/whatsapp', 'GET', [
    'hub_mode' => 'subscribe',
    'hub_verify_token' => $token,
    'hub_challenge' => 'VERIFY_ME_123',
]);
$respGet = $controller->verify($reqGet);
assertCondition($respGet->getStatusCode() === 200, "GET /api/v1/webhooks/whatsapp returns HTTP 200", $passCount, $failCount);
assertCondition($respGet->getContent() === 'VERIFY_ME_123', "GET response content matches challenge code exactly", $passCount, $failCount);

// POST Webhook Ingestion
$rawJson = json_encode($balancePayload);
$authenticSig = 'sha256=' . hash_hmac('sha256', $rawJson, $appSecret);
$reqPost = Request::create(
    '/api/v1/webhooks/whatsapp',
    'POST',
    [],
    [],
    [],
    ['HTTP_X_HUB_SIGNATURE_256' => $authenticSig],
    $rawJson
);
$respPost = $controller->handle($reqPost);
assertCondition($respPost->getStatusCode() === 200, "POST /api/v1/webhooks/whatsapp returns HTTP 200 OK", $passCount, $failCount);

// POST Send Template
$reqTpl = Request::create('/api/v1/whatsapp/send-template', 'POST', [
    'to' => $testPhone,
    'template_name' => 'milestone_approval_prompt',
    'parameters' => ['Foundation', '5,000,000 UGX'],
]);
$reqTpl->setUserResolver(fn() => $user);
$respTpl = $controller->sendTemplate($reqTpl);
assertCondition($respTpl->getStatusCode() === 201, "POST /api/v1/whatsapp/send-template returns HTTP 201 Created", $passCount, $failCount);

// GET Messages
$reqMsgs = Request::create('/api/v1/whatsapp/messages', 'GET');
$reqMsgs->setUserResolver(fn() => $user);
$respMsgs = $controller->getMessages($reqMsgs);
$msgsData = $respMsgs->getData(true);
assertCondition($respMsgs->getStatusCode() === 200, "GET /api/v1/whatsapp/messages returns HTTP 200", $passCount, $failCount);
assertCondition(isset($msgsData['data']) && count($msgsData['data']) > 0, "Messages history contains client conversation records", $passCount, $failCount);

// GET Webhooks Log
$reqLogs = Request::create('/api/v1/whatsapp/webhooks-log', 'GET');
$reqLogs->setUserResolver(fn() => $user);
$respLogs = $controller->getWebhookLogs($reqLogs);
assertCondition($respLogs->getStatusCode() === 200, "GET /api/v1/whatsapp/webhooks-log returns HTTP 200", $passCount, $failCount);

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "--------------------------------------------------------\n\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
