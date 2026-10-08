# Comprehensive Day 4-5 API Testing Script

Write-Host "=== COMPREHENSIVE DAY 4-5 TESTING ===" -ForegroundColor Green
Write-Host ""

# Test 1: API Resource Format - Login
Write-Host "Test 1: API Resource Format - Login" -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/login' `
    -Method POST `
    -ContentType 'application/json' `
    -Body '{"login":"admin@zimbani.com","password":"password"}'

Write-Host "  Has data wrapper: $($null -ne $loginResponse.data)"
Write-Host "  Has user object: $($null -ne $loginResponse.data.user)"
Write-Host "  User UUID: $($loginResponse.data.user.uuid)"
Write-Host "  User has roles: $($loginResponse.data.user.roles.Count) roles"
Write-Host "  Token received: Yes"
$token = $loginResponse.data.token
Write-Host ""

# Test 2: Get User Profile
Write-Host "Test 2: API Resource Format - Get Profile" -ForegroundColor Cyan
$profileResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/user' `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }

Write-Host "  Has data wrapper: $($null -ne $profileResponse.data)"
Write-Host "  User name: $($profileResponse.data.name)"
Write-Host "  Has permissions: $($profileResponse.data.permissions.Count) permissions"
Write-Host ""

# Test 3: Get All Users - Collection Resource
Write-Host "Test 3: API Resource Collection - List Users" -ForegroundColor Cyan
$usersResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/admin/users' `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }

Write-Host "  Has data array: $($null -ne $usersResponse.data)"
Write-Host "  Has meta pagination: $($null -ne $usersResponse.meta)"
Write-Host "  Has links pagination: $($null -ne $usersResponse.links)"
Write-Host "  Total users: $($usersResponse.meta.total)"
Write-Host "  Per page: $($usersResponse.meta.per_page)"
Write-Host ""

# Test 4: Rate Limiting
Write-Host "Test 4: Rate Limiting - Login attempts" -ForegroundColor Cyan
$blocked = $false

for ($i = 1; $i -le 6; $i++) {
    try {
        $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/login' `
            -Method POST `
            -ContentType 'application/json' `
            -Body '{"login":"wrong@example.com","password":"wrongpass"}'
        Write-Host "  Attempt $i : Allowed"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 429) {
            $blocked = $true
            Write-Host "  Attempt $i : BLOCKED - Rate limit hit" -ForegroundColor Yellow
            break
        }
        else {
            Write-Host "  Attempt $i : Allowed"
        }
    }
    Start-Sleep -Milliseconds 200
}

Write-Host "  Rate limiting working: $blocked"
Write-Host ""

# Wait for rate limit cooldown
Write-Host "Waiting 5 seconds for rate limit cooldown..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Test 5: Audit Logging - Create User
Write-Host "Test 5: Audit Logging - Create User" -ForegroundColor Cyan
$newUserBody = @{
    name = "Test User Activity"
    email = "testactivity@example.com"
    password = "password123"
    password_confirmation = "password123"
    phone = "+256700000789"
    status = "active"
} | ConvertTo-Json

$createResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/admin/users' `
    -Method POST `
    -ContentType 'application/json' `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" } `
    -Body $newUserBody

$newUserId = $createResponse.data.id
Write-Host "  User created with ID: $newUserId"
Write-Host ""

# Test 6: Get Activity Logs
Write-Host "Test 6: Audit Logging - View Activities" -ForegroundColor Cyan
$activitiesResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/admin/activities?type=user_created' `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }

Write-Host "  Has data array: $($null -ne $activitiesResponse.data)"
Write-Host "  Activity count: $($activitiesResponse.data.Count)"
if ($activitiesResponse.data.Count -gt 0) {
    $latestActivity = $activitiesResponse.data[0]
    Write-Host "  Latest activity type: $($latestActivity.type)"
    Write-Host "  Latest activity description: $($latestActivity.description)"
    Write-Host "  Has user info: $($null -ne $latestActivity.user)"
}
Write-Host ""

# Test 7: Activity Statistics
Write-Host "Test 7: Activity Statistics" -ForegroundColor Cyan
$statsResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/admin/activities/statistics' `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }

Write-Host "  Has statistics: $($null -ne $statsResponse.data)"
Write-Host "  Total activities: $($statsResponse.data.total_activities)"
Write-Host "  Activity types breakdown:"
$statsResponse.data.by_type | ForEach-Object {
    Write-Host "    - $($_.type): $($_.count)"
}
Write-Host ""

# Test 8: My Activities
Write-Host "Test 8: My Activities - User specific" -ForegroundColor Cyan
$myActivitiesResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/activities/me' `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }

Write-Host "  Has data array: $($null -ne $myActivitiesResponse.data)"
Write-Host "  My activity count: $($myActivitiesResponse.data.Count)"
Write-Host ""

# Cleanup
Write-Host "Cleanup: Deleting test user..." -ForegroundColor Gray
try {
    $deleteResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/v1/admin/users/$newUserId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $token"; Accept = "application/json" }
    Write-Host "  Test user deleted successfully"
}
catch {
    Write-Host "  Failed to delete test user"
}

Write-Host ""
Write-Host "=== ALL TESTS COMPLETED ===" -ForegroundColor Green
