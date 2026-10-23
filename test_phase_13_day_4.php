<?php

/**
 * Phase 13 Day 4 Verification Test Suite
 * Automated Notification Workflows & Drip Triggers
 */

require_once __DIR__ . '/zimbani-backend/vendor/autoload.php';
$app = require_once __DIR__ . '/zimbani-backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Console\Commands\RunAutomatedNotificationDrips;
use App\Models\Client;
use App\Models\MilestoneVerification;
use App\Models\NotificationDripTrigger;
use App\Models\PlotReservation;
use App\Models\SavingsAccount;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Services\Notifications\NotificationDripService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
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
echo "  PHASE 13 DAY 4: AUTOMATED NOTIFICATION DRIPS TEST\n";
echo "=======================================================\n\n";

DB::beginTransaction();

try {
    // ------------------------------------------------------------------------
    // SETUP: Test Fixtures
    // ------------------------------------------------------------------------
    echo "--- 1. Setting Up Test Fixtures ---\n";

    $suffix = rand(1000, 9999);
    $user = User::create([
        'name' => "Drip Tester {$suffix}",
        'email' => "drip{$suffix}@zimbani.com",
        'phone' => "+25677000{$suffix}",
        'password' => bcrypt('password123'),
        'status' => 'active',
        'last_login_at' => Carbon::now()->subDays(45), // dormant user
        'created_at' => Carbon::now()->subDays(60),
    ]);
    assertTest("User fixture created", $user->id > 0);

    $client = Client::create([
        'user_id' => $user->id,
        'client_number' => "CL-DRIP-{$suffix}",
        'first_name' => "Drip",
        'last_name' => "Tester",
        'email' => $user->email,
        'phone_primary' => $user->phone,
        'status' => 'active',
        'kyc_status' => 'verified',
    ]);
    assertTest("Client fixture created and linked to user", $client->id > 0 && $client->user_id === $user->id);

    $savings = SavingsAccount::create([
        'client_id' => $client->id,
        'account_number' => "SA-DRIP-{$suffix}",
        'scheme_name' => 'Kisaasi Prime Estate Fund',
        'account_type' => 'land_saving',
        'target_amount' => 50000000.00,
        'current_balance' => 12500000.00,
        'currency' => 'UGX',
        'status' => 'active',
        'opened_date' => Carbon::now()->subMonths(3),
        'target_date' => Carbon::now()->addMonths(9),
    ]);
    assertTest("Active savings account fixture created", $savings->id > 0);

    $project = \App\Models\Project::first();
    $site = Site::first();
    $unit = Unit::first();
    $milestone = \App\Models\ConstructionMilestone::first();

    $reservation = PlotReservation::create([
        'reservation_number' => "RES-DRIP-{$suffix}",
        'client_id' => $client->id,
        'user_id' => $user->id,
        'project_id' => $project->id,
        'unit_id' => $unit->id,
        'site_id' => $site->id,
        'status' => 'confirmed',
        'reservation_fee' => 2000000.00,
        'reservation_fee_paid' => 500000.00,
        'reserved_at' => Carbon::now()->subDays(11),
        'expires_at' => Carbon::now()->addHours(20), // Less than 24 hours remaining!
        'terms_accepted' => true,
    ]);
    assertTest("Expiring plot reservation fixture created (20h remaining)", $reservation->id > 0);

    $milestoneVer = MilestoneVerification::create([
        'verification_number' => "VER-DRIP-{$suffix}",
        'project_id' => $project->id,
        'site_id' => $site->id,
        'unit_id' => $unit->id,
        'milestone_id' => $milestone->id,
        'title' => 'Substructure Foundation Slab Casting',
        'stage' => 'engineer_verified',
        'physical_completion_percentage' => 100.00,
        'work_quality_rating' => 'exceptional',
        'inspection_date' => Carbon::now()->subHours(54),
        'engineer_signed_at' => Carbon::now()->subHours(52), // Older than 48 hours!
        'client_id' => $client->id,
        'client_user_id' => $user->id,
        'client_approval_status' => 'pending',
    ]);
    assertTest("Unapproved milestone inspection fixture created (52h pending)", $milestoneVer->id > 0);

    // ------------------------------------------------------------------------
    // SECTION 2: Model & Database Constraints
    // ------------------------------------------------------------------------
    echo "\n--- 2. Testing NotificationDripTrigger Model & Idempotency ---\n";

    $manualTrigger = NotificationDripTrigger::create([
        'campaign_type' => 'savings_reminder',
        'trigger_key' => "test_key_{$suffix}",
        'recipient_user_id' => $user->id,
        'recipient_client_id' => $client->id,
        'entity_type' => SavingsAccount::class,
        'entity_id' => $savings->id,
        'title' => 'Test Savings Drip',
        'message' => 'Monthly target contribution due',
        'channels_attempted' => ['in_app', 'sms', 'email'],
        'channels_succeeded' => ['in_app'],
        'status' => 'dispatched',
        'is_dry_run' => false,
        'dispatched_at' => Carbon::now(),
    ]);

    assertTest("NotificationDripTrigger created with UUID", !empty($manualTrigger->uuid));
    assertTest("Relationship user() resolves correctly", $manualTrigger->user->id === $user->id);
    assertTest("Relationship client() resolves correctly", $manualTrigger->client->id === $client->id);
    assertTest("Casts work as expected (channels_attempted is array)", is_array($manualTrigger->channels_attempted));

    $duplicateCaught = false;
    try {
        NotificationDripTrigger::create([
            'campaign_type' => 'savings_reminder',
            'trigger_key' => "test_key_{$suffix}", // Duplicate key!
            'recipient_user_id' => $user->id,
            'title' => 'Duplicate',
            'message' => 'Should fail',
        ]);
    } catch (\Throwable $e) {
        $duplicateCaught = true;
    }
    assertTest("Unique constraint prevents duplicate trigger_key", $duplicateCaught);

    // ------------------------------------------------------------------------
    // SECTION 3: NotificationDripService Workflows
    // ------------------------------------------------------------------------
    echo "\n--- 3. Testing NotificationDripService Workflows ---\n";

    $dripService = new NotificationDripService();

    // Test Savings Reminders
    $savingsResult = $dripService->processSavingsContributionReminders(true); // dry-run
    assertTest("processSavingsContributionReminders executed", is_array($savingsResult));
    assertTest("Savings accounts evaluated >= 1", $savingsResult['evaluated'] >= 1);

    // Test Plot Reservation Expiry Countdown
    $plotResult = $dripService->processPlotReservationExpiryCountdown(false); // live dispatch
    assertTest("processPlotReservationExpiryCountdown executed", is_array($plotResult));
    assertTest("Expiring reservation detected and triggered", $plotResult['triggered'] >= 1);

    // Verify trigger record created in database for reservation
    $resTriggerKey = "plot_expiry_{$reservation->id}_24h";
    $resTrigger = NotificationDripTrigger::where('trigger_key', $resTriggerKey)->first();
    assertTest("Reservation trigger key recorded in DB", $resTrigger !== null);
    assertTest("Reservation trigger status is dispatched", $resTrigger?->status === 'dispatched');
    assertTest("Reservation trigger campaign_type is plot_expiry", $resTrigger?->campaign_type === 'plot_expiry');

    // Run plot reservation countdown again - must be skipped by idempotency
    $plotResult2 = $dripService->processPlotReservationExpiryCountdown(false);
    assertTest("Idempotency: Re-running reservation countdown skips duplicate", $plotResult2['skipped'] >= 1);

    // Test Milestone Inspection Nudges
    $milestoneResult = $dripService->processMilestoneInspectionNudges(false);
    assertTest("processMilestoneInspectionNudges executed", is_array($milestoneResult));
    assertTest("Milestone nudge triggered for > 48h unapproved inspection", $milestoneResult['triggered'] >= 1);

    $nudgeTriggerKey = "milestone_nudge_{$milestoneVer->id}_48h";
    $nudgeTrigger = NotificationDripTrigger::where('trigger_key', $nudgeTriggerKey)->first();
    assertTest("Milestone nudge trigger recorded in DB", $nudgeTrigger !== null);
    assertTest("Milestone nudge recipient is user", $nudgeTrigger?->recipient_user_id === $user->id);

    // Test Dormant Client Re-engagement
    $dormantResult = $dripService->processDormantClientReengagement(false);
    assertTest("processDormantClientReengagement executed", is_array($dormantResult));
    assertTest("Dormant clients evaluated >= 1", $dormantResult['evaluated'] >= 1);

    // ------------------------------------------------------------------------
    // SECTION 4: Orchestrator, Dry-Run, and Telemetry Summary
    // ------------------------------------------------------------------------
    echo "\n--- 4. Testing Orchestrator, Dry-Run, & Telemetry ---\n";

    $masterResult = $dripService->runAllDrips(true, 'all');
    assertTest("runAllDrips returns valid report structure", isset($masterResult['summary'], $masterResult['breakdown']));
    assertTest("runAllDrips respects dry_run parameter", $masterResult['dry_run'] === true);
    assertTest("runAllDrips evaluates all 4 workflows", count($masterResult['breakdown']) === 4);

    // Test getDripSummary
    $summary = $dripService->getDripSummary();
    assertTest("getDripSummary returns total_triggers", isset($summary['total_triggers']) && $summary['total_triggers'] > 0);
    assertTest("getDripSummary returns by_campaign breakdown", isset($summary['by_campaign']) && is_array($summary['by_campaign']));
    assertTest("getDripSummary returns active_workflows list", count($summary['active_workflows']) === 4);
    assertTest("getDripSummary returns recent_triggers list", isset($summary['recent_triggers']));

    // Test getDripLogs
    $logs = $dripService->getDripLogs(['campaign_type' => 'plot_expiry']);
    assertTest("getDripLogs returns paginated result", $logs->total() >= 1);
    assertTest("getDripLogs filters by campaign_type", $logs->first()->campaign_type === 'plot_expiry');

    $searchLogs = $dripService->getDripLogs(['search' => 'Substructure']);
    assertTest("getDripLogs searches title/message", $searchLogs->total() >= 1);

    // ------------------------------------------------------------------------
    // SECTION 5: Artisan Console Command Execution
    // ------------------------------------------------------------------------
    echo "\n--- 5. Testing Artisan notifications:run-drips Command ---\n";

    $exitCodeDry = Artisan::call('notifications:run-drips', ['--dry-run' => true]);
    assertTest("Artisan notifications:run-drips --dry-run exits with 0", $exitCodeDry === 0);

    $exitCodeSavings = Artisan::call('notifications:run-drips', ['--workflow' => 'savings', '--dry-run' => true]);
    assertTest("Artisan notifications:run-drips --workflow=savings exits with 0", $exitCodeSavings === 0);

    // ------------------------------------------------------------------------
    // SECTION 6: API Controller Endpoints
    // ------------------------------------------------------------------------
    echo "\n--- 6. Testing NotificationDripController Endpoints ---\n";

    $controller = app(\App\Http\Controllers\Api\NotificationDripController::class);

    // GET /api/v1/notification-drips/summary
    $responseSummary = $controller->summary();
    $dataSummary = $responseSummary->getData(true);
    assertTest("Controller summary() returns 200", $responseSummary->status() === 200);
    assertTest("Controller summary() contains total_triggers", isset($dataSummary['data']['total_triggers']));

    // GET /api/v1/notification-drips/logs
    $requestLogs = Request::create('/api/v1/notification-drips/logs', 'GET', ['per_page' => 5]);
    $responseLogs = $controller->logs($requestLogs);
    $dataLogs = $responseLogs->getData(true);
    assertTest("Controller logs() returns 200", $responseLogs->status() === 200);
    assertTest("Controller logs() has pagination", isset($dataLogs['pagination']['current_page']));

    // POST /api/v1/notification-drips/run-now
    $requestRun = Request::create('/api/v1/notification-drips/run-now', 'POST', [
        'dry_run' => true,
        'workflow' => 'all',
    ]);
    $responseRun = $controller->runNow($requestRun);
    $dataRun = $responseRun->getData(true);
    assertTest("Controller runNow() returns 200", $responseRun->status() === 200);
    assertTest("Controller runNow() returns execution data", isset($dataRun['data']['summary']));

} finally {
    DB::rollBack();
}

echo "\n=======================================================\n";
echo "  PHASE 13 DAY 4 VERIFICATION RESULTS: {$passedTests}/{$totalTests} PASSED (" . round(($passedTests / max(1, $totalTests)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passedTests === $totalTests) {
    exit(0);
} else {
    exit(1);
}
