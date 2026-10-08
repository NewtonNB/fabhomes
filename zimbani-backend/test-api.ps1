# Company API Test Script
Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "COMPANY API ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

$base = "http://localhost:8001/api/v1"

# Test 1: Login
Write-Host "Test 1: Login as Super Admin" -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType "application/json" -Body '{"login":"admin@zimbani.com","password":"password"}'
if ($login.success) {
    $token = $login.data.access_token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
    Write-Host "   User: $($login.data.user.name)" -ForegroundColor Gray
    Write-Host "   Role: $($login.data.user.role)`n" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Login failed`n" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/json"
}

# Test 2: Create Parent Company
Write-Host "Test 2: Create Parent Company" -ForegroundColor Yellow
try {
    $parent = Invoke-RestMethod -Uri "$base/companies" -Method Post -Headers $headers -ContentType "application/json" -Body @"
{
    "name": "FAB Homes Uganda Ltd",
    "email": "info@fabhomes.ug",
    "phone": "+256700000000",
    "address": "Plot 123, Kampala Road",
    "city": "Kampala",
    "country": "Uganda",
    "company_type": "real_estate",
    "status": "active",
    "tax_number": "TIN-123456789",
    "registration_number": "REG-FAB-2024"
}
"@
    if ($parent.success) {
        $parentId = $parent.data.uuid
        Write-Host "   ✓ Parent company created" -ForegroundColor Green
        Write-Host "   Name: $($parent.data.name)" -ForegroundColor Gray
        Write-Host "   UUID: $parentId`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: Create Subsidiary
Write-Host "Test 3: Create Subsidiary Company" -ForegroundColor Yellow
try {
    $sub = Invoke-RestMethod -Uri "$base/companies" -Method Post -Headers $headers -ContentType "application/json" -Body @"
{
    "name": "FAB Construction Ltd",
    "email": "construction@fabhomes.ug",
    "phone": "+256700000001",
    "address": "Plot 124, Kampala Road",
    "city": "Kampala",
    "country": "Uganda",
    "company_type": "construction",
    "status": "active",
    "parent_company_id": "$parentId"
}
"@
    if ($sub.success) {
        $subId = $sub.data.uuid
        Write-Host "   ✓ Subsidiary created" -ForegroundColor Green
        Write-Host "   Name: $($sub.data.name)" -ForegroundColor Gray
        Write-Host "   Parent: $($sub.data.parent_company.name)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 4: List All Companies
Write-Host "Test 4: List All Companies" -ForegroundColor Yellow
try {
    $list = Invoke-RestMethod -Uri "$base/companies" -Method Get -Headers $headers
    if ($list.success) {
        Write-Host "   ✓ Retrieved $($list.data.Count) companies" -ForegroundColor Green
        foreach ($c in $list.data) {
            Write-Host "   - $($c.name) [$($c.company_type)]" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 5: Get Single Company
Write-Host "Test 5: Get Single Company Details" -ForegroundColor Yellow
try {
    $details = Invoke-RestMethod -Uri "$base/companies/$parentId" -Method Get -Headers $headers
    if ($details.success) {
        Write-Host "   ✓ Company details retrieved" -ForegroundColor Green
        Write-Host "   Name: $($details.data.name)" -ForegroundColor Gray
        Write-Host "   Email: $($details.data.email)" -ForegroundColor Gray
        Write-Host "   Status: $($details.data.status)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 6: Update Company
Write-Host "Test 6: Update Company" -ForegroundColor Yellow
try {
    $update = Invoke-RestMethod -Uri "$base/companies/$parentId" -Method Put -Headers $headers -ContentType "application/json" -Body '{"name":"FAB Homes Uganda Limited","website":"https://fabhomes.ug"}'
    if ($update.success) {
        Write-Host "   ✓ Company updated" -ForegroundColor Green
        Write-Host "   New name: $($update.data.name)" -ForegroundColor Gray
        Write-Host "   Website: $($update.data.website)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 7: Get Subsidiaries
Write-Host "Test 7: Get Subsidiaries" -ForegroundColor Yellow
try {
    $subs = Invoke-RestMethod -Uri "$base/companies/$parentId/subsidiaries" -Method Get -Headers $headers
    if ($subs.success) {
        Write-Host "   ✓ Retrieved $($subs.data.Count) subsidiaries" -ForegroundColor Green
        foreach ($s in $subs.data) {
            Write-Host "   - $($s.name)" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 8: Get Statistics
Write-Host "Test 8: Get Company Statistics" -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$base/companies/statistics" -Method Get -Headers $headers
    if ($stats.success) {
        Write-Host "   ✓ Statistics retrieved" -ForegroundColor Green
        Write-Host "   Total: $($stats.data.total_companies)" -ForegroundColor Gray
        Write-Host "   Active: $($stats.data.active_companies)" -ForegroundColor Gray
        Write-Host "   Inactive: $($stats.data.inactive_companies)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 9: Soft Delete
Write-Host "Test 9: Soft Delete Subsidiary" -ForegroundColor Yellow
try {
    $delete = Invoke-RestMethod -Uri "$base/companies/$subId" -Method Delete -Headers $headers
    if ($delete.success) {
        Write-Host "   ✓ Company soft deleted" -ForegroundColor Green
        Write-Host "   Message: $($delete.message)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 10: Restore
Write-Host "Test 10: Restore Deleted Company" -ForegroundColor Yellow
try {
    $restore = Invoke-RestMethod -Uri "$base/companies/$subId/restore" -Method Post -Headers $headers
    if ($restore.success) {
        Write-Host "   ✓ Company restored" -ForegroundColor Green
        Write-Host "   Message: $($restore.message)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 11: Test Validation (Circular Reference)
Write-Host "Test 11: Test Circular Reference Prevention" -ForegroundColor Yellow
try {
    $circular = Invoke-RestMethod -Uri "$base/companies/$parentId" -Method Put -Headers $headers -ContentType "application/json" -Body "{`"parent_company_id`":`"$subId`"}"
    Write-Host "   ✗ Circular reference NOT prevented (bug!)`n" -ForegroundColor Red
} catch {
    $err = $_ | ConvertFrom-Json
    if ($err.errors.parent_company_id) {
        Write-Host "   ✓ Circular reference blocked (expected)" -ForegroundColor Green
        Write-Host "   Error: $($err.errors.parent_company_id -join ', ')`n" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Unexpected error: $($_.Exception.Message)`n" -ForegroundColor Red
    }
}

# Test 12: Test Filters
Write-Host "Test 12: Test Filtering (active companies)" -ForegroundColor Yellow
try {
    $filtered = Invoke-RestMethod -Uri "$base/companies?status=active" -Method Get -Headers $headers
    if ($filtered.success) {
        Write-Host "   ✓ Filter applied successfully" -ForegroundColor Green
        Write-Host "   Retrieved $($filtered.data.Count) active companies`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan
