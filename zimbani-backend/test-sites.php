<?php

/**
 * Test script for Site Management API endpoints
 * Run: php test-sites.php
 */

// Configuration
$baseUrl = 'http://localhost:8001/api/v1';
$loginEmail = 'admin@zimbani.com';
$loginPassword = 'password';

// Color output functions
function color($text, $color = 'green') {
    $colors = [
        'green' => "\033[32m",
        'red' => "\033[31m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'reset' => "\033[0m",
    ];
    return $colors[$color] . $text . $colors['reset'];
}

function printTest($name) {
    echo "\n" . color("═══ Testing: $name ═══", 'blue') . "\n";
}

function printSuccess($message) {
    echo color("✓ $message", 'green') . "\n";
}

function printError($message) {
    echo color("✗ $message", 'red') . "\n";
}

function printWarning($message) {
    echo color("⚠ $message", 'yellow') . "\n";
}

// HTTP request function
function makeRequest($method, $url, $data = null, $token = null) {
    $ch = curl_init();
    
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => json_decode($response, true),
        'raw' => $response,
    ];
}

// Start tests
echo color("\n╔════════════════════════════════════════════╗", 'blue') . "\n";
echo color("║   ZIMBANI Site Management API Tests      ║", 'blue') . "\n";
echo color("╚════════════════════════════════════════════╝", 'blue') . "\n";

// Step 1: Login
printTest("Authentication");
$loginResponse = makeRequest('POST', "$baseUrl/login", [
    'login' => $loginEmail,
    'password' => $loginPassword,
]);

if ($loginResponse['code'] !== 200) {
    printError("Login failed with code: {$loginResponse['code']}");
    echo "Response: " . json_encode($loginResponse['body'], JSON_PRETTY_PRINT) . "\n";
    exit(1);
}

$token = $loginResponse['body']['data']['token'] ?? $loginResponse['body']['token'] ?? null;
if (!$token) {
    printError("No token received from login");
    exit(1);
}
printSuccess("Logged in successfully");

// Step 2: Get existing projects to use for site creation
printTest("Get Projects");
$projectsResponse = makeRequest('GET', "$baseUrl/projects?per_page=1", null, $token);

if ($projectsResponse['code'] !== 200 || empty($projectsResponse['body']['data'])) {
    printWarning("No projects found. Creating a test project first...");
    
    // Get a company first
    $companiesResponse = makeRequest('GET', "$baseUrl/companies?per_page=1", null, $token);
    if ($companiesResponse['code'] !== 200 || empty($companiesResponse['body']['data'])) {
        printError("No companies found. Cannot proceed with tests.");
        exit(1);
    }
    
    $companyUuid = $companiesResponse['body']['data'][0]['uuid'];
    
    // Create a test project
    $projectData = [
        'name' => 'Test Project for Sites',
        'code' => 'TEST-PROJ-' . time(),
        'company_id' => $companyUuid,
        'project_type' => 'residential',
        'status' => 'active',
        'description' => 'Test project for site management',
    ];
    
    $createProjectResponse = makeRequest('POST', "$baseUrl/projects", $projectData, $token);
    if ($createProjectResponse['code'] !== 201) {
        printError("Failed to create test project");
        echo "Response: " . json_encode($createProjectResponse['body'], JSON_PRETTY_PRINT) . "\n";
        exit(1);
    }
    
    $projectUuid = $createProjectResponse['body']['data']['uuid'];
    printSuccess("Created test project: $projectUuid");
} else {
    $projectUuid = $projectsResponse['body']['data'][0]['uuid'];
    printSuccess("Using existing project: $projectUuid");
}

// Step 3: Create Site
printTest("Create Site (POST /sites)");
$siteData = [
    'name' => 'Construction Site Alpha',
    'code' => 'SITE-ALPHA-' . time(),
    'project_id' => $projectUuid,
    'site_type' => 'construction',
    'status' => 'active',
    'description' => 'Main construction site for residential units',
    'address' => 'Plot 123, Industrial Area',
    'city' => 'Kampala',
    'region' => 'Central',
    'country' => 'Uganda',
    'latitude' => 0.3476,
    'longitude' => 32.5825,
    'total_area' => 5000.00,
    'buildable_area' => 3500.00,
    'start_date' => date('Y-m-d'),
    'expected_completion_date' => date('Y-m-d', strtotime('+6 months')),
    'allocated_budget' => 500000000, // 500M UGX
    'currency' => 'UGX',
    'contact_person' => 'John Site Manager',
    'contact_phone' => '+256700000001',
    'contact_email' => 'john.site@zimbani.com',
    'utilities' => ['electricity', 'water', 'internet'],
    'facilities' => ['office', 'storage', 'security_post'],
];

$createResponse = makeRequest('POST', "$baseUrl/sites", $siteData, $token);

