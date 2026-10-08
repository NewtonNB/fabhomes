<?php
// Project API Test Script - Phase 6 Week 1 Day 2

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

echo "\n" . str_repeat("=", 60) . "\n";
echo "PROJECT API TESTS - PHASE 6 WEEK 1 DAY 2\n";
echo str_repeat("=", 60) . "\n\n";

// 1. Login
echo "✓ Test 1: Login as Super Admin\n";
$r = api('POST', '/login', ['login' => 'admin@zimbani.com', 'password' => 'password']);
$token = $r['data']['data']['token'];
echo "  Status: {$r['code']}, User: {$r['data']['data']['user']['name']}\n\n";

// 2. Get test company
echo "✓ Test 2: Get existing company for project\n";
$r = api('GET', '/companies?per_page=1', null, $token);
if (isset($r['data']['data'][0])) {
    $companyId = $r['data']['data'][0]['uuid'];
    echo "  Status: {$r['code']}, Company: {$r['data']['data'][0]['name']}\n";
    echo "  Company ID: $companyId\n\n";
} else {
    // Create a test company if none exists
    echo "  No companies found, creating test company...\n";
    $r = api('POST', '/companies', [
        'name' => 'Test Construction Co',
        'email' => 'test@construction.ug',
        'phone' => '+256700000000',
        'address' => 'Test Address',
        'city' => 'Kampala',
        'country' => 'Uganda',
        'company_type' => 'construction',
        'status' => 'active',
        'registration_number' => 'TEST-REG-001',
        'tax_number' => 'TEST-TAX-001'
    ], $token);
    $companyId = $r['data']['data']['uuid'];
    echo "  Status: {$r['code']}, Created: {$r['data']['data']['name']}\n";
    echo "  Company ID: $companyId\n\n";
}

// 3. Create Project
echo "✓ Test 3: Create residential project\n";
$r = api('POST', '/projects', [
    'name' => 'Sunrise Heights Residential',
    'code' => 'PRJ-001',
    'description' => 'Luxury residential apartments with 50 units',
    'company_id' => $companyId,
    'project_type' => 'residential',
    'status' => 'planning',
    'start_date' => date('Y-m-d', strtotime('+1 week')),
    'end_date' => date('Y-m-d', strtotime('+6 months')),
    'budget' => 500000000,
    'currency' => 'UGX',
    'address' => 'Plot 45, Kololo',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'contact_person' => 'John Manager',
    'contact_email' => 'john@project.ug',
    'contact_phone' => '+256700111111',
    'total_units' => 50,
    'total_area' => 5000,
    'area_unit' => 'sqm'
], $token);
$projectId = $r['data']['data']['uuid'] ?? null;
echo "  Status: {$r['code']}, UUID: $projectId\n";
if ($projectId) {
    echo "  Name: {$r['data']['data']['name']}\n";
    echo "  Code: {$r['data']['data']['code']}\n";
    echo "  Status: {$r['data']['data']['status']}\n\n";
}

// 4. Create another project
echo "✓ Test 4: Create commercial project\n";
$r = api('POST', '/projects', [
    'name' => 'Tech Park Commercial Complex',
    'code' => 'PRJ-002',
    'description' => 'Modern commercial office space',
    'company_id' => $companyId,
    'project_type' => 'commercial',
    'status' => 'active',
    'start_date' => date('Y-m-d'),
    'end_date' => date('Y-m-d', strtotime('+1 year')),
    'budget' => 750000000,
    'currency' => 'UGX',
    'address' => 'Plot 10, Industrial Area',
    'city' => 'Kampala',
    'country' => 'Uganda',
    'total_area' => 8000,
    'area_unit' => 'sqm'
], $token);
$project2Id = $r['data']['data']['uuid'] ?? null;
echo "  Status: {$r['code']}, UUID: $project2Id\n";
if ($project2Id) {
    echo "  Name: {$r['data']['data']['name']}\n";
    echo "  Type: {$r['data']['data']['project_type']}\n\n";
}

