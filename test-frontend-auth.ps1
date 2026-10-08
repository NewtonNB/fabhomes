# Comprehensive Frontend Authentication Testing Script

Write-Host "=== ZIMBANI FRONTEND AUTHENTICATION TESTING ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8001/api/v1"
$frontendUrl = "http://localhost:5173"

# Test credentials
$testEmail = "testuser_$(Get-Random)@example.com"
$testName = "Test User Frontend"
$testPassword = "password123"
$existingEmail = "admin@zimbani.com"
$existingPassword = "password"

Write-Host "=== Test 1: Register New User ===" -ForegroundColor Yellow
try {
    $registerBody = @{
        name = $testName
        email = $testEmail
        phone = "+256700000999"
        password = $testPassword
        password_confirmation = $testPassword
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/register" `
        -Method POST `
        -ContentType 'application/json' `
        -Body $registerBody

    Write-Host "✓ Registration successful" -ForegroundColor Green
    Write-Host "  User: $($response.data.user.name)" -ForegroundColor Gray
    Write-Host "  Email: $($response.data.user.email)" -ForegroundColor Gray
    Write-Host "  UUID: $($response.data.user.uuid)" -ForegroundColor Gray
    Write-Host "  Token: $($response.data.token.Substring(0,20))..." -ForegroundColor Gray
    
    $newUserToken = $response.data.token
} catch {
    Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== Test 2: Login with Existing User ===" -ForegroundColor Yellow
try {
    $loginBody = @{
        login = $existingEmail
        password = $existingPassword
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/login" `
        -Method POST `
        -ContentType 'application/json' `
        -Body $loginBody

    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User: $($response.data.user.name)" -ForegroundColor Gray
    Write-Host "  Roles: $($response.data.user.roles -join ', ')" -ForegroundColor Gray
    Write-Host "  Status: $($response.data.user.status)" -ForegroundColor Gray
    
    $adminToken = $response.data.token
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== Test 3: Get User Profile ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/user" `
        -Method GET `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            Accept = "application/json" 
        }

    Write-Host "✓ Profile retrieved successfully" -ForegroundColor Green
    Write-Host "  Name: $($response.data.user.name)" -ForegroundColor Gray
    Write-Host "  Email: $($response.data.user.email)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Profile retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== Test 4: Update Profile ===" -ForegroundColor Yellow
try {
    $updateBody = @{
        name = "Updated Test User"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/user/profile" `
        -Method PUT `
        -ContentType 'application/json' `
        -Headers @{ 
            Authorization = "Bearer $newUserToken"
            Accept = "application/json" 
        } `
        -Body $updateBody

    Write-Host "✓ Profile updated successfully" -ForegroundColor Green
    Write-Host "  New name: $($response.data.user.name)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Profile update failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 5: Protected Route (401 Handling) ===" -ForegroundColor Yellow
try {
    # Try to access protected route without token
    $response = Invoke-RestMethod -Uri "$baseUrl/user" `
        -Method GET `
        -Headers @{ Accept = "application/json" }
    
    Write-Host "✗ Should have received 401 error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ 401 Unauthorized returned correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 401, got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Test 6: Invalid Credentials ===" -ForegroundColor Yellow
try {
    $badLoginBody = @{
        login = "wrong@example.com"
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/login" `
        -Method POST `
        -ContentType 'application/json' `
        -Body $badLoginBody
    
    Write-Host "✗ Should have failed with invalid credentials" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ Invalid credentials rejected correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 401, got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Test 7: Logout ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/logout" `
        -Method POST `
        -Headers @{ 
            Authorization = "Bearer $newUserToken"
            Accept = "application/json" 
        }

    Write-Host "✓ Logout successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Logout failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 8: Access After Logout ===" -ForegroundColor Yellow
try {
    # Try to use the logged out token
    $response = Invoke-RestMethod -Uri "$baseUrl/user" `
        -Method GET `
        -Headers @{ 
            Authorization = "Bearer $newUserToken"
            Accept = "application/json" 
        }
    
    Write-Host "✗ Should have received 401 after logout" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ Token invalidated after logout" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 401, got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== MANUAL TESTING CHECKLIST ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please verify the following in the browser at $frontendUrl :" -ForegroundColor White
Write-Host ""
Write-Host "[ ] 1. Navigate to http://localhost:5173" -ForegroundColor White
Write-Host "[ ] 2. Should redirect to /login (not authenticated)" -ForegroundColor White
Write-Host "[ ] 3. Click 'Sign up' link, fill registration form" -ForegroundColor White
Write-Host "[ ] 4. After registration, should redirect to /dashboard" -ForegroundColor White
Write-Host "[ ] 5. Header shows user name and Logout button" -ForegroundColor White
Write-Host "[ ] 6. Navigate to /profile, view user information" -ForegroundColor White
Write-Host "[ ] 7. Click 'Edit Profile', update name, save changes" -ForegroundColor White
Write-Host "[ ] 8. Profile should show success message" -ForegroundColor White
Write-Host "[ ] 9. Click 'Logout' in header" -ForegroundColor White
Write-Host "[ ] 10. Should redirect to /login" -ForegroundColor White
Write-Host "[ ] 11. Login with: admin@zimbani.com / password" -ForegroundColor White
Write-Host "[ ] 12. Should see dashboard with Super Admin access" -ForegroundColor White
Write-Host "[ ] 13. Profile shows all roles and permissions" -ForegroundColor White
Write-Host "[ ] 14. Refresh page - should stay logged in" -ForegroundColor White
Write-Host "[ ] 15. Open DevTools, clear localStorage, refresh" -ForegroundColor White
Write-Host "[ ] 16. Should redirect to /login (token cleared)" -ForegroundColor White
Write-Host ""
Write-Host "=== ALL API TESTS COMPLETED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Test Credentials:" -ForegroundColor Cyan
Write-Host "  - Super Admin: admin@zimbani.com / password" -ForegroundColor Gray
Write-Host "  - New User: $testEmail / $testPassword" -ForegroundColor Gray