if ($createResponse['code'] === 201) {
    $siteUuid = $createResponse['body']['data']['uuid'];
    printSuccess("Site created successfully: $siteUuid");
    echo "  Name: {$createResponse['body']['data']['name']}\n";
    echo "  Code: {$createResponse['body']['data']['code']}\n";
    echo "  Status: {$createResponse['body']['data']['status']}\n";
} else {
    printError("Failed to create site (HTTP {$createResponse['code']})");
    echo "Response: " . json_encode($createResponse['body'], JSON_PRETTY_PRINT) . "\n";
    exit(1);
}

// Step 4: Get All Sites
printTest("Get All Sites (GET /sites)");
$listResponse = makeRequest('GET', "$baseUrl/sites?per_page=10", null, $token);

if ($listResponse['code'] === 200) {
    $siteCount = count($listResponse['body']['data']);
    printSuccess("Retrieved $siteCount sites");
    echo "  Total: {$listResponse['body']['meta']['total']}\n";
    echo "  Current Page: {$listResponse['body']['meta']['current_page']}\n";
} else {
    printError("Failed to list sites (HTTP {$listResponse['code']})");
}

// Step 5: Get Single Site
printTest("Get Single Site (GET /sites/{uuid})");
$showResponse = makeRequest('GET', "$baseUrl/sites/$siteUuid?with_project=1&with_supervisor=1", null, $token);

if ($showResponse['code'] === 200) {
    printSuccess("Retrieved site details");
    echo "  Name: {$showResponse['body']['data']['name']}\n";
    echo "  Type: {$showResponse['body']['data']['site_type']}\n";
    echo "  Progress: {$showResponse['body']['data']['progress_percentage']}%\n";
    echo "  Area Utilization: {$showResponse['body']['data']['area_utilization']}%\n";
} else {
    printError("Failed to get site (HTTP {$showResponse['code']})");
}

// Step 6: Update Site
printTest("Update Site (PUT /sites/{uuid})");
$updateData = [
    'description' => 'Updated: Main construction site with modern facilities',
    'total_workers' => 25,
    'total_equipment' => 10,
];

$updateResponse = makeRequest('PUT', "$baseUrl/sites/$siteUuid", $updateData, $token);