// 5. List All Projects
echo "✓ Test 5: List all projects\n";
$r = api('GET', '/projects?with_company=1', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Count: $count\n";
if ($count > 0) {
    echo "  Projects:\n";
    foreach ($r['data']['data'] as $proj) {
        echo "    - {$proj['name']} [{$proj['status']}]\n";
    }
}
echo "\n";

// 6. Get Single Project
echo "✓ Test 6: Get single project details\n";
$r = api('GET', "/projects/$projectId?with_company=1", null, $token);
$name = $r['data']['data']['name'] ?? 'N/A';
echo "  Status: {$r['code']}, Name: $name\n";
if (isset($r['data']['data'])) {
    echo "  Progress: {$r['data']['data']['progress_percentage']}%\n";
    echo "  Duration: {$r['data']['data']['duration_days']} days\n";
    echo "  Company: {$r['data']['data']['company']['name']}\n\n";
}

// 7. Update Project
echo "✓ Test 7: Update project status to active\n";
$r = api('PUT', "/projects/$projectId", [
    'status' => 'active',
    'total_spent' => 50000000
], $token);
echo "  Status: {$r['code']}\n";
if (isset($r['data']['data'])) {
    echo "  New status: {$r['data']['data']['status']}\n";
    echo "  Budget utilization: {$r['data']['data']['budget_utilization']}%\n\n";
}

// 8. Filter Projects
echo "✓ Test 8: Filter projects by status (active)\n";
$r = api('GET', '/projects?status=active', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Active projects: $count\n\n";

// 9. Filter by Project Type
echo "✓ Test 9: Filter by project type (residential)\n";
$r = api('GET', '/projects?project_type=residential', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Residential projects: $count\n\n";

// 10. Search Projects
echo "✓ Test 10: Search projects by name\n";
$r = api('GET', '/projects?search=Sunrise', null, $token);
$count = isset($r['data']['data']) ? count($r['data']['data']) : 0;
echo "  Status: {$r['code']}, Found: $count\n\n";

// 11. Get Statistics
echo "✓ Test 11: Get project statistics\n";
$r = api('GET', '/admin/projects/statistics', null, $token);
echo "  Status: {$r['code']}\n";
if (isset($r['data']['data'])) {
    echo "  Total: {$r['data']['data']['total_projects']}\n";
    echo "  Active: {$r['data']['data']['active_projects']}\n";
    echo "  Planning: {$r['data']['data']['planning_projects']}\n";
    echo "  Completed: {$r['data']['data']['completed_projects']}\n";
    echo "  Total Budget: " . number_format($r['data']['data']['total_budget']) . "\n";
    echo "  Total Spent: " . number_format($r['data']['data']['total_spent']) . "\n\n";
}

// 12. Soft Delete Project
echo "✓ Test 12: Soft delete project\n";
$r = api('DELETE', "/projects/$project2Id", null, $token);
echo "  Status: {$r['code']}\n";
if (isset($r['data']['message'])) {
    echo "  Message: {$r['data']['message']}\n\n";
}

// 13. Restore Project
echo "✓ Test 13: Restore deleted project\n";
$r = api('POST', "/projects/$project2Id/restore", null, $token);
echo "  Status: {$r['code']}\n";
if (isset($r['data']['message'])) {
    echo "  Message: {$r['data']['message']}\n\n";
}

// 14. Test Validation - Duplicate Code
echo "✓ Test 14: Test validation (duplicate project code)\n";
$r = api('POST', '/projects', [
    'name' => 'Another Project',
    'code' => 'PRJ-001', // Duplicate
    'company_id' => $companyId,
    'project_type' => 'residential',
    'status' => 'planning'
], $token);
echo "  Status: {$r['code']} (expected 422)\n";
if (isset($r['data']['errors']['code'])) {
    echo "  Error: {$r['data']['errors']['code'][0]}\n\n";
}

// 15. Test Date Validation
echo "✓ Test 15: Test date validation (end before start)\n";
$r = api('POST', '/projects', [
    'name' => 'Invalid Date Project',
    'code' => 'PRJ-999',
    'company_id' => $companyId,
    'project_type' => 'residential',
    'status' => 'planning',
    'start_date' => '2026-12-01',
    'end_date' => '2026-11-01' // Before start
], $token);
echo "  Status: {$r['code']} (expected 422)\n";
if (isset($r['data']['errors']['end_date'])) {
    echo "  Error: {$r['data']['errors']['end_date'][0]}\n\n";
}

echo str_repeat("=", 60) . "\n";
echo "ALL PROJECT API TESTS COMPLETED!\n";
echo str_repeat("=", 60) . "\n\n";
