<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

echo "========================================================\n";
echo "   PHASE 12 DAY 1: CLIENT AUTH & PWA SECURITY TEST      \n";
echo "========================================================\n\n";

// Clear rate limits
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

// 1. Test Client Registration with Quick-PIN
$uniqueId = time() . '_' . rand(100, 999);
$testEmail = "client.portal.{$uniqueId}@zimbani-test.com";
$testPhone = "+25678" . rand(1000000, 9999999);

$registerPayload = [
    'first_name' => 'Kigozi',
    'last_name' => 'Mukasa',
    'email' => $testEmail,
    'phone' => $testPhone,
    'password' => 'SecurePass2026!',
    'password_confirmation' => 'SecurePass2026!',
    'pin' => '2468',
    'city' => 'Entebbe',
    'country' => 'Uganda',
];

$regRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/auth/register',
    'POST',
    $registerPayload,
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.0.' . rand(1, 250)]
);

$regResponse = handleRequest($app, $kernel, $regRequest);
$regData = json_decode($regResponse->getContent(), true);

if ($regResponse->getStatusCode() !== 201) {
    echo "Registration error [{$regResponse->getStatusCode()}]: " . $regResponse->getContent() . "\n";
}

assertTest($regResponse->getStatusCode() === 201, "Registration returns HTTP 201 Created");
assertTest(isset($regData['data']['token']), "Registration returns Sanctum access token");
assertTest(($regData['data']['client']['first_name'] ?? '') === 'Kigozi', "Client record initialized with first_name");
assertTest(($regData['data']['security_profile']['has_pin'] ?? false) === true, "Quick-PIN recorded in security profile");

$token = $regData['data']['token'] ?? null;
$clientNumber = $regData['data']['client']['client_number'] ?? null;

// 2. Test Standard Login (Email + Password)
$loginRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/auth/login',
    'POST',
    [
        'login' => $testEmail,
        'password' => 'SecurePass2026!',
        'device_name' => 'Safari iOS 18 (PWA)',
    ],
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.1.' . rand(1, 250)]
);

$loginResponse = handleRequest($app, $kernel, $loginRequest);
$loginData = json_decode($loginResponse->getContent(), true);

assertTest($loginResponse->getStatusCode() === 200, "Password login returns HTTP 200");
assertTest(!empty($loginData['data']['token']), "Password login returns bearer token");

// 3. Test Quick-PIN Login (4 Digits)
$pinRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/auth/pin-login',
    'POST',
    [
        'login' => $testEmail,
        'pin' => '2468',
        'device_name' => 'iPhone 15 Mobile PWA',
    ],
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.2.' . rand(1, 250)]
);

$pinResponse = handleRequest($app, $kernel, $pinRequest);
$pinData = json_decode($pinResponse->getContent(), true);

if ($pinResponse->getStatusCode() !== 200) {
    echo "Pin login error [{$pinResponse->getStatusCode()}]: " . $pinResponse->getContent() . "\n";
}

assertTest($pinResponse->getStatusCode() === 200, "Quick-PIN login returns HTTP 200");
assertTest(($pinData['data']['user']['email'] ?? '') === $testEmail, "Quick-PIN login resolves correct user");

// 4. Test Authenticated Client Profile & Portfolio Stats
$profileRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/profile',
    'GET',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.3.' . rand(1, 250),
    ]
);

$profileResponse = handleRequest($app, $kernel, $profileRequest);
$profileData = json_decode($profileResponse->getContent(), true);

if ($profileResponse->getStatusCode() !== 200) {
    echo "Profile error [{$profileResponse->getStatusCode()}]: " . $profileResponse->getContent() . "\n";
}

assertTest($profileResponse->getStatusCode() === 200, "Client profile returns HTTP 200");
assertTest(isset($profileData['data']['portfolio']['total_savings_balance']), "Portfolio stats include savings balance");
assertTest(($profileData['data']['client']['city'] ?? '') === 'Entebbe', "Profile data matches registered city");

// 5. Test Update Client Profile
$updateRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/profile',
    'PUT',
    [
        'address_line1' => 'Plot 42 Circular Road',
        'district' => 'Wakiso',
        'nok_name' => 'Amina Mukasa',
        'nok_relationship' => 'Spouse',
        'nok_phone' => '+256772111222',
    ],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.4.' . rand(1, 250),
    ]
);

