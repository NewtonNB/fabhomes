# Test Company API Endpoints
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING COMPANY API ENDPOINTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8001/api/v1"

# 1. LOGIN AS SUPER ADMIN
Write-Host "1. Logging in as Super Admin..." -ForegroundColor Yellow
$loginResponse = curl.exe -s -X POST "$baseUrl/login" `
    -H "Accept: application/json" `
    -H "Content-Type: application/json" `
    -d '{\"email\":\"admin@zimbani.com\",\"password\":\"password\"}' | ConvertFrom-Json

if ($loginResponse.data.access_token) {
    $token = $loginResponse.data.access_token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 30))...`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Login failed" -ForegroundColor Red
    exit 1
}

# 2. CREATE PARENT COMPANY
Write-Host "2. Creating parent company (FAB Homes Uganda)..." -ForegroundColor Yellow
$createParentResponse = curl.exe -s -X POST "$baseUrl/companies" `
    -H "Accept: application/json" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d '{
        \"name\": \"FAB Homes Uganda Ltd\",
        \"email\": \"info@fabhomes.ug\",
        \"phone\": \"+256700000000\",
        \"address\": \"Plot 123, Kampala Road\",
        \"city\": \"Kampala\",
        \"country\": \"Uganda\",
        \"company_type\": \"real_estate\",
        \"status\": \"active\",
        \"tax_number\": \"TIN-123456789\",
        \"registration_number\": \"REG-FAB-2024\"
    }' | ConvertFrom-Json

if ($createParentResponse.data.uuid) {
    $parentUuid = $createParentResponse.data.uuid
    Write-Host "   ✓ Parent company created" -ForegroundColor Green
    Write-Host "   UUID: $parentUuid" -ForegroundColor Gray
    Write-Host "   Name: $($createParentResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Type: $($createParentResponse.data.company_type)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to create parent company" -ForegroundColor Red
    Write-Host "   Response: $($createParentResponse | ConvertTo-Json)`n" -ForegroundColor Red
}

# 3. CREATE SUBSIDIARY COMPANY
Write-Host "3. Creating subsidiary company (FAB Construction)..." -ForegroundColor Yellow
$createSubResponse = curl.exe -s -X POST "$baseUrl/companies" `
    -H "Accept: application/json" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d "{
        \`"name\`": \`"FAB Construction Ltd\`",
        \`"email\`": \`"construction@fabhomes.ug\`",
        \`"phone\`": \`"+256700000001\`",
        \`"address\`": \`"Plot 124, Kampala Road\`",
        \`"city\`": \`"Kampala\`",
        \`"country\`": \`"Uganda\`",
        \`"company_type\`": \`"construction\`",
        \`"status\`": \`"active\`",
        \`"parent_company_id\`": \`"$parentUuid\`"
    }" | ConvertFrom-Json

if ($createSubResponse.data.uuid) {
    $subUuid = $createSubResponse.data.uuid
    Write-Host "   ✓ Subsidiary company created" -ForegroundColor Green
    Write-Host "   UUID: $subUuid" -ForegroundColor Gray
    Write-Host "   Name: $($createSubResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Parent: $($createSubResponse.data.parent_company.name)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to create subsidiary" -ForegroundColor Red
    Write-Host "   Response: $($createSubResponse | ConvertTo-Json)`n" -ForegroundColor Red
}

# 4. GET ALL COMPANIES
Write-Host "4. Fetching all companies..." -ForegroundColor Yellow
$listResponse = curl.exe -s -X GET "$baseUrl/companies" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($listResponse.data) {
    Write-Host "   ✓ Retrieved $($listResponse.data.Count) companies" -ForegroundColor Green
    foreach ($company in $listResponse.data) {
        Write-Host "   - $($company.name) ($($company.company_type))" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "   ✗ Failed to retrieve companies`n" -ForegroundColor Red
}

# 5. GET SINGLE COMPANY
Write-Host "5. Fetching single company details..." -ForegroundColor Yellow
$showResponse = curl.exe -s -X GET "$baseUrl/companies/$parentUuid" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($showResponse.data.uuid) {
    Write-Host "   ✓ Company details retrieved" -ForegroundColor Green
    Write-Host "   Name: $($showResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Status: $($showResponse.data.status)" -ForegroundColor Gray
    Write-Host "   Created: $($showResponse.data.created_at)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to retrieve company details`n" -ForegroundColor Red
}

# 6. UPDATE COMPANY
Write-Host "6. Updating company details..." -ForegroundColor Yellow
$updateResponse = curl.exe -s -X PUT "$baseUrl/companies/$parentUuid" `
    -H "Accept: application/json" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d '{
        \"name\": \"FAB Homes Uganda Limited\",
        \"website\": \"https://fabhomes.ug\"
    }' | ConvertFrom-Json

if ($updateResponse.data.uuid) {
    Write-Host "   ✓ Company updated successfully" -ForegroundColor Green
    Write-Host "   New name: $($updateResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Website: $($updateResponse.data.website)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to update company`n" -ForegroundColor Red
}

