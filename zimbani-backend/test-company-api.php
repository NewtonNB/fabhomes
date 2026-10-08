<?php

// Simple PHP script to test Company API endpoints

$baseUrl = 'http://localhost:8001/api/v1';
$token = null;

function apiRequest($method, $endpoint, $data = null, $token = null) {
    global $baseUrl;
    
    $ch = curl_init($baseUrl . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => json_decode($response, true)
    ];
}

echo "\n========================================\n";
echo "COMPANY API ENDPOINT TESTS\n";
echo "========================================\n\n";

// Test 1: Login
echo "1. Login as Super Admin...\n";
$response = apiRequest('POST', '/login', [
    'login' => 'admin@zimbani.com',
    'password' => 'password'
]);

if ($response['code'] == 200 && $response['body']['success']) {
    $token = $response['body']['data']['token'] ?? $response['body']['data']['access_token'] ?? null;
    if (!$token) {
        echo "   ✗ No token in response\n";
        print_r($response['body']);
        exit(1);
    }
    echo "   ✓ Login successful\n";
    echo "   User: " . $response['body']['data']['user']['name'] . "\n";
    echo "   Token: " . substr($token, 0, 40) . "...\n\n";
} else {
    echo "   ✗ Login failed\n";
    print_r($response);
    exit(1);
}

// Test 2: Create Parent Company
echo "2. Creating parent company...\n";
$response = apiRequest('POST', '/companies', [
    'name' => 'FAB Homes Uganda Ltd',
    'email' => 'info@fabhomes.ug',
    'phone' => '+256700000000',
    'address' => 'Plot 123, Kampala Road',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'company_type' => 'real_estate',
    'status' => 'active',
    'tax_number' => 'TIN-123456789',
    'registration_number' => 'REG-FAB-2024'
], $token);

if ($response['code'] == 201 && $response['body']['success']) {
    $parentId = $response['body']['data']['uuid'];
    echo "   ✓ Parent company created\n";
    echo "   UUID: $parentId\n";
    echo "   Name: " . $response['body']['data']['name'] . "\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n";
    print_r($response['body']);
    echo "\n";
}

// Test 3: Create Subsidiary
echo "3. Creating subsidiary company...\n";
$response = apiRequest('POST', '/companies', [
    'name' => 'FAB Construction Ltd',
    'email' => 'construction@fabhomes.ug',
    'phone' => '+256700000001',
    'address' => 'Plot 124, Kampala Road',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'company_type' => 'construction',
    'status' => 'active',
    'parent_company_id' => $parentId
], $token);

if ($response['code'] == 201 && $response['body']['success']) {
    $subId = $response['body']['data']['uuid'];
    echo "   ✓ Subsidiary created\n";
    echo "   UUID: $subId\n";
    echo "   Parent: " . $response['body']['data']['parent_company']['name'] . "\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n";
    print_r($response['body']);
    echo "\n";
}

// Test 4: List All Companies
echo "4. Listing all companies...\n";
$response = apiRequest('GET', '/companies', null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Retrieved " . count($response['body']['data']) . " companies\n";
    foreach ($response['body']['data'] as $company) {
        echo "   - {$company['name']} [{$company['company_type']}]\n";
    }
    echo "\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n";
    print_r($response['body']);
    echo "\n";
}

// Test 5: Get Single Company
echo "5. Getting company details...\n";
$response = apiRequest('GET', "/companies/$parentId", null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Company details retrieved\n";
    echo "   Name: " . $response['body']['data']['name'] . "\n";
    echo "   Status: " . $response['body']['data']['status'] . "\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

// Test 6: Update Company
echo "6. Updating company...\n";
$response = apiRequest('PUT', "/companies/$parentId", [
    'website' => 'https://fabhomes.ug'
], $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Company updated\n";
    echo "   Website: " . $response['body']['data']['website'] . "\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

// Test 7: Get Subsidiaries
echo "7. Getting subsidiaries...\n";
$response = apiRequest('GET', "/companies/$parentId/subsidiaries", null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Retrieved " . count($response['body']['data']) . " subsidiaries\n";
    foreach ($response['body']['data'] as $sub) {
        echo "   - {$sub['name']}\n";
    }
    echo "\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

// Test 8: Get Statistics  
echo "8. Getting company statistics...\n";
$response = apiRequest('GET', "/admin/companies/statistics", null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Statistics retrieved\n";
    echo "   Total: " . $response['body']['data']['total_companies'] . "\n";
    echo "   Active: " . $response['body']['data']['active_companies'] . "\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

// Test 9: Soft Delete
echo "9. Soft deleting subsidiary...\n";
$response = apiRequest('DELETE', "/companies/$subId", null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Company soft deleted\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

// Test 10: Restore
echo "10. Restoring company...\n";
$response = apiRequest('POST', "/companies/$subId/restore", null, $token);

if ($response['code'] == 200 && $response['body']['success']) {
    echo "   ✓ Company restored\n\n";
} else {
    echo "   ✗ Failed (HTTP " . $response['code'] . ")\n\n";
}

echo "========================================\n";
echo "TESTING COMPLETE\n";
echo "========================================\n\n";
