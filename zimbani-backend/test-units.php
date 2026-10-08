<?php

/**
 * Test script for Unit Management API endpoints
 * Run: php test-units.php
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
echo color("║   ZIMBANI Unit Management API Tests       ║", 'blue') . "\n";
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

// Step 2: Get existing site to use for unit creation
printTest("Get Sites");
$sitesResponse = makeRequest('GET', "$baseUrl/sites?per_page=1&with_project=1", null, $token);

if ($sitesResponse['code'] !== 200 || empty($sitesResponse['body']['data'])) {
    printWarning("No sites found. Creating a test site first...");
    
    // Get a project first
    $projectsResponse = makeRequest('GET', "$baseUrl/projects?per_page=1", null, $token);
    if ($projectsResponse['code'] !== 200 || empty($projectsResponse['body']['data'])) {
        printError("No projects found. Cannot proceed with tests.");
        exit(1);
    }
    
    $projectUuid = $projectsResponse['body']['data'][0]['id'];
    
    // Create a test site
    $siteData = [
        'name' => 'Test Site for Units',
        'code' => 'TEST-SITE-' . time(),
        'project_id' => $projectUuid,
        'site_type' => 'construction',
        'status' => 'active',
        'description' => 'Test site for unit management',
        'address' => 'Test Address',
        'city' => 'Kampala',
        'country' => 'Uganda',
    ];
    
    $createSiteResponse = makeRequest('POST', "$baseUrl/sites", $siteData, $token);
    if ($createSiteResponse['code'] !== 201) {
        printError("Failed to create test site");
        echo "Response: " . json_encode($createSiteResponse['body'], JSON_PRETTY_PRINT) . "\n";
        exit(1);
    }
    
    $siteUuid = $createSiteResponse['body']['data']['uuid'];
    $projectUuid = $createSiteResponse['body']['data']['project']['uuid'];
    printSuccess("Created test site: $siteUuid");
} else {
    $siteUuid = $sitesResponse['body']['data'][0]['uuid'];
    $projectUuid = $sitesResponse['body']['data'][0]['project']['uuid'];
    printSuccess("Using existing site: $siteUuid");
}

// Step 3: Create Unit
printTest("Create Unit (POST /units)");
$unitData = [
    'unit_number' => 'UNIT-A101-' . time(),
    'name' => 'Apartment A101',
    'site_id' => $siteUuid,
    'project_id' => $projectUuid,
    'unit_type' => 'apartment',
    'status' => 'under_construction',
    'description' => 'Modern 2-bedroom apartment with balcony',
    'floor_number' => 1,
    'block_number' => 'A',
    'area' => 120.50,
    'bedrooms' => 2,
    'bathrooms' => 2,
    'has_balcony' => true,
    'has_parking' => true,
    'parking_slots' => 1,
    'base_price' => 150000000, // 150M UGX
    'current_price' => 145000000, // 145M UGX (discounted)
    'discount' => 5000000,
    'currency' => 'UGX',
    'price_type' => 'fixed',
    'construction_start_date' => date('Y-m-d'),
    'expected_completion_date' => date('Y-m-d', strtotime('+4 months')),
    'completion_percentage' => 30,
    'location_description' => 'Prime location with city view',
    'facing_direction' => 'North',
    'view_description' => 'City skyline view',
    'features' => ['modern_kitchen', 'built_in_wardrobes', 'ceramic_tiles'],
    'amenities' => ['gym', 'swimming_pool', 'security'],
    'specifications' => [
        'floor' => 'ceramic',
        'walls' => 'painted',
        'windows' => 'aluminum',
    ],
    'maintenance_fee' => 200000,
    'maintenance_frequency' => 'monthly',
];

$createResponse = makeRequest('POST', "$baseUrl/units", $unitData, $token);

if ($createResponse['code'] === 201) {
    $unitUuid = $createResponse['body']['data']['id'];
    printSuccess("Unit created successfully: $unitUuid");
    echo "  Unit Number: {$createResponse['body']['data']['unit_number']}\n";
    echo "  Name: {$createResponse['body']['data']['name']}\n";
    echo "  Type: {$createResponse['body']['data']['unit_type']}\n";
    echo "  Status: {$createResponse['body']['data']['status']}\n";
    echo "  Bedrooms: {$createResponse['body']['data']['bedrooms']}\n";
    echo "  Area: {$createResponse['body']['data']['area']} sqm\n";
} else {
    printError("Failed to create unit (HTTP {$createResponse['code']})");
    echo "Response: " . json_encode($createResponse['body'], JSON_PRETTY_PRINT) . "\n";
    exit(1);
}

// Step 4: Get All Units
printTest("Get All Units (GET /units)");
$listResponse = makeRequest('GET', "$baseUrl/units?per_page=10", null, $token);

if ($listResponse['code'] === 200) {
    $unitCount = count($listResponse['body']['data']);
    printSuccess("Retrieved $unitCount units");
    echo "  Total: {$listResponse['body']['meta']['total']}\n";
    echo "  Current Page: {$listResponse['body']['meta']['current_page']}\n";
} else {
    printError("Failed to list units (HTTP {$listResponse['code']})");
}

// Step 5: Get Single Unit
printTest("Get Single Unit (GET /units/{uuid})");
$showResponse = makeRequest('GET', "$baseUrl/units/$unitUuid?with_site=1&with_project=1", null, $token);

if ($showResponse['code'] === 200) {
    printSuccess("Retrieved unit details");
    echo "  Name: {$showResponse['body']['data']['name']}\n";
    echo "  Type: {$showResponse['body']['data']['unit_type']}\n";
    echo "  Status: {$showResponse['body']['data']['status']}\n";
    echo "  Completion: {$showResponse['body']['data']['completion_percentage']}%\n";
    echo "  Available: " . ($showResponse['body']['data']['is_available'] ? 'Yes' : 'No') . "\n";
} else {
    printError("Failed to get unit (HTTP {$showResponse['code']})");
}

// Step 6: Update Unit
printTest("Update Unit (PUT /units/{uuid})");
$updateData = [
    'description' => 'Updated: Luxury 2-bedroom apartment with premium finishes',
    'completion_percentage' => 45,
];

$updateResponse = makeRequest('PUT', "$baseUrl/units/$unitUuid", $updateData, $token);

if ($updateResponse['code'] === 200) {
    printSuccess("Unit updated successfully");
    echo "  Description updated\n";
    echo "  Completion: {$updateResponse['body']['data']['completion_percentage']}%\n";
} else {
    printError("Failed to update unit (HTTP {$updateResponse['code']})");
    echo "Response: " . json_encode($updateResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 7: Filter Units by Type
printTest("Filter Units by Type (GET /units?unit_type=apartment)");
$filterResponse = makeRequest('GET', "$baseUrl/units?unit_type=apartment&per_page=5", null, $token);

if ($filterResponse['code'] === 200) {
    printSuccess("Filtered units successfully");
    echo "  Apartments: " . count($filterResponse['body']['data']) . "\n";
} else {
    printError("Failed to filter units (HTTP {$filterResponse['code']})");
}

// Step 8: Filter Units by Bedrooms
printTest("Filter Units by Bedrooms (GET /units?bedrooms=2)");
$bedroomsResponse = makeRequest('GET', "$baseUrl/units?bedrooms=2", null, $token);

if ($bedroomsResponse['code'] === 200) {
    printSuccess("Filter by bedrooms successful");
    echo "  2-Bedroom Units: " . count($bedroomsResponse['body']['data']) . "\n";
} else {
    printError("Failed to filter by bedrooms (HTTP {$bedroomsResponse['code']})");
}

// Step 9: Search Units
printTest("Search Units (GET /units?search=A101)");
$searchResponse = makeRequest('GET', "$baseUrl/units?search=A101", null, $token);

if ($searchResponse['code'] === 200) {
    printSuccess("Search completed successfully");
    echo "  Results: " . count($searchResponse['body']['data']) . "\n";
} else {
    printError("Failed to search units (HTTP {$searchResponse['code']})");
}

// Step 10: Update Construction Progress
printTest("Update Construction Progress (POST /units/{uuid}/progress)");
$progressData = [
    'completion_percentage' => 75,
    'progress_notes' => 'Completed interior finishing and electrical installations',
];

$progressResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/progress", $progressData, $token);

if ($progressResponse['code'] === 200) {
    printSuccess("Construction progress updated successfully");
    echo "  Completion: {$progressResponse['body']['data']['completion_percentage']}%\n";
} else {
    printError("Failed to update progress (HTTP {$progressResponse['code']})");
    echo "Response: " . json_encode($progressResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 11: Update Inspection
printTest("Update Unit Inspection (POST /units/{uuid}/inspection)");
$inspectionData = [
    'last_inspection_date' => date('Y-m-d'),
    'next_inspection_date' => date('Y-m-d', strtotime('+2 weeks')),
    'inspection_notes' => 'Quality inspection passed. Minor touch-ups required.',
    'is_defect_free' => false,
];

$inspectionResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/inspection", $inspectionData, $token);

if ($inspectionResponse['code'] === 200) {
    printSuccess("Inspection updated successfully");
    echo "  Last Inspection: {$inspectionResponse['body']['data']['last_inspection_date']}\n";
    echo "  Next Inspection: {$inspectionResponse['body']['data']['next_inspection_date']}\n";
    echo "  Defect Free: " . ($inspectionResponse['body']['data']['is_defect_free'] ? 'Yes' : 'No') . "\n";
} else {
    printError("Failed to update inspection (HTTP {$inspectionResponse['code']})");
    echo "Response: " . json_encode($inspectionResponse['body'], JSON_PRETTY_PRINT) . "\n";
}

// Step 12: Complete Construction (100%)
printTest("Complete Construction (POST /units/{uuid}/progress - 100%)");
$completeData = [
    'completion_percentage' => 100,
    'progress_notes' => 'Construction fully completed and ready for handover',
];

$completeResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/progress", $completeData, $token);

if ($completeResponse['code'] === 200) {
    printSuccess("Unit marked as completed");
    echo "  Completion: {$completeResponse['body']['data']['completion_percentage']}%\n";
    echo "  Status: {$completeResponse['body']['data']['status']}\n";
    echo "  Completed Date: {$completeResponse['body']['data']['actual_completion_date']}\n";
} else {
    printError("Failed to mark as completed (HTTP {$completeResponse['code']})");
}

// Step 13: Update to Available Status
printTest("Update Unit to Available (PUT /units/{uuid})");
$availableData = [
    'status' => 'available',
];

$availableResponse = makeRequest('PUT', "$baseUrl/units/$unitUuid", $availableData, $token);

if ($availableResponse['code'] === 200) {
    printSuccess("Unit marked as available");
    echo "  Status: {$availableResponse['body']['data']['status']}\n";
    echo "  Is Available: " . ($availableResponse['body']['data']['is_available'] ? 'Yes' : 'No') . "\n";
} else {
    printError("Failed to mark as available (HTTP {$availableResponse['code']})");
}

// Step 14: Get Client for Reservation
printTest("Get Client for Reservation");
$clientsResponse = makeRequest('GET', "$baseUrl/admin/users?per_page=1", null, $token);

$clientUuid = null;
if ($clientsResponse['code'] === 200 && !empty($clientsResponse['body']['data'])) {
    $clientUuid = $clientsResponse['body']['data'][0]['uuid'];
    printSuccess("Found client: $clientUuid");
} else {
    printWarning("No clients found. Skipping reservation and sale tests.");
}

// Step 15: Reserve Unit (if client available)
if ($clientUuid) {
    printTest("Reserve Unit (POST /units/{uuid}/reserve)");
    $reserveData = [
        'client_id' => $clientUuid,
        'reservation_notes' => 'Client interested in this unit. Preliminary agreement reached.',
    ];

    $reserveResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/reserve", $reserveData, $token);

    if ($reserveResponse['code'] === 200) {
        printSuccess("Unit reserved successfully");
        echo "  Status: {$reserveResponse['body']['data']['status']}\n";
        echo "  Reserved Date: {$reserveResponse['body']['data']['reserved_date']}\n";
        echo "  Is Reserved: " . ($reserveResponse['body']['data']['is_reserved'] ? 'Yes' : 'No') . "\n";
    } else {
        printError("Failed to reserve unit (HTTP {$reserveResponse['code']})");
        echo "Response: " . json_encode($reserveResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }

    // Step 16: Sell Unit
    printTest("Sell Unit (POST /units/{uuid}/sell)");
    $sellData = [
        'client_id' => $clientUuid,
        'sale_price' => 145000000,
        'amount_paid' => 50000000, // 50M initial payment
        'sale_notes' => 'Unit sold with payment plan. Balance to be paid in installments.',
    ];

    $sellResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/sell", $sellData, $token);

    if ($sellResponse['code'] === 200) {
        printSuccess("Unit sold successfully");
        echo "  Status: {$sellResponse['body']['data']['status']}\n";
        echo "  Sale Price: {$sellResponse['body']['data']['current_price']}\n";
        echo "  Amount Paid: {$sellResponse['body']['data']['amount_paid']}\n";
        echo "  Balance: {$sellResponse['body']['data']['balance']}\n";
        echo "  Sold Date: {$sellResponse['body']['data']['sold_date']}\n";
        echo "  Is Sold: " . ($sellResponse['body']['data']['is_sold'] ? 'Yes' : 'No') . "\n";
    } else {
        printError("Failed to sell unit (HTTP {$sellResponse['code']})");
        echo "Response: " . json_encode($sellResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }

    // Step 17: Update Payment
    printTest("Update Payment (POST /units/{uuid}/payment)");
    $paymentData = [
        'amount_paid' => 100000000, // Additional payment, total 100M
        'payment_notes' => 'Second installment received',
    ];

    $paymentResponse = makeRequest('POST', "$baseUrl/units/$unitUuid/payment", $paymentData, $token);

    if ($paymentResponse['code'] === 200) {
        printSuccess("Payment updated successfully");
        echo "  Amount Paid: {$paymentResponse['body']['data']['amount_paid']}\n";
        echo "  Balance: {$paymentResponse['body']['data']['balance']}\n";
        echo "  Payment Progress: {$paymentResponse['body']['data']['payment_progress']}%\n";
        echo "  Fully Paid: " . ($paymentResponse['body']['data']['is_fully_paid'] ? 'Yes' : 'No') . "\n";
    } else {
        printError("Failed to update payment (HTTP {$paymentResponse['code']})");
        echo "Response: " . json_encode($paymentResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }
}

// Step 18: Get Unit Statistics
printTest("Get Unit Statistics (GET /admin/units/statistics)");
$statsResponse = makeRequest('GET', "$baseUrl/admin/units/statistics", null, $token);

if ($statsResponse['code'] === 200) {
    printSuccess("Retrieved unit statistics");
    echo "  Total Units: {$statsResponse['body']['total_units']}\n";
    echo "  Available Units: {$statsResponse['body']['available_units']}\n";
    echo "  Reserved Units: {$statsResponse['body']['reserved_units']}\n";
    echo "  Sold Units: {$statsResponse['body']['sold_units']}\n";
    echo "  Completed Units: {$statsResponse['body']['completed_units']}\n";
    echo "  Average Price: " . number_format($statsResponse['body']['pricing']['average_price']) . "\n";
    echo "  Total Sales Value: " . number_format($statsResponse['body']['financial']['total_sales_value']) . "\n";
} else {
    printError("Failed to get statistics (HTTP {$statsResponse['code']})");
}

// Step 19: Filter Available Units
printTest("Filter Available Units (GET /units?available_only=1)");
$availableUnitsResponse = makeRequest('GET', "$baseUrl/units?available_only=1", null, $token);

if ($availableUnitsResponse['code'] === 200) {
    printSuccess("Filtered available units");
    echo "  Available Units: " . count($availableUnitsResponse['body']['data']) . "\n";
} else {
    printError("Failed to filter available units (HTTP {$availableUnitsResponse['code']})");
}

// Step 20: Filter by Price Range
printTest("Filter by Price Range (GET /units?min_price=100000000&max_price=200000000)");
$priceRangeResponse = makeRequest('GET', "$baseUrl/units?min_price=100000000&max_price=200000000", null, $token);

if ($priceRangeResponse['code'] === 200) {
    printSuccess("Filtered by price range");
    echo "  Units in Range: " . count($priceRangeResponse['body']['data']) . "\n";
} else {
    printError("Failed to filter by price range (HTTP {$priceRangeResponse['code']})");
}

// Step 21: Test Validation Error
printTest("Test Validation Error (invalid unit_type)");
$invalidData = [
    'unit_number' => 'INVALID-' . time(),
    'name' => 'Invalid Unit',
    'site_id' => $siteUuid,
    'project_id' => $projectUuid,
    'unit_type' => 'invalid_type', // Invalid
    'status' => 'available',
];

$validationResponse = makeRequest('POST', "$baseUrl/units", $invalidData, $token);

if ($validationResponse['code'] === 422) {
    printSuccess("Validation error handled correctly (HTTP 422)");
    echo "  Error: " . ($validationResponse['body']['message'] ?? 'Validation failed') . "\n";
} else {
    printWarning("Expected validation error (422), got {$validationResponse['code']}");
}

// Step 22: Create second unit for delete test
printTest("Create Second Unit for Delete Test");
$unit2Data = [
    'unit_number' => 'UNIT-B202-' . time(),
    'name' => 'Apartment B202',
    'site_id' => $siteUuid,
    'project_id' => $projectUuid,
    'unit_type' => 'apartment',
    'status' => 'planned',
    'bedrooms' => 3,
    'bathrooms' => 2,
    'area' => 150.00,
    'base_price' => 180000000,
    'current_price' => 180000000,
    'currency' => 'UGX',
];

$create2Response = makeRequest('POST', "$baseUrl/units", $unit2Data, $token);

if ($create2Response['code'] === 201) {
    $unit2Uuid = $create2Response['body']['data']['id'];
    printSuccess("Second unit created: $unit2Uuid");
} else {
    printError("Failed to create second unit");
    $unit2Uuid = null;
}

// Step 23: Soft Delete Unit (only if not sold)
if ($unit2Uuid) {
    printTest("Delete Unit (DELETE /units/{uuid})");
    $deleteResponse = makeRequest('DELETE', "$baseUrl/units/$unit2Uuid", null, $token);

    if ($deleteResponse['code'] === 200) {
        printSuccess("Unit soft deleted successfully");
    } else {
        printError("Failed to delete unit (HTTP {$deleteResponse['code']})");
        echo "Response: " . json_encode($deleteResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }

    // Step 24: Verify Soft Delete
    printTest("Verify Soft Delete (GET /units/{uuid} should fail)");
    $verifyDeleteResponse = makeRequest('GET', "$baseUrl/units/$unit2Uuid", null, $token);

    if ($verifyDeleteResponse['code'] === 404) {
        printSuccess("Soft delete verified - unit not accessible");
    } else {
        printWarning("Unit still accessible after deletion (HTTP {$verifyDeleteResponse['code']})");
    }

    // Step 25: Restore Unit
    printTest("Restore Unit (POST /units/{uuid}/restore)");
    $restoreResponse = makeRequest('POST', "$baseUrl/units/$unit2Uuid/restore", null, $token);

    if ($restoreResponse['code'] === 200) {
        printSuccess("Unit restored successfully");
    } else {
        printError("Failed to restore unit (HTTP {$restoreResponse['code']})");
        echo "Response: " . json_encode($restoreResponse['body'], JSON_PRETTY_PRINT) . "\n";
    }

    // Step 26: Verify Restore
    printTest("Verify Restore (GET /units/{uuid} should succeed)");
    $verifyRestoreResponse = makeRequest('GET', "$baseUrl/units/$unit2Uuid", null, $token);

    if ($verifyRestoreResponse['code'] === 200) {
        printSuccess("Restore verified - unit accessible again");
    } else {
        printError("Unit not accessible after restore (HTTP {$verifyRestoreResponse['code']})");
    }
}

// Step 27: Test Delete Prevention for Sold Unit
printTest("Test Delete Prevention for Sold Unit");
$deleteSoldResponse = makeRequest('DELETE', "$baseUrl/units/$unitUuid", null, $token);

if ($deleteSoldResponse['code'] === 422) {
    printSuccess("Delete prevention working - cannot delete sold unit");
    echo "  Message: {$deleteSoldResponse['body']['message']}\n";
} else {
    printWarning("Expected prevention (422), got {$deleteSoldResponse['code']}");
}

// Summary
echo "\n" . color("╔════════════════════════════════════════════╗", 'blue') . "\n";
echo color("║          Test Summary                      ║", 'blue') . "\n";
echo color("╚════════════════════════════════════════════╝", 'blue') . "\n";
echo color("All unit management endpoints tested!", 'green') . "\n";
echo color("Unit UUID for manual testing: $unitUuid", 'yellow') . "\n";
if ($unit2Uuid) {
    echo color("Second Unit UUID: $unit2Uuid", 'yellow') . "\n";
}
echo "\n";