# 7. GET SUBSIDIARIES
Write-Host "7. Fetching subsidiaries of parent company..." -ForegroundColor Yellow
$subsResponse = curl.exe -s -X GET "$baseUrl/companies/$parentUuid/subsidiaries" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($subsResponse.data) {
    Write-Host "   ✓ Retrieved $($subsResponse.data.Count) subsidiaries" -ForegroundColor Green
    foreach ($sub in $subsResponse.data) {
        Write-Host "   - $($sub.name)" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "   ✗ Failed to retrieve subsidiaries`n" -ForegroundColor Red
}

# 8. GET COMPANY STATISTICS
Write-Host "8. Fetching company statistics..." -ForegroundColor Yellow
$statsResponse = curl.exe -s -X GET "$baseUrl/companies/statistics" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($statsResponse.data) {
    Write-Host "   ✓ Statistics retrieved" -ForegroundColor Green
    Write-Host "   Total: $($statsResponse.data.total_companies)" -ForegroundColor Gray
    Write-Host "   Active: $($statsResponse.data.active_companies)" -ForegroundColor Gray
    Write-Host "   By Type:" -ForegroundColor Gray
    $statsResponse.data.by_type.PSObject.Properties | ForEach-Object {
        Write-Host "     - $($_.Name): $($_.Value)" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "   ✗ Failed to retrieve statistics`n" -ForegroundColor Red
}

# 9. SOFT DELETE SUBSIDIARY
Write-Host "9. Soft deleting subsidiary company..." -ForegroundColor Yellow
$deleteResponse = curl.exe -s -X DELETE "$baseUrl/companies/$subUuid" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($deleteResponse.message -like "*successfully*") {
    Write-Host "   ✓ Company soft deleted" -ForegroundColor Green
    Write-Host "   Message: $($deleteResponse.message)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to delete company" -ForegroundColor Red
    Write-Host "   Response: $($deleteResponse | ConvertTo-Json)`n" -ForegroundColor Red
}

# 10. RESTORE COMPANY
Write-Host "10. Restoring deleted company..." -ForegroundColor Yellow
$restoreResponse = curl.exe -s -X POST "$baseUrl/companies/$subUuid/restore" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($restoreResponse.message -like "*restored*") {
    Write-Host "   ✓ Company restored successfully" -ForegroundColor Green
    Write-Host "   Message: $($restoreResponse.message)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Failed to restore company`n" -ForegroundColor Red
}

# 11. TEST VALIDATION - Try to create circular reference
Write-Host "11. Testing circular reference prevention..." -ForegroundColor Yellow
$circularResponse = curl.exe -s -X PUT "$baseUrl/companies/$parentUuid" `
    -H "Accept: application/json" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d "{\"parent_company_id\": \"$subUuid\"}" | ConvertFrom-Json

if ($circularResponse.errors) {
    Write-Host "   ✓ Circular reference blocked (expected)" -ForegroundColor Green
    Write-Host "   Error: $($circularResponse.errors.parent_company_id -join ', ')`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Circular reference not prevented (unexpected)`n" -ForegroundColor Red
}

# 12. TEST FILTER - Get only active companies
Write-Host "12. Testing filters (active companies only)..." -ForegroundColor Yellow
$filterResponse = curl.exe -s -X GET "$baseUrl/companies?status=active" `
    -H "Accept: application/json" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($filterResponse.data) {
    Write-Host "   ✓ Retrieved $($filterResponse.data.Count) active companies" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "   ✗ Filter failed`n" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
