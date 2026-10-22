<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

echo "========================================================\n";
echo "   PHASE 12 DAY 2: SAVINGS, CHECKOUT & MILESTONES TEST  \n";
echo "========================================================\n\n";

Illuminate\Support\Facades\RateLimiter::clear('127.0.0.1');
Illuminate\Support\Facades\Cache::flush();

$passCount = 0;
$failCount = 0;

function assertTest($condition, $description) {
    global $passCount, $failCount;
    if ($condition) {
        echo " [PASS] $description\n";
        $passCount++;
    } else {
        echo " [FAIL] $description\n";
        $failCount++;
    }
}

function handleRequest($app, $kernel, $request) {
    $app->instance('request', $request);
    Illuminate\Support\Facades\Auth::forgetGuards();
    return $kernel->handle($request);
}

// 1. Setup Test Client & User
$uniqueId = time() . '_' . rand(100, 999);
$testEmail = "savings.client.{$uniqueId}@zimbani-test.com";
$testPhone = "+25677" . rand(1000000, 9999999);

$registerPayload = [
    'first_name' => 'Nalwanga',
    'last_name' => 'Grace',
    'email' => $testEmail,
    'phone' => $testPhone,
    'password' => 'SavingsPass2026!',
    'password_confirmation' => 'SavingsPass2026!',
    'pin' => '1357',
    'city' => 'Mukono',
];

$regRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/auth/register',
    'POST',
    $registerPayload,
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.1.0.' . rand(1, 250)]
);

$regResponse = handleRequest($app, $kernel, $regRequest);
$regData = json_decode($regResponse->getContent(), true);

assertTest($regResponse->getStatusCode() === 201, "Client registration returns HTTP 201");
$token = $regData['data']['token'] ?? null;
$clientId = $regData['data']['client']['id'] ?? null;
$clientUuid = $regData['data']['client']['uuid'] ?? null;

// 2. Setup Savings Account Fixtures for this Client
$company = App\Models\Company::first();
$project = App\Models\Project::create([
    'company_id' => $company->id,
    'name' => 'Victoria Pearl Estate ' . $uniqueId,
    'code' => 'VPE' . rand(100, 999),
    'status' => 'planning',
    'total_units' => 50,
    'location' => 'Mukono, Uganda',
]);

$site = App\Models\Site::where('project_id', $project->id)->first() ?: App\Models\Site::create([
    'project_id' => $project->id,
    'code' => 'SITE-VPE-' . rand(10, 99),
    'name' => 'Victoria Pearl Site Alpha',
    'status' => 'active',
]);

$unit = App\Models\Unit::create([
    'project_id' => $project->id,
    'site_id' => $site->id,
    'client_id' => $clientId,
    'name' => 'Plot 42 Acacia Gardens',
    'unit_number' => 'PLOT-VPE-' . time() . '-' . rand(1000, 9999),
    'unit_type' => 'apartment',
    'status' => 'reserved',
    'current_price' => 25000000.00,
    'area' => 450,
]);

// Account 1: Land Saving
$landAccount = App\Models\SavingsAccount::create([
    'client_id' => $clientId,
    'account_type' => 'land_saving',
    'scheme_name' => 'Mukono Gold Land Saving Scheme',
    'target_amount' => 25000000.00,
    'current_balance' => 5000000.00,
    'currency' => 'UGX',
    'status' => 'active',
    'plot_id' => $unit->id,
    'project_id' => $project->id,
    'target_date' => now()->addMonths(12)->toDateString(),
]);

// Account 2: Construction Saving
$constAccount = App\Models\SavingsAccount::create([
    'client_id' => $clientId,
    'account_type' => 'construction_saving',
    'scheme_name' => 'Standard Bungalow Construction Fund',
    'target_amount' => 60000000.00,
    'current_balance' => 12000000.00,
    'currency' => 'UGX',
    'status' => 'active',
    'project_id' => $project->id,
    'target_date' => now()->addMonths(24)->toDateString(),
]);

assertTest($landAccount->id > 0 && $constAccount->id > 0, "Seeded land and construction savings accounts");

// 3. Test GET /api/v1/client-portal/savings (Overview)
$savingsRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/savings',
    'GET',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.1.' . rand(1, 250),
    ]
);

$savingsResponse = handleRequest($app, $kernel, $savingsRequest);
$savingsData = json_decode($savingsResponse->getContent(), true);

if ($savingsResponse->getStatusCode() !== 200) {
    echo "Savings overview error [{$savingsResponse->getStatusCode()}]: " . $savingsResponse->getContent() . "\n";
}

assertTest($savingsResponse->getStatusCode() === 200, "Savings overview returns HTTP 200");
assertTest(($savingsData['data']['summary']['total_accounts_count'] ?? 0) === 2, "Overview returns 2 accounts");
assertTest(floatval($savingsData['data']['summary']['total_balance'] ?? 0) == 17000000.00, "Total balance equals sum of accounts (17,000,000 UGX)");
assertTest(isset($savingsData['data']['summary']['by_type']['land_saving']), "Savings breakdown includes land_saving type");

// 4. Test GET /api/v1/client-portal/savings/{identifier} (Details)
$detailsRequest = Illuminate\Http\Request::create(
    "/api/v1/client-portal/savings/{$landAccount->uuid}",
    'GET',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.2.' . rand(1, 250),
    ]
);

$detailsResponse = handleRequest($app, $kernel, $detailsRequest);
$detailsData = json_decode($detailsResponse->getContent(), true);

