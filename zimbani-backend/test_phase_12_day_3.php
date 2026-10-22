<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\LandTitleDeed;
use App\Models\PlotReservation;
use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

echo "\n========================================================";
echo "\n   PHASE 12 DAY 3: PLOT RESERVATION & DEED TRACKER TEST  ";
echo "\n========================================================\n\n";

$passed = 0;
$failed = 0;

function assertTest(bool $condition, string $message, &$passed, &$failed)
{
    if ($condition) {
        echo " [PASS] " . $message . "\n";
        $passed++;
    } else {
        echo " [FAIL] " . $message . "\n";
        $failed++;
    }
}

try {
    // 1. Authenticate / Setup Client
    $email = 'client.plots.' . time() . '@example.com';
    $password = 'TestSecret123!';
    $phone = '+25678' . rand(1000000, 9999999);

    $registerPayload = [
        'first_name' => 'Kato',
        'last_name' => 'Mukasa',
        'email' => $email,
        'phone_primary' => $phone,
        'password' => $password,
        'password_confirmation' => $password,
        'quick_pin' => '2468',
    ];

    $response = app()->handle(
        \Illuminate\Http\Request::create('/api/v1/client-portal/auth/register', 'POST', $registerPayload)
    );
    $regData = json_decode($response->getContent(), true);
    assertTest($response->getStatusCode() === 201, 'Client registration returns HTTP 201', $passed, $failed);
    $token = $regData['data']['token'];
    $user = User::where('email', $email)->first();
    $client = Client::where('email', $email)->first();

    // 2. Ensure Project & Site Exist
    $company = \App\Models\Company::first();
    $companyId = $company ? $company->id : 1;

    $project = Project::firstOrCreate(
        ['code' => 'TEST-ESTATE-12'],
        [
            'company_id' => $companyId,
            'uuid' => (string) Str::uuid(),
            'name' => 'Kigumba Royal Eco-Estate',
            'status' => 'active',
            'start_date' => now(),
            'target_completion_date' => now()->addMonths(12),
        ]
    );

    $site = Site::firstOrCreate(
        ['name' => 'Kigumba Hills Phase 1'],
        [
            'code' => 'STE-KIGUMBA-01',
            'uuid' => (string) Str::uuid(),
            'project_id' => $project->id,
            'address' => 'Kigumba, Masindi Road',
            'status' => 'active',
        ]
    );

    // 3. Seed 3 Test Plots
    $plot1 = Unit::create([
        'uuid' => (string) Str::uuid(),
        'unit_number' => 'PLOT-P12-' . rand(100, 999),
        'name' => 'Plot A1 - Sunset View',
        'site_id' => $site->id,
        'project_id' => $project->id,
        'unit_type' => 'plot',
        'status' => 'available',
        'area' => 450.00,
        'area_unit' => 'sqm',
        'base_price' => 38000000.00,
        'current_price' => 38000000.00,
        'currency' => 'UGX',
        'metadata' => [
            'map_x' => 120,
            'map_y' => 100,
            'map_width' => 110,
            'map_height' => 90,
            'zone' => 'Block A - Hillside',
            'dimensions' => '50ft x 100ft',
        ],
    ]);

    $plot2 = Unit::create([
        'uuid' => (string) Str::uuid(),
        'unit_number' => 'PLOT-P12-' . rand(100, 999),
        'name' => 'Plot A2 - Boulevard Front',
        'site_id' => $site->id,
        'project_id' => $project->id,
        'unit_type' => 'plot',
        'status' => 'available',
        'area' => 900.00,
        'area_unit' => 'sqm',
        'base_price' => 72000000.00,
        'current_price' => 72000000.00,
        'currency' => 'UGX',
        'metadata' => [
            'map_x' => 260,
            'map_y' => 100,
            'map_width' => 140,
            'map_height' => 90,
            'zone' => 'Block A - Hillside',
            'dimensions' => '100ft x 100ft',
        ],
    ]);

    assertTest($plot1 && $plot2, 'Seeded test estate plots in Kigumba Royal Eco-Estate', $passed, $failed);

    // 4. Test GET /api/v1/client-portal/plots
    $getPlotsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/plots?project_id=' . $project->id, 'GET');
    $getPlotsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getPlotsRes = app()->handle($getPlotsReq);
    $plotsData = json_decode($getPlotsRes->getContent(), true);

    assertTest($getPlotsRes->getStatusCode() === 200, 'Plots list returns HTTP 200', $passed, $failed);
    assertTest(count($plotsData['data']['plots']) >= 2, 'Plots list returns at least 2 available plots', $passed, $failed);
    assertTest($plotsData['data']['summary']['available_count'] >= 2, 'Summary counts available plots accurately', $passed, $failed);

    // 5. Test GET /api/v1/client-portal/estate-map
    $getMapReq = \Illuminate\Http\Request::create('/api/v1/client-portal/estate-map?project_id=' . $project->id, 'GET');
    $getMapReq->headers->set('Authorization', 'Bearer ' . $token);
    $getMapRes = app()->handle($getMapReq);
    $mapData = json_decode($getMapRes->getContent(), true);

    assertTest($getMapRes->getStatusCode() === 200, 'Estate masterplan map returns HTTP 200', $passed, $failed);
    assertTest(isset($mapData['data']['canvas']['roadways']), 'Map response includes masterplan roadways', $passed, $failed);
    assertTest(isset($mapData['data']['canvas']['amenities']), 'Map response includes community amenities layer', $passed, $failed);

    // 6. Test POST /api/v1/client-portal/plots/reserve
    $reservePayload = [
        'unit_id' => $plot1->id,
        'reservation_fee' => 500000,
        'gateway' => 'mtn_momo',
        'phone_number' => $phone,
        'notes' => 'Please reserve for Kato Mukasa; plan to start construction in Q1.',
    ];
    $reserveReq = \Illuminate\Http\Request::create('/api/v1/client-portal/plots/reserve', 'POST', $reservePayload);
    $reserveReq->headers->set('Authorization', 'Bearer ' . $token);
    $reserveRes = app()->handle($reserveReq);
    $resData = json_decode($reserveRes->getContent(), true);

    assertTest($reserveRes->getStatusCode() === 201, 'Plot reservation returns HTTP 201 Created', $passed, $failed);
    assertTest(!empty($resData['data']['reservation']['reservation_number']), 'Reservation reference number generated', $passed, $failed);
    assertTest($resData['data']['reservation']['days_remaining'] === 14, 'Reservation grants 14-day hold period', $passed, $failed);
    assertTest(!empty($resData['data']['receipt']['receipt_number']), 'Official booking fee receipt generated', $passed, $failed);

    $reservationUuid = $resData['data']['reservation']['uuid'];

    // 7. Verify Plot Status is Updated to Reserved
    $plot1Fresh = Unit::find($plot1->id);
    assertTest($plot1Fresh->status === 'reserved', 'Plot status updated to "reserved"', $passed, $failed);
    assertTest($plot1Fresh->client_id === $user->id, 'Plot client_id assigned to reserving user', $passed, $failed);
    assertTest((float) $plot1Fresh->amount_paid === 500000.00, 'Plot amount_paid credited with 500,000 UGX reservation fee', $passed, $failed);

    // 8. Test Double Reservation Conflict Prevention
    $doubleResReq = \Illuminate\Http\Request::create('/api/v1/client-portal/plots/reserve', 'POST', $reservePayload);
    $doubleResReq->headers->set('Authorization', 'Bearer ' . $token);
    $doubleResRes = app()->handle($doubleResReq);
    assertTest($doubleResRes->getStatusCode() === 422, 'Duplicate reservation correctly rejected with HTTP 422', $passed, $failed);

    // 9. Test GET /api/v1/client-portal/reservations
    $getResReq = \Illuminate\Http\Request::create('/api/v1/client-portal/reservations', 'GET');
    $getResReq->headers->set('Authorization', 'Bearer ' . $token);
    $getResRes = app()->handle($getResReq);
    $clientResData = json_decode($getResRes->getContent(), true);

    assertTest($getResRes->getStatusCode() === 200, 'Client reservations returns HTTP 200', $passed, $failed);
    assertTest($clientResData['data']['active_count'] === 1, 'Client has 1 active reservation', $passed, $failed);
    assertTest($clientResData['data']['reservations'][0]['plot']['unit_number'] === $plot1->unit_number, 'Reservation linked to correct plot unit number', $passed, $failed);

    // 10. Seed Land Title Deed Pipeline Tracker
    $titleDeed = LandTitleDeed::create([
        'uuid' => (string) Str::uuid(),
        'deed_number' => 'DEED-P12-' . rand(100, 999),
        'title_number' => 'Busiro Block 450 Plot 128',
        'unit_id' => $plot1->id,
        'client_id' => $client->id,
        'project_id' => $project->id,
        'tenure_type' => 'mailo',
        'overall_stage' => 'ministry_mutation',
        'cadastral_survey_status' => 'completed',
        'cadastral_survey_date' => now()->subDays(20),
        'surveyor_name' => 'Eng. Patrick Lubega (Surv. Reg #188)',
        'boundary_opening_status' => 'completed',
        'mutation_status' => 'submitted_to_ministry',
        'ministry_zonal_office' => 'Wakiso Ministry Zonal Office (MZO)',
        'zonal_reference_number' => 'WAK/MUT/2026/0411',
        'submission_date' => now()->subDays(5),
        'estimated_completion_date' => now()->addDays(40),
        'notes' => 'Ground survey completed and subdivision application accepted by Wakiso MZO registrar.',
    ]);
    assertTest($titleDeed->id > 0, 'Seeded LandTitleDeed tracking record', $passed, $failed);
    assertTest($titleDeed->overall_progress_percentage === 45, 'Progress percentage auto-computed to 45% for ministry_mutation', $passed, $failed);

    // 11. Test GET /api/v1/client-portal/deeds
    $getDeedsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/deeds', 'GET');
    $getDeedsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getDeedsRes = app()->handle($getDeedsReq);
    $deedsData = json_decode($getDeedsRes->getContent(), true);

    assertTest($getDeedsRes->getStatusCode() === 200, 'Land title deeds returns HTTP 200', $passed, $failed);
    assertTest($deedsData['data']['total_titles'] >= 1, 'Total titles returned is at least 1', $passed, $failed);
    $firstDeed = $deedsData['data']['deeds'][0];
    assertTest(count($firstDeed['stages']) === 5, 'Deed pipeline features full 5-stage progression', $passed, $failed);
    assertTest($firstDeed['stages'][0]['status'] === 'completed', 'Stage 1 (Cadastral Survey) marked completed', $passed, $failed);
    assertTest($firstDeed['stages'][1]['status'] === 'in_progress', 'Stage 2 (Ministry Mutation) marked in_progress', $passed, $failed);
    assertTest(count($firstDeed['beacon_coordinates']) === 4, 'Includes 4 GPS boundary beacon coordinates', $passed, $failed);

    // 12. Test POST /api/v1/client-portal/reservations/{uuid}/cancel
    $cancelReq = \Illuminate\Http\Request::create("/api/v1/client-portal/reservations/{$reservationUuid}/cancel", 'POST', [
        'reason' => 'Client upgraded to Plot A2 instead',
    ]);
    $cancelReq->headers->set('Authorization', 'Bearer ' . $token);
    $cancelRes = app()->handle($cancelReq);
    $cancelData = json_decode($cancelRes->getContent(), true);

    assertTest($cancelRes->getStatusCode() === 200, 'Cancel reservation returns HTTP 200', $passed, $failed);
    assertTest($cancelData['data']['status'] === 'cancelled', 'Reservation marked as cancelled', $passed, $failed);

    $plot1AfterCancel = Unit::find($plot1->id);
    assertTest($plot1AfterCancel->status === 'available', 'Plot released back to "available" status', $passed, $failed);
    assertTest($plot1AfterCancel->client_id === null, 'Plot client_id unassigned upon cancellation', $passed, $failed);

} catch (\Exception $e) {
    echo " [ERROR] Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    $failed++;
}

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "--------------------------------------------------------\n\n";

exit($failed > 0 ? 1 : 0);