if ($updateResponse['code'] === 200) {
    printSuccess("Site updated successfully");
    echo "  Workers: {$updateResponse['body']['data']['total_workers']}\n";
    echo "  Equipment: {$updateResponse['body']['data']['total_equipment']}\n";
} else {
    printError("Failed to update site (HTTP {$updateResponse['code']})");
    echo "Response: " . json_encode($updateResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 7: Filter Sites
printTest("Filter Sites by Status (GET /sites?status=active)");
$filterResponse = makeRequest('GET', "$baseUrl/sites?status=active&per_page=5", null, $token);

if ($filterResponse['code'] === 200) {
    printSuccess("Filtered sites successfully");
    echo "  Active Sites: " . count($filterResponse['body']['data']) . "\n";
} else {
    printError("Failed to filter sites (HTTP {$filterResponse['code']})");
}

// Step 8: Search Sites
printTest("Search Sites (GET /sites?search=Alpha)");
$searchResponse = makeRequest('GET', "$baseUrl/sites?search=Alpha", null, $token);

if ($searchResponse['code'] === 200) {
    printSuccess("Search completed successfully");
    echo "  Results: " . count($searchResponse['body']['data']) . "\n";
} else {
    printError("Failed to search sites (HTTP {$searchResponse['code']})");
}

// Step 9: Get Site Statistics
printTest("Get Site Statistics (GET /admin/sites/statistics)");
$statsResponse = makeRequest('GET', "$baseUrl/admin/sites/statistics", null, $token);

if ($statsResponse['code'] === 200) {
    printSuccess("Retrieved site statistics");
    echo "  Total Sites: {$statsResponse['body']['total_sites']}\n";
    echo "  Active Sites: {$statsResponse['body']['active_sites']}\n";
    echo "  Completed Sites: {$statsResponse['body']['completed_sites']}\n";
    echo "  Total Workers: {$statsResponse['body']['total_workers']}\n";
    echo "  Total Equipment: {$statsResponse['body']['total_equipment']}\n";
} else {
    printError("Failed to get statistics (HTTP {$statsResponse['code']})");
}

// Step 10: Get Site Workers
printTest("Get Site Workers (GET /sites/{uuid}/workers)");
$workersResponse = makeRequest('GET', "$baseUrl/sites/$siteUuid/workers", null, $token);

if ($workersResponse['code'] === 200) {
    printSuccess("Retrieved site workers");
    echo "  Total Workers: {$workersResponse['body']['total']}\n";
} else {
    printError("Failed to get site workers (HTTP {$workersResponse['code']})");
}

// Step 11: Assign Workers (if we have a user to assign)
printTest("Assign Workers (POST /sites/{uuid}/workers/assign)");
$usersResponse = makeRequest('GET', "$baseUrl/admin/users?per_page=1", null, $token);

if ($usersResponse['code'] === 200 && !empty($usersResponse['body']['data'])) {
    $userId = $usersResponse['body']['data'][0]['id'];
    
    $assignData = [
        'workers' => [
            [
                'user_id' => $userId,
                'role' => 'Site Foreman',
                'status' => 'active',
            ],
        ],
    ];
    
    $assignResponse = makeRequest('POST', "$baseUrl/sites/$siteUuid/workers/assign", $assignData, $token);
    
    if ($assignResponse['code'] === 200) {
        printSuccess("Workers assigned successfully");
        echo "  Assigned: {$assignResponse['body']['assigned_count']}\n";
    } else {
        printWarning("Failed to assign workers (HTTP {$assignResponse['code']})");
        echo "Response: " . json_encode($assignResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }
} else {
    printWarning("No users available to assign as workers");
}

// Step 12: Update Inspection
printTest("Update Site Inspection (POST /sites/{uuid}/inspection)");
$inspectionData = [
    'last_inspection_date' => date('Y-m-d'),
    'next_inspection_date' => date('Y-m-d', strtotime('+1 month')),
    'inspection_notes' => 'Regular safety inspection completed. All measures in place.',
];

$inspectionResponse = makeRequest('POST', "$baseUrl/sites/$siteUuid/inspection", $inspectionData, $token);

if ($inspectionResponse['code'] === 200) {
    printSuccess("Inspection updated successfully");
    echo "  Last Inspection: {$inspectionResponse['body']['data']['last_inspection_date']}\n";
    echo "  Next Inspection: {$inspectionResponse['body']['data']['next_inspection_date']}\n";
} else {
    printError("Failed to update inspection (HTTP {$inspectionResponse['code']})");
    echo "Response: " . json_encode($inspectionResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 13: Test Validation Error
printTest("Test Validation Error (invalid site_type)");
$invalidData = [
    'name' => 'Invalid Site',
    'code' => 'INVALID-' . time(),
    'project_id' => $projectUuid,
    'site_type' => 'invalid_type', // Invalid
    'status' => 'active',
];

$validationResponse = makeRequest('POST', "$baseUrl/sites", $invalidData, $token);

if ($validationResponse['code'] === 422) {
    printSuccess("Validation error handled correctly (HTTP 422)");
    echo "  Error: " . ($validationResponse['body']['message'] ?? 'Validation failed') . "\n";
} else {
    printWarning("Expected validation error (422), got {$validationResponse['code']}");
}

// Step 14: Soft Delete Site
printTest("Delete Site (DELETE /sites/{uuid})");
$deleteResponse = makeRequest('DELETE', "$baseUrl/sites/$siteUuid", null, $token);

if ($deleteResponse['code'] === 200) {
    printSuccess("Site soft deleted successfully");
} else {
    printError("Failed to delete site (HTTP {$deleteResponse['code']})");
    echo "Response: " . json_encode($deleteResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 15: Verify Soft Delete
printTest("Verify Soft Delete (GET /sites/{uuid} should fail)");
$verifyDeleteResponse = makeRequest('GET', "$baseUrl/sites/$siteUuid", null, $token);

if ($verifyDeleteResponse['code'] === 404) {
    printSuccess("Soft delete verified - site not accessible");
} else {
    printWarning("Site still accessible after deletion (HTTP {$verifyDeleteResponse['code']})");
}

// Step 16: Restore Site
printTest("Restore Site (POST /sites/{uuid}/restore)");
$restoreResponse = makeRequest('POST', "$baseUrl/sites/$siteUuid/restore", null, $token);

if ($restoreResponse['code'] === 200) {
    printSuccess("Site restored successfully");
} else {
    printError("Failed to restore site (HTTP {$restoreResponse['code']})");
    echo "Response: " . json_encode($restoreResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 17: Verify Restore
printTest("Verify Restore (GET /sites/{uuid} should succeed)");
$verifyRestoreResponse = makeRequest('GET', "$baseUrl/sites/$siteUuid", null, $token);

if ($verifyRestoreResponse['code'] === 200) {
    printSuccess("Restore verified - site accessible again");
} else {
    printError("Site not accessible after restore (HTTP {$verifyRestoreResponse['code']})");
}

// Summary
echo "\n" . color("╔════════════════════════════════════════════╗", 'blue') . "\n";
echo color("║          Test Summary                      ║", 'blue') . "\n";
echo color("╚════════════════════════════════════════════╝", 'blue') . "\n";
echo color("All core site management endpoints tested!", 'green') . "\n";
echo color("Site UUID for manual testing: $siteUuid", 'yellow') . "\n\n";
