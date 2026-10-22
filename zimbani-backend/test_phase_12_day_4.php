<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\Company;
use App\Models\ConstructionMilestone;
use App\Models\MilestonePaymentRelease;
use App\Models\MilestoneProgressPhoto;
use App\Models\MilestoneVerification;
use App\Models\Project;
use App\Models\PunchListItem;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;

echo "\n========================================================";
echo "\n   PHASE 12 DAY 4: PROGRESS PHOTOS, DEFECTS & PIN SIGN-OFF TEST";
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
    // 1. Register Client with Quick-PIN
    $email = 'client.milestone.' . time() . '@example.com';
    $password = 'SecretPass123!';
    $pin = '7788';
    $phone = '+25677' . rand(1000000, 9999999);

    $registerPayload = [
        'first_name' => 'Sarah',
        'last_name' => 'Namubiru',
        'email' => $email,
        'phone_primary' => $phone,
        'password' => $password,
        'password_confirmation' => $password,
        'pin' => $pin,
        'quick_pin' => $pin,
    ];

    $response = app()->handle(
        \Illuminate\Http\Request::create('/api/v1/client-portal/auth/register', 'POST', $registerPayload)
    );
    $regData = json_decode($response->getContent(), true);
    assertTest($response->getStatusCode() === 201, 'Client registration returns HTTP 201', $passed, $failed);
    $token = $regData['data']['token'];
    $user = User::where('email', $email)->first();
    $client = Client::where('email', $email)->first();

    // Verify PIN setup in security profile
    $secProfile = ClientSecurityProfile::where('user_id', $user->id)->first();
    assertTest($secProfile && $secProfile->verifyPin($pin), 'Client Quick-PIN "7788" verified in ClientSecurityProfile', $passed, $failed);

    // 2. Project, Site, Unit, and Milestone setup
    $company = Company::first();
    $project = Project::firstOrCreate(
        ['code' => 'EST-M12-01'],
        [
            'company_id' => $company ? $company->id : 1,
            'uuid' => (string) Str::uuid(),
            'name' => 'Victoria Lakeside Enclave',
            'status' => 'active',
            'start_date' => now(),
        ]
    );

    $site = Site::firstOrCreate(
        ['name' => 'Victoria Lakeside Site 1'],
        [
            'code' => 'STE-VIC-01',
            'uuid' => (string) Str::uuid(),
            'project_id' => $project->id,
            'address' => 'Entebbe Road, Kigo',
            'status' => 'active',
        ]
    );

    $unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'unit_number' => 'UNIT-P12-' . rand(100, 999),
        'name' => 'Villa 14 - Kigo Hill',
        'site_id' => $site->id,
        'project_id' => $project->id,
        'unit_type' => 'villa',
        'status' => 'under_construction',
        'client_id' => $user->id,
        'current_price' => 240000000.00,
        'base_price' => 240000000.00,
    ]);

    $milestone = ConstructionMilestone::create([
        'uuid' => (string) Str::uuid(),
        'project_id' => $project->id,
        'site_id' => $site->id,
        'milestone_name' => 'Substructure & Foundation Concrete Pour',
        'milestone_order' => rand(100, 999),
        'planned_cost' => 45000000.00,
        'status' => 'in_progress',
    ]);

    // 3. Create MilestoneVerification awaiting Client Approval
    $verification = MilestoneVerification::create([
        'uuid' => (string) Str::uuid(),
        'verification_number' => 'VRF-' . date('Ymd') . '-' . rand(100, 999),
        'project_id' => $project->id,
        'site_id' => $site->id,
        'unit_id' => $unit->id,
        'milestone_id' => $milestone->id,
        'client_id' => $client->id,
        'title' => 'Foundation Inspection & Concrete Slump Test',
        'stage' => 'qs_verified',
        'client_approval_status' => 'pending',
        'physical_completion_percentage' => 35,
        'qs_certified_amount' => 42000000.00,
        'inspection_date' => now()->toDateString(),
        'verifier_id' => 1,
    ]);

    // Create linked payment release
    $release = MilestonePaymentRelease::create([
        'uuid' => (string) Str::uuid(),
        'release_number' => 'REL-' . date('Ymd') . '-' . rand(100, 999),
        'project_id' => $project->id,
        'site_id' => $site->id,
        'unit_id' => $unit->id,
        'milestone_id' => $milestone->id,
        'milestone_verification_id' => $verification->id,
        'client_id' => $client->id,
        'status' => 'pending_authorization',
        'gross_amount' => 42000000.00,
        'retention_percentage' => 5.0,
        'retention_amount' => 2100000.00,
        'net_release_amount' => 39900000.00,
        'currency' => 'UGX',
    ]);

    assertTest($verification->id > 0 && $release->id > 0, 'Seeded milestone verification & escrow release records', $passed, $failed);

    // 4. Test GET /api/v1/client-portal/milestones/summary
    $summaryReq = \Illuminate\Http\Request::create('/api/v1/client-portal/milestones/summary', 'GET');
    $summaryReq->headers->set('Authorization', 'Bearer ' . $token);
    $summaryRes = app()->handle($summaryReq);
    $sumData = json_decode($summaryRes->getContent(), true);

    assertTest($summaryRes->getStatusCode() === 200, 'Milestones summary returns HTTP 200', $passed, $failed);
    assertTest($sumData['data']['pending_approval_count'] >= 1, 'Summary reflects pending client verification', $passed, $failed);

    // 5. Test POST /api/v1/client-portal/milestones/verifications/{uuid}/photos
    $uploadPayload = [
        'title' => 'C-25 Concrete Slump Test & Cube Samples',
        'caption' => 'Conducted by Quality Engineer on site with 110mm slump reading.',
        'photo_url' => 'https://fabhomes.ug/storage/inspections/slump_test_cube.jpg',
        'photo_stage' => 'concrete_pour',
        'captured_at' => now()->toDateTimeString(),
        'gps_latitude' => 0.1245,
        'gps_longitude' => 32.5891,
        'camera_make_model' => 'Samsung S24 Ultra Ultra-Wide',
        'is_client_visible' => true,
    ];
    $uploadReq = \Illuminate\Http\Request::create("/api/v1/client-portal/milestones/verifications/{$verification->uuid}/photos", 'POST', $uploadPayload);
    $uploadReq->headers->set('Authorization', 'Bearer ' . $token);
    $uploadRes = app()->handle($uploadReq);
    $photoData = json_decode($uploadRes->getContent(), true);

    assertTest($uploadRes->getStatusCode() === 201, 'Progress photo upload returns HTTP 201 Created', $passed, $failed);
    assertTest(!empty($photoData['data']['uuid']), 'Photo record created with UUID', $passed, $failed);
    $photoUuid = $photoData['data']['uuid'];

    // 6. Test POST /api/v1/client-portal/milestones/photos/{uuid}/flag
    $flagReq = \Illuminate\Http\Request::create("/api/v1/client-portal/milestones/photos/{$photoUuid}/flag", 'POST', [
        'notes' => 'Please confirm if the vibrator poker was used on the east corner beam reinforcement.',
    ]);
    $flagReq->headers->set('Authorization', 'Bearer ' . $token);
    $flagRes = app()->handle($flagReq);

    assertTest($flagRes->getStatusCode() === 200, 'Photo defect flagging returns HTTP 200', $passed, $failed);
    $flaggedPhoto = MilestoneProgressPhoto::where('uuid', $photoUuid)->first();
    assertTest($flaggedPhoto->client_flagged === true, 'Photo marked as client_flagged in DB', $passed, $failed);

    // 7. Test POST /api/v1/client-portal/milestones/defects (Direct Defect Reporting)
    $defectPayload = [
        'unit_id' => $unit->id,
        'title' => 'Honeycombing on Column C3 Base',
        'description' => 'Noticed exposed aggregate and minor honeycombing on column C3 during physical site walkthrough.',
        'category' => 'structural',
        'severity' => 'high',
        'location_details' => 'Ground Floor Column C3',
    ];
    $defectReq = \Illuminate\Http\Request::create('/api/v1/client-portal/milestones/defects', 'POST', $defectPayload);
    $defectReq->headers->set('Authorization', 'Bearer ' . $token);
    $defectRes = app()->handle($defectReq);
    $defectData = json_decode($defectRes->getContent(), true);

    assertTest($defectRes->getStatusCode() === 201, 'Direct defect punch-list reporting returns HTTP 201 Created', $passed, $failed);
    assertTest(!empty($defectData['data']['item_number']), 'Punch-list snag item number generated', $passed, $failed);
    assertTest($defectData['data']['status'] === 'open', 'Punch-list status is "open"', $passed, $failed);

    // 8. Test GET /api/v1/client-portal/milestones/defects
    $getDefectsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/milestones/defects', 'GET');
    $getDefectsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getDefectsRes = app()->handle($getDefectsReq);
    $listDefectsData = json_decode($getDefectsRes->getContent(), true);

    assertTest($getDefectsRes->getStatusCode() === 200, 'Punch-list defect items list returns HTTP 200', $passed, $failed);
    assertTest($listDefectsData['data']['open_count'] >= 1, 'Open defect count includes submitted snag', $passed, $failed);

    // 9. Test Authorize WITHOUT Quick-PIN (Should Fail with HTTP 422)
    $noPinReq = \Illuminate\Http\Request::create("/api/v1/client-portal/milestones/verifications/{$verification->uuid}/authorize", 'POST', [
        'feedback' => 'Approved without PIN',
    ]);
    $noPinReq->headers->set('Authorization', 'Bearer ' . $token);
    $noPinRes = app()->handle($noPinReq);

    assertTest($noPinRes->getStatusCode() === 422, 'Authorize without Quick-PIN correctly rejected with HTTP 422', $passed, $failed);

    // 10. Test Authorize with WRONG Quick-PIN (Should Fail with HTTP 422)
    $wrongPinReq = \Illuminate\Http\Request::create("/api/v1/client-portal/milestones/verifications/{$verification->uuid}/authorize", 'POST', [
        'feedback' => 'Approved with wrong PIN',
        'pin' => '9999',
    ]);
    $wrongPinReq->headers->set('Authorization', 'Bearer ' . $token);
    $wrongPinRes = app()->handle($wrongPinReq);

    assertTest($wrongPinRes->getStatusCode() === 422, 'Authorize with invalid Quick-PIN correctly rejected with HTTP 422', $passed, $failed);

    // 11. Test Authorize with VALID Quick-PIN ("7788") -> Succeeds!
    $validPinReq = \Illuminate\Http\Request::create("/api/v1/client-portal/milestones/verifications/{$verification->uuid}/authorize", 'POST', [
        'feedback' => 'Foundations and slump tests fully satisfactory. Approved for escrow disbursement.',
        'pin' => $pin,
    ]);
    $validPinReq->headers->set('Authorization', 'Bearer ' . $token);
    $validPinRes = app()->handle($validPinReq);
    $authData = json_decode($validPinRes->getContent(), true);

    assertTest($validPinRes->getStatusCode() === 200, 'Authorize with valid Quick-PIN returns HTTP 200', $passed, $failed);
    assertTest($authData['data']['client_approval_status'] === 'approved', 'Client approval status updated to "approved"', $passed, $failed);
    assertTest($authData['data']['stage'] === 'client_approved', 'Verification stage updated to "client_approved"', $passed, $failed);

    // Verify linked payment release was updated
    $freshRelease = MilestonePaymentRelease::find($release->id);
    assertTest(str_contains($freshRelease->notes, 'Quick-PIN'), 'Escrow release notes updated with Quick-PIN signature', $passed, $failed);

} catch (\Exception $e) {
    echo " [ERROR] Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    $failed++;
}

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "--------------------------------------------------------\n\n";

exit($failed > 0 ? 1 : 0);