$updateResponse = handleRequest($app, $kernel, $updateRequest);
$updateData = json_decode($updateResponse->getContent(), true);

assertTest($updateResponse->getStatusCode() === 200, "Profile update returns HTTP 200");
assertTest(($updateData['data']['nok_name'] ?? '') === 'Amina Mukasa', "Next of Kin name updated successfully");
assertTest(($updateData['data']['district'] ?? '') === 'Wakiso', "District updated successfully");

// 6. Test KYC Identity Submission
$kycRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/profile/kyc',
    'POST',
    [
        'id_type' => 'national_id',
        'id_number' => 'CM90012345ABCDEF',
        'id_expiry_date' => '2034-08-15',
    ],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.5.' . rand(1, 250),
    ]
);

$kycResponse = handleRequest($app, $kernel, $kycRequest);
$kycData = json_decode($kycResponse->getContent(), true);

assertTest($kycResponse->getStatusCode() === 200, "KYC submission returns HTTP 200");
assertTest(($kycData['data']['client']['id_number'] ?? '') === 'CM90012345ABCDEF', "National ID number saved");
assertTest(($kycData['data']['client']['kyc_status'] ?? '') === 'pending', "KYC status marked pending verification");

// 7. Test Biometric Setup & Biometric Login
$bioCredId = 'webauthn_cred_' . Illuminate\Support\Str::random(24);
$bioSetupRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/security/biometrics',
    'POST',
    [
        'credential_id' => $bioCredId,
        'device_name' => 'Face ID (Apple iPhone 15)',
        'enabled' => true,
    ],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.6.' . rand(1, 250),
    ]
);

$bioSetupResponse = handleRequest($app, $kernel, $bioSetupRequest);
$bioSetupData = json_decode($bioSetupResponse->getContent(), true);

assertTest($bioSetupResponse->getStatusCode() === 200, "Biometric setup returns HTTP 200");
assertTest(($bioSetupData['security']['biometric_enabled'] ?? false) === true, "Biometric enabled in profile");

// Test Biometric Login with Credential ID
$bioLoginRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/auth/biometric-login',
    'POST',
    [
        'credential_id' => $bioCredId,
        'device_name' => 'Face ID (Apple iPhone 15)',
    ],
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.7.' . rand(1, 250)]
);

$bioLoginResponse = handleRequest($app, $kernel, $bioLoginRequest);
$bioLoginData = json_decode($bioLoginResponse->getContent(), true);

assertTest($bioLoginResponse->getStatusCode() === 200, "Biometric login returns HTTP 200");
assertTest(($bioLoginData['data']['user']['email'] ?? '') === $testEmail, "Biometric login resolves registered user");

// 8. Test PWA Install Recording
$pwaRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/security/pwa-install',
    'POST',
    [
        'device_info' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',
    ],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.8.' . rand(1, 250),
    ]
);

$pwaResponse = handleRequest($app, $kernel, $pwaRequest);
$pwaData = json_decode($pwaResponse->getContent(), true);

assertTest($pwaResponse->getStatusCode() === 200, "PWA install recording returns HTTP 200");
assertTest(($pwaData['security']['pwa_installed'] ?? false) === true, "PWA installation recorded");

// 9. Test Active Security Sessions Listing
$sessRequest = Illuminate\Http\Request::create(
    '/api/v1/client-portal/security/sessions',
    'GET',
    [],
    [],
    [],
    [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'REMOTE_ADDR' => '10.0.9.' . rand(1, 250),
    ]
);

$sessResponse = handleRequest($app, $kernel, $sessRequest);
$sessData = json_decode($sessResponse->getContent(), true);

assertTest($sessResponse->getStatusCode() === 200, "Security sessions returns HTTP 200");
assertTest(count($sessData['data']['sessions'] ?? []) >= 1, "Active devices/tokens listed");

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: $passCount Passed, $failCount Failed\n";
echo "--------------------------------------------------------\n";

if ($failCount > 0) {
    exit(1);
}
