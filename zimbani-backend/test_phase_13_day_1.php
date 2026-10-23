<?php

/**
 * Phase 13 Day 1 Verification Script
 * Multi-Channel Notification Dispatcher Engine, Channel Adapters, and Preferences
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AppNotification;
use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\NotificationDispatchLog;
use App\Models\User;
use App\Services\Notifications\Drivers\MockSmsDriver;
use App\Services\Notifications\Drivers\BrandedEmailDriver;
use App\Services\Notifications\NotificationDispatcherService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

echo "\n========================================================\n";
echo "   PHASE 13 DAY 1: MULTI-CHANNEL NOTIFICATIONS TEST    \n";
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

// 1. Setup Test User & Client
$testEmail = 'notify.test.' . Str::random(6) . '@fabhomes.ug';
$testPhone = '+25677' . rand(1000000, 9999999);

$user = User::create([
    'name' => 'Notification Test Client',
    'email' => $testEmail,
    'phone' => $testPhone,
    'password' => Hash::make('Secret123!'),
    'status' => 'active',
]);

$client = Client::create([
    'user_id' => $user->id,
    'client_number' => 'CLT-' . rand(10000, 99999),
    'first_name' => 'Notification',
    'last_name' => 'Recipient',
    'email' => $testEmail,
    'phone_primary' => $testPhone,
    'country' => 'Uganda',
    'status' => 'active',
]);

$securityProfile = ClientSecurityProfile::create([
    'user_id' => $user->id,
    'client_id' => $client->id,
    'notification_channels' => [
        'sms' => true,
        'email' => true,
        'push' => true,
        'whatsapp' => false,
    ],
]);

assertCondition($user->id > 0, "Test user registered with ID: {$user->id}", $passCount, $failCount);
assertCondition($client->id > 0, "Linked client registered with number: {$client->client_number}", $passCount, $failCount);

// 2. Initialize Dispatcher Service
$smsDriver = new MockSmsDriver();
$emailDriver = new BrandedEmailDriver();
$dispatcher = new NotificationDispatcherService($smsDriver, $emailDriver);

// Test 1: Direct multi-channel dispatch
$res1 = $dispatcher->dispatchToUser($user, [
    'type' => 'welcome_onboarding',
    'title' => 'Welcome to Fab Homes Portal',
    'message' => 'Your estate account has been activated with Quick-PIN capabilities.',
    'category' => 'general',
    'priority' => 'normal',
    'action_url' => '/client-portal',
]);

assertCondition(isset($res1['notification']) && $res1['notification'] instanceof AppNotification, "Notification record created", $passCount, $failCount);
assertCondition(!empty($res1['notification']->uuid), "Notification has valid UUID: {$res1['notification']->uuid}", $passCount, $failCount);
assertCondition($res1['channels']['in_app']['status'] === 'delivered', "In-App delivery status is delivered", $passCount, $failCount);
assertCondition($res1['channels']['sms']['status'] === 'delivered', "SMS delivery status is delivered via mock gateway", $passCount, $failCount);
assertCondition(str_starts_with($res1['channels']['sms']['message_id'], 'AT-MOCK-'), "SMS gateway generated unique message ID", $passCount, $failCount);
assertCondition($res1['channels']['email']['status'] === 'delivered', "Email delivery status is delivered", $passCount, $failCount);

// Verify dispatch logs
$logs = NotificationDispatchLog::where('notification_id', $res1['notification']->id)->get();
assertCondition($logs->count() >= 3, "At least 3 channel dispatch logs recorded (in_app, sms, email)", $passCount, $failCount);

$smsLog = $logs->where('channel', 'sms')->first();
assertCondition($smsLog && $smsLog->cost_ugx == 45.00, "SMS dispatch log records correct 45.00 UGX cost", $passCount, $failCount);

// Test 2: Channel Preference Enforcement
$securityProfile->update([
    'notification_channels' => [
        'sms' => false, // explicitly disabled
        'email' => true,
        'push' => true,
    ],
]);

$res2 = $dispatcher->dispatchToUser($user, [
    'type' => 'security_notice',
    'title' => 'Security PIN Updated',
    'message' => 'Your Quick-PIN was updated from device iPhone 14 Pro.',
    'category' => 'security',
]);

$logs2 = NotificationDispatchLog::where('notification_id', $res2['notification']->id)->get();
$smsLog2 = $logs2->where('channel', 'sms')->first();
assertCondition($smsLog2 && $smsLog2->status === 'skipped_preference', "SMS dispatch correctly skipped due to client preference", $passCount, $failCount);
assertCondition(isset($res2['channels']['email']) && $res2['channels']['email']['status'] === 'delivered', "Email channel still dispatched based on preferences", $passCount, $failCount);

// Test 3: Domain Dispatchers
// Savings deposit
$resSavings = $dispatcher->notifySavingsDeposit($user, 3500000, 'SA-2026-9921', 12500000);
assertCondition($resSavings['notification']->category === 'financial', "Savings deposit notification has 'financial' category", $passCount, $failCount);
assertCondition(str_contains($resSavings['notification']->message, '3,500,000 UGX'), "Savings deposit notification formats currency nicely", $passCount, $failCount);

// Milestone approval
$resMilestone = $dispatcher->notifyMilestoneApprovalRequired(
    $user,
    'Substructure & Foundation',
    'Lake View Heights Estate',
    8500000,
    Str::uuid()->toString()
);
assertCondition($resMilestone['notification']->priority === 'high', "Milestone approval notification has 'high' priority", $passCount, $failCount);
assertCondition($resMilestone['notification']->category === 'construction', "Milestone approval has 'construction' category", $passCount, $failCount);
assertCondition(str_contains($resMilestone['notification']->action_url, 'tab=milestones'), "Milestone notification links to milestones tab", $passCount, $failCount);

// Plot reserved
$resPlot = $dispatcher->notifyPlotReserved($user, 'A-12', 'Lake View Heights Estate', 14);
assertCondition($resPlot['notification']->category === 'legal', "Plot reservation has 'legal' category", $passCount, $failCount);

// Deed status
$resDeed = $dispatcher->notifyDeedStatus($user, 'DEED-2026-0042', 'deed_plan_approved');
assertCondition(str_contains($resDeed['notification']->message, 'Ministry Deed Plan Approved'), "Deed status correctly maps readable human label", $passCount, $failCount);

// Support reply
$resSupport = $dispatcher->notifySupportReply($user, 'TCK-2026-0012', 'Roof Truss Inquiry', 'Sarah Nambi');
assertCondition($resSupport['notification']->category === 'support', "Support reply has 'support' category", $passCount, $failCount);

// Test 4: Management Methods (Unread Summary, Mark as Read, Dismiss)
$summary = $dispatcher->getUnreadSummary($user);
assertCondition($summary['unread_count'] >= 7, "Unread count correctly aggregates ({$summary['unread_count']} unread)", $passCount, $failCount);
assertCondition($summary['category_unread']['financial'] >= 1, "Category count accurately reflects financial alerts", $passCount, $failCount);
assertCondition($summary['category_unread']['construction'] >= 1, "Category count accurately reflects construction alerts", $passCount, $failCount);

// Mark as read
$singleNotif = $resSavings['notification'];
$readNotif = $dispatcher->markAsRead($user, $singleNotif->id);
assertCondition(!is_null($readNotif->read_at), "Single notification marked as read with timestamp", $passCount, $failCount);

// Dismiss
$dismissedNotif = $dispatcher->dismiss($user, $resPlot['notification']->id);
assertCondition($dismissedNotif->is_dismissed === true, "Notification successfully dismissed", $passCount, $failCount);

// Bulk mark all as read
$markedCount = $dispatcher->markAllAsRead($user);
assertCondition($markedCount >= 5, "Bulk markAllAsRead updated {$markedCount} records", $passCount, $failCount);

$postSummary = $dispatcher->getUnreadSummary($user);
assertCondition($postSummary['unread_count'] === 0, "Unread count is now 0 after bulk read", $passCount, $failCount);

// Test 5: API Controller Endpoints Simulation
$controller = new \App\Http\Controllers\Api\NotificationController($dispatcher);

$requestIndex = \Illuminate\Http\Request::create('/api/v1/notifications', 'GET');
$requestIndex->setUserResolver(fn() => $user);
$responseIndex = $controller->index($requestIndex);
$indexData = $responseIndex->getData(true);
assertCondition($responseIndex->getStatusCode() === 200, "GET /api/v1/notifications returns HTTP 200", $passCount, $failCount);
assertCondition(isset($indexData['data']['data']) && count($indexData['data']['data']) > 0, "Index returns paginated array of notifications", $passCount, $failCount);

$requestSummary = \Illuminate\Http\Request::create('/api/v1/notifications/summary', 'GET');
$requestSummary->setUserResolver(fn() => $user);
$responseSummary = $controller->summary($requestSummary);
$summaryData = $responseSummary->getData(true);
assertCondition($responseSummary->getStatusCode() === 200, "GET /api/v1/notifications/summary returns HTTP 200", $passCount, $failCount);
assertCondition(isset($summaryData['data']['unread_count']), "Summary payload contains unread_count key", $passCount, $failCount);

$requestTest = \Illuminate\Http\Request::create('/api/v1/notifications/dispatch-test', 'POST', [
    'title' => 'Direct API Test Notification',
    'message' => 'Testing programmatic dispatch endpoint.',
    'category' => 'general',
    'channels' => ['in_app', 'sms'],
]);
$requestTest->setUserResolver(fn() => $user);
$responseTest = $controller->dispatchTest($requestTest);
assertCondition($responseTest->getStatusCode() === 201, "POST /api/v1/notifications/dispatch-test returns HTTP 201 Created", $passCount, $failCount);

$requestLogs = \Illuminate\Http\Request::create('/api/v1/notifications/dispatch-logs', 'GET');
$requestLogs->setUserResolver(fn() => $user);
$responseLogs = $controller->dispatchLogs($requestLogs);
$logsData = $responseLogs->getData(true);
assertCondition($responseLogs->getStatusCode() === 200, "GET /api/v1/notifications/dispatch-logs returns HTTP 200", $passCount, $failCount);
assertCondition(isset($logsData['data']['data']) && count($logsData['data']['data']) > 0, "Dispatch logs audit query returns historical entries", $passCount, $failCount);

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "--------------------------------------------------------\n\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