if ($detailsResponse->getStatusCode() !== 200) {
    echo "Account details error [{$detailsResponse->getStatusCode()}]: " . $detailsResponse->getContent() . "\n";
}

assertTest($detailsResponse->getStatusCode() === 200, "Account details returns HTTP 200");
assertTest(($detailsData['data']['account_number'] ?? '') === $landAccount->account_number, "Details matches account number");
assertTest(floatval($detailsData['data']['progress_percentage'] ?? 0) == 20.0, "Progress percentage calculated correctly (20.0%)");
assertTest(($detailsData['data']['plot']['unit_number'] ?? '') === $unit->unit_number, "Attached plot details included");

// 5. Test POST /api/v1/client-portal/deposits/checkout (Initiate Deposit Intent)
$depositPayload = [
    'account_id' => $landAccount->uuid,
    'amount' => 1500000.00,
    'gateway' => 'mtn_momo',
    'phone_number' => '+256772998877',
    'narration' => 'Phase 12 Day 2 Test Deposit',
];

$checkoutRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/deposits/checkout',
    'POST',
    $depositPayload,
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.3.' . rand(1, 250),
    ]
);

$checkoutResponse = handleRequest($app, $kernel, $checkoutRequest);
$checkoutData = json_decode($checkoutResponse->getContent(), true);

if ($checkoutResponse->getStatusCode() !== 201) {
    echo "Deposit checkout error [{$checkoutResponse->getStatusCode()}]: " . $checkoutResponse->getContent() . "\n";
}

assertTest($checkoutResponse->getStatusCode() === 201, "Deposit checkout returns HTTP 201 Created");
assertTest(isset($checkoutData['data']['intent_reference']), "Deposit intent reference generated");
assertTest(floatval($checkoutData['data']['amount'] ?? 0) == 1500000.00, "Intent amount matches 1,500,000 UGX");

$intentUuid = $checkoutData['data']['uuid'] ?? null;

// 6. Test POST /api/v1/client-portal/deposits/{identifier}/confirm (Confirm Deposit & Post Ledger)
$confirmRequest = Illuminate\Http\Request::create(
    "/api/v1/client-portal/deposits/{$intentUuid}/confirm",
    'POST',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.4.' . rand(1, 250),
    ]
);

$confirmResponse = handleRequest($app, $kernel, $confirmRequest);
$confirmData = json_decode($confirmResponse->getContent(), true);

if ($confirmResponse->getStatusCode() !== 200) {
    echo "Deposit confirm error [{$confirmResponse->getStatusCode()}]: " . $confirmResponse->getContent() . "\n";
}

assertTest($confirmResponse->getStatusCode() === 200, "Deposit confirmation returns HTTP 200");
assertTest(floatval($confirmData['data']['receipt']['new_balance'] ?? 0) == 6500000.00, "New account balance credited (5M + 1.5M = 6.5M UGX)");
assertTest(!empty($confirmData['data']['receipt']['transaction_number']), "Immutable transaction record created");
assertTest(!empty($confirmData['data']['receipt']['payment_number']), "Confirmed payment record generated");

// 7. Test GET /api/v1/client-portal/transactions (Transaction History)
$txRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/transactions',
    'GET',
    ['transaction_type' => 'credit'],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.5.' . rand(1, 250),
    ]
);

$txResponse = handleRequest($app, $kernel, $txRequest);
$txData = json_decode($txResponse->getContent(), true);

assertTest($txResponse->getStatusCode() === 200, "Transactions list returns HTTP 200");
assertTest(($txData['data']['total'] ?? 0) >= 1, "Transaction history lists credit deposit");
assertTest(floatval($txData['data']['transactions'][0]['amount'] ?? 0) == 1500000.00, "Transaction matches deposit amount");

// 8. Test GET /api/v1/client-portal/milestone-trackers (Visual Milestone Trackers)
// Create milestone fixtures
$milestone1 = App\Models\ConstructionMilestone::create([
    'project_id' => $project->id,
    'milestone_name' => 'Substructure & Foundation Concrete Pour',
    'milestone_order' => 1,
    'status' => 'completed',
    'planned_end_date' => now()->subDays(10)->toDateString(),
]);

$milestone2 = App\Models\ConstructionMilestone::create([
    'project_id' => $project->id,
    'milestone_name' => 'Superstructure Walling & Lintel Ring Beams',
    'milestone_order' => 2,
    'status' => 'in_progress',
    'planned_end_date' => now()->addDays(20)->toDateString(),
]);

$trackersRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/milestone-trackers',
    'GET',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.1.6.' . rand(1, 250),
    ]
);

$trackersResponse = handleRequest($app, $kernel, $trackersRequest);
$trackersData = json_decode($trackersResponse->getContent(), true);

assertTest($trackersResponse->getStatusCode() === 200, "Milestone trackers returns HTTP 200");
assertTest(($trackersData['data']['total_units'] ?? 0) >= 1, "Trackers return allocated unit");
assertTest(($trackersData['data']['trackers'][0]['completed_milestones'] ?? 0) === 1, "Completed milestone tracked (1 of 2)");
assertTest(floatval($trackersData['data']['trackers'][0]['completion_pct'] ?? 0) == 50.0, "Milestone progress completion percentage is 50%");

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: $passCount Passed, $failCount Failed\n";
echo "--------------------------------------------------------\n";

if ($failCount > 0) {
    exit(1);
}
