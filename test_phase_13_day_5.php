<?php

/**
 * Phase 13 Day 5 Verification Test Suite
 * Notification Preferences, Delivery Logs, Analytics & Campaign Management
 */

require_once __DIR__ . '/zimbani-backend/vendor/autoload.php';
$app = require_once __DIR__ . '/zimbani-backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\NotificationController;
use App\Models\AppNotification;
use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\NotificationCampaign;
use App\Models\NotificationDispatchLog;
use App\Models\PlotReservation;
use App\Models\SavingsAccount;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Services\Notifications\NotificationDispatcherService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$totalTests = 0;
$passedTests = 0;

function assertTest(string $description, bool $condition, string $detail = ''): void {
    global $totalTests, $passedTests;
    $totalTests++;
    if ($condition) {
        $passedTests++;
        echo "  [PASS] {$description}\n";
    } else {
        echo "  [FAIL] {$description} : {$detail}\n";
    }
}

echo "\n=======================================================\n";
echo "  PHASE 13 DAY 5: PREFERENCES, ANALYTICS & CAMPAIGNS TEST\n";
echo "=======================================================\n\n";

DB::beginTransaction();

try {
    // ------------------------------------------------------------------------
    // SETUP: Test Fixtures
    // ------------------------------------------------------------------------
    echo "--- 1. Setting Up Test Fixtures ---\n";

    $suffix = rand(1000, 9999);
    $user = User::create([
        'name' => "Pref Tester {$suffix}",
        'email' => "preftest{$suffix}@zimbani.com",
        'phone' => "+25678888{$suffix}",
        'password' => bcrypt('secret123'),
        'status' => 'active',
    ]);
    assertTest("User fixture created", $user->id > 0);

    $client = Client::create([
        'user_id' => $user->id,
        'client_number' => "CL-PREF-{$suffix}",
        'first_name' => "Preference",
        'last_name' => "Tester",
        'email' => $user->email,
        'phone_primary' => $user->phone,
        'status' => 'active',
        'kyc_status' => 'verified',
    ]);
    assertTest("Client fixture created", $client->id > 0);

    $profile = ClientSecurityProfile::create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'notification_channels' => ['sms' => true, 'email' => true, 'whatsapp' => false],
    ]);
    assertTest("ClientSecurityProfile fixture created", $profile->id > 0);

    // ------------------------------------------------------------------------
    // SECTION 2: UserNotificationPreference Model & Defaults
    // ------------------------------------------------------------------------
    echo "\n--- 2. Testing UserNotificationPreference Model & Defaults ---\n";

    $defaultChannels = UserNotificationPreference::getDefaultChannels();
    $defaultCategories = UserNotificationPreference::getDefaultCategories();

    assertTest("Default channels has sms, email, whatsapp, push, in_app", 
        isset($defaultChannels['sms'], $defaultChannels['email'], $defaultChannels['whatsapp'], $defaultChannels['push'], $defaultChannels['in_app']));
    assertTest("Default categories has financial, construction, legal, support, general",
        isset($defaultCategories['financial'], $defaultCategories['construction'], $defaultCategories['legal'], $defaultCategories['support'], $defaultCategories['general']));

    $pref = UserNotificationPreference::create([
        'user_id' => $user->id,
        'channels' => ['sms' => false, 'email' => true, 'whatsapp' => true],
        'categories' => ['financial' => true, 'general' => false],
        'quiet_hours_enabled' => true,
        'quiet_hours_start' => '23:00',
        'quiet_hours_end' => '06:00',
        'timezone' => 'Africa/Kampala',
    ]);

    assertTest("UserNotificationPreference created with UUID", !empty($pref->uuid));
    assertTest("UserNotificationPreference user relation works", $pref->user->id === $user->id);
    assertTest("Quiet hours enabled is true", $pref->quiet_hours_enabled === true);

    // ------------------------------------------------------------------------
    // SECTION 3: NotificationDispatcherService Preferences API
    // ------------------------------------------------------------------------
    echo "\n--- 3. Testing Dispatcher Preferences Management ---\n";

    $dispatcher = app(NotificationDispatcherService::class);

    $resolvedPrefs = $dispatcher->getUserPreferences($user);
    assertTest("getUserPreferences returns channels array", isset($resolvedPrefs['channels']));
    assertTest("getUserPreferences honors user preference (sms is false)", $resolvedPrefs['channels']['sms'] === false);
    assertTest("getUserPreferences honors user preference (whatsapp is true)", $resolvedPrefs['channels']['whatsapp'] === true);
    assertTest("getUserPreferences returns quiet_hours", isset($resolvedPrefs['quiet_hours_start']) && $resolvedPrefs['quiet_hours_start'] === '23:00');

    // Update preferences via service
    $updatedPrefs = $dispatcher->updateUserPreferences($user, [
        'channels' => ['sms' => true, 'whatsapp' => false],
        'quiet_hours_enabled' => false,
    ]);
    assertTest("updateUserPreferences updates sms to true", $updatedPrefs['channels']['sms'] === true);
    assertTest("updateUserPreferences updates whatsapp to false", $updatedPrefs['channels']['whatsapp'] === false);
    assertTest("updateUserPreferences syncs to ClientSecurityProfile", 
        ClientSecurityProfile::where('user_id', $user->id)->first()->notification_channels['sms'] === true);

    // ------------------------------------------------------------------------
    // SECTION 4: Dispatch Log Filtering & Retry Engine
    // ------------------------------------------------------------------------
    echo "\n--- 4. Testing Dispatch Log Filtering & Retry Engine ---\n";

    // Create a dummy notification
    $notification = AppNotification::create([
        'user_id' => $user->id,
        'client_id' => $client->id,
        'type' => 'system_notice',
        'title' => 'Test Retry Notice',
        'message' => 'This is a test notification for retry engine',
        'category' => 'general',
    ]);

    // Create a failed SMS dispatch log
    $failedLog = NotificationDispatchLog::create([
        'notification_id' => $notification->id,
        'recipient_type' => 'User',
        'recipient_id' => $user->id,
        'recipient_phone' => $user->phone,
        'recipient_email' => $user->email,
        'channel' => 'sms',
        'status' => 'failed',
        'gateway_provider' => 'mock_driver',
        'error_message' => 'Simulated gateway network timeout',
        'cost_ugx' => 50.00,
        'dispatched_at' => Carbon::now()->subMinutes(15),
    ]);
    assertTest("Failed dispatch log fixture created", $failedLog->id > 0 && $failedLog->status === 'failed');

    // Test getDispatchLogs with filters
    $filteredLogs = $dispatcher->getDispatchLogs([
        'channel' => 'sms',
        'status' => 'failed',
        'search' => $user->phone,
    ]);
    assertTest("getDispatchLogs filtered query returns results", $filteredLogs->total() >= 1);
    assertTest("Filtered log has channel = sms", $filteredLogs->first()->channel === 'sms');
    assertTest("Filtered log has status = failed", $filteredLogs->first()->status === 'failed');

    // Retry the failed log
    $retriedLog = $dispatcher->retryDispatchLog($failedLog->id);
    assertTest("retryDispatchLog transitions status to delivered", $retriedLog->status === 'delivered');
    assertTest("retryDispatchLog clears error_message", empty($retriedLog->error_message));
    assertTest("retryDispatchLog sets gateway_message_id", !empty($retriedLog->gateway_message_id));

    // ------------------------------------------------------------------------
    // SECTION 5: Notification Analytics & Telemetry Engine
    // ------------------------------------------------------------------------
    echo "\n--- 5. Testing Notification Analytics & Telemetry Engine ---\n";

    $analytics = $dispatcher->getNotificationAnalytics();
    assertTest("Analytics returns total_dispatches", isset($analytics['total_dispatches']) && $analytics['total_dispatches'] > 0);
    assertTest("Analytics returns success_rate", isset($analytics['success_rate']) && is_numeric($analytics['success_rate']));
    assertTest("Analytics returns by_channel distribution", isset($analytics['by_channel']) && is_array($analytics['by_channel']));
    assertTest("Analytics returns by_status distribution", isset($analytics['by_status']) && is_array($analytics['by_status']));
    assertTest("Analytics returns by_category distribution", isset($analytics['by_category']) && is_array($analytics['by_category']));
    assertTest("Analytics returns daily_volume 7-day trend", isset($analytics['daily_volume']) && is_array($analytics['daily_volume']));
    assertTest("Analytics returns total_cost_ugx", isset($analytics['total_cost_ugx']));

    // ------------------------------------------------------------------------
    // SECTION 6: Campaign Broadcast Messaging Engine
    // ------------------------------------------------------------------------
    echo "\n--- 6. Testing Campaign Broadcast Engine ---\n";

    $broadcastRes = $dispatcher->sendCampaignBroadcast([
        'title' => 'Important Estate Groundbreaking Announcement',
        'message' => 'Groundbreaking for Kisaasi Heights Phase 2 commences this Saturday!',
        'target_segment' => 'all_clients',
        'channels' => ['in_app', 'email'],
        'category' => 'general',
        'priority' => 'high',
        'action_url' => '/portal/dashboard',
    ], $user);

    assertTest("sendCampaignBroadcast returns campaign model", isset($broadcastRes['campaign']));
    assertTest("Campaign model has UUID", !empty($broadcastRes['campaign']->uuid));
    assertTest("Campaign model status is completed", $broadcastRes['campaign']->status === 'completed');
    assertTest("Campaign recorded dispatched recipients >= 1", $broadcastRes['total_dispatched'] >= 1);

    // Verify campaign record in database
    $dbCampaign = NotificationCampaign::find($broadcastRes['campaign']->id);
    assertTest("NotificationCampaign exists in DB", $dbCampaign !== null);
    assertTest("Campaign target_segment is all_clients", $dbCampaign->target_segment === 'all_clients');
    assertTest("Campaign channels array contains in_app and email", in_array('in_app', $dbCampaign->channels) && in_array('email', $dbCampaign->channels));

    // ------------------------------------------------------------------------
    // SECTION 7: API Controller Endpoints
    // ------------------------------------------------------------------------
    echo "\n--- 7. Testing NotificationController Endpoints ---\n";

    $controller = app(NotificationController::class);

    // GET /api/v1/notifications/preferences
    $reqPref = Request::create('/api/v1/notifications/preferences', 'GET');
    $reqPref->setUserResolver(fn() => $user);
    $resPref = $controller->preferences($reqPref);
    $dataPref = $resPref->getData(true);
    assertTest("Controller preferences() returns 200", $resPref->status() === 200);
    assertTest("Controller preferences() contains channels", isset($dataPref['data']['channels']));

    // PUT /api/v1/notifications/preferences
    $reqUpdatePref = Request::create('/api/v1/notifications/preferences', 'PUT', [
        'channels' => ['whatsapp' => true],
        'quiet_hours_enabled' => true,
        'quiet_hours_start' => '21:30',
        'quiet_hours_end' => '07:30',
    ]);
    $reqUpdatePref->setUserResolver(fn() => $user);
    $resUpdatePref = $controller->updatePreferences($reqUpdatePref);
    $dataUpdatePref = $resUpdatePref->getData(true);
    assertTest("Controller updatePreferences() returns 200", $resUpdatePref->status() === 200);
    assertTest("Controller updatePreferences() returns updated whatsapp = true", $dataUpdatePref['data']['channels']['whatsapp'] === true);

    // GET /api/v1/notifications/analytics
    $reqAnalytics = Request::create('/api/v1/notifications/analytics', 'GET');
    $reqAnalytics->setUserResolver(fn() => $user);
    $resAnalytics = $controller->analytics($reqAnalytics);
    $dataAnalytics = $resAnalytics->getData(true);
    assertTest("Controller analytics() returns 200", $resAnalytics->status() === 200);
    assertTest("Controller analytics() contains success_rate", isset($dataAnalytics['data']['success_rate']));

    // POST /api/v1/notifications/dispatch-logs/{id}/retry
    $reqRetry = Request::create("/api/v1/notifications/dispatch-logs/{$failedLog->id}/retry", 'POST');
    $reqRetry->setUserResolver(fn() => $user);
    $resRetry = $controller->retryLog($reqRetry, $failedLog->id);
    $dataRetry = $resRetry->getData(true);
    assertTest("Controller retryLog() returns 200", $resRetry->status() === 200);
    assertTest("Controller retryLog() returns delivered status", $dataRetry['data']['status'] === 'delivered');

    // POST /api/v1/notifications/campaign-broadcast
    $reqCampaign = Request::create('/api/v1/notifications/campaign-broadcast', 'POST', [
        'title' => 'VIP Site Tour Invite',
        'message' => 'Join our executive team for an on-site walkthrough this weekend.',
        'target_segment' => 'all_clients',
        'channels' => ['in_app'],
        'category' => 'general',
    ]);
    $reqCampaign->setUserResolver(fn() => $user);
    $resCampaign = $controller->sendCampaign($reqCampaign);
    $dataCampaign = $resCampaign->getData(true);
    assertTest("Controller sendCampaign() returns 201", $resCampaign->status() === 201);
    assertTest("Controller sendCampaign() returns total_dispatched", isset($dataCampaign['data']['total_dispatched']));

} finally {
    DB::rollBack();
}

echo "\n=======================================================\n";
echo "  PHASE 13 DAY 5 VERIFICATION RESULTS: {$passedTests}/{$totalTests} PASSED (" . round(($passedTests / max(1, $totalTests)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passedTests === $totalTests) {
    exit(0);
} else {
    exit(1);
}
