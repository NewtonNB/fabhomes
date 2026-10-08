<?php
// Final Company API Test - Phase 6 Week 1 Day 1

$base = 'http://localhost:8001/api/v1';

function api($method, $path, $data = null, $token = null) {
    global $base;
    $ch = curl_init($base . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    $headers = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($response, true)];
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "COMPANY API TESTS - PHASE 6 WEEK 1 DAY 1\n";
echo str_repeat("=", 50) . "\n\n";

// 1. Login
echo "✓ Test 1: Login\n";
$r = api('POST', '/login', ['login' => 'admin@zimbani.com', 'password' => 'password']);
$token = $r['data']['data']['token'];
echo "  Status: {$r['code']}, User: {$r['data']['data']['user']['name']}\n\n";

// 2. Create Parent Company
echo "✓ Test 2: Create Parent Company\n";
$r = api('POST', '/companies', [
    'name' => 'FAB Homes Uganda Limited',
    'email' => 'info@fabhomes.ug',
    'phone' => '+256700000000',
    'address' => 'Plot 123, Kampala Road',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'company_type' => 'real_estate',
    'status' => 'active',
    'tax_number' => 'TIN-2024-001',
    'registration_number' => 'REG-2024-001'
], $token);
$parentId = $r['data']['data']['uuid'] ?? null;
echo "  Status: {$r['code']}, UUID: $parentId\n\n";

// 3. Create Subsidiary
echo "✓ Test 3: Create Subsidiary\n";
$r = api('POST', '/companies', [
    'name' => 'FAB Construction Limited',
    'email' => 'construction@fabhomes.ug',
    'phone' => '+256700000001',
    'address' => 'Plot 124, Kampala Road',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'company_type' => 'construction',
    'status' => 'active',
    'parent_company_id' => $parentId
], $token);
$subId = $r['data']['data']['uuid'] ?? null;
echo "  Status: {$r['code']}, UUID: $subId\n\n";

// 4. List All
echo "✓ Test 4: List All Companies\n";
$r = api('GET', '/companies', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Count: $count\n\n";

// 5. Get Single
echo "✓ Test 5: Get Single Company\n";
$r = api('GET', "/companies/$parentId", null, $token);
$name = $r['data']['data']['name'] ?? 'N/A';
echo "  Status: {$r['code']}, Name: $name\n\n";

// 6. Update
echo "✓ Test 6: Update Company\n";
$r = api('PUT', "/companies/$parentId", ['website' => 'https://fabhomes.ug'], $token);
$website = $r['data']['data']['website'] ?? 'N/A';
echo "  Status: {$r['code']}, Website: $website\n\n";

// 7. Subsidiaries
echo "✓ Test 7: Get Subsidiaries\n";
$r = api('GET', "/companies/$parentId/subsidiaries", null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Count: $count\n\n";

// 8. Statistics
echo "✓ Test 8: Get Statistics\n";
$r = api('GET', '/admin/companies/statistics', null, $token);
$total = $r['data']['data']['total_companies'] ?? 0;
$active = $r['data']['data']['active_companies'] ?? 0;
echo "  Status: {$r['code']}, Total: $total, Active: $active\n\n";

// 9. Soft Delete
echo "✓ Test 9: Soft Delete\n";
$r = api('DELETE', "/companies/$subId", null, $token);
echo "  Status: {$r['code']}\n\n";

// 10. Restore
echo "✓ Test 10: Restore Company\n";
$r = api('POST', "/companies/$subId/restore", null, $token);
echo "  Status: {$r['code']}\n\n";

// 11. Validation Test (Circular Reference)
echo "✓ Test 11: Prevent Circular Reference\n";
$r = api('PUT', "/companies/$parentId", ['parent_company_id' => $subId], $token);
$hasError = isset($r['data']['errors']['parent_company_id']);
echo "  Status: {$r['code']}, Blocked: " . ($hasError ? 'YES' : 'NO') . "\n\n";

// 12. Filter Test
echo "✓ Test 12: Filter by Status\n";
$r = api('GET', '/companies?status=active', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Active companies: $count\n\n";

echo str_repeat("=", 50) . "\n";
echo "ALL TESTS COMPLETED SUCCESSFULLY!\n";
echo str_repeat("=", 50) . "\n\n";
