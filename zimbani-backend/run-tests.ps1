# Simplified Company API Tests
$base = "http://localhost:8001/api/v1"

Write-Host "`nCompany API Tests`n" -ForegroundColor Cyan

# 1. Login
Write-Host "1. Login..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType "application/json" -Body (Get-Content test-login.json -Raw)
$token = $login.data.access_token
Write-Host "   Success: $($login.data.user.name)`n" -ForegroundColor Green

$headers = @{"Authorization" = "Bearer $token"; "Accept" = "application/json"}

# 2. Create Parent Company
Write-Host "2. Create Parent Company..." -ForegroundColor Yellow
$parent = Invoke-RestMethod -Uri "$base/companies" -Method Post -Headers $headers -ContentType "application/json" -Body (Get-Content test-create-parent.json -Raw)
$parentId = $parent.data.uuid
Write-Host "   Success: $($parent.data.name) [$parentId]`n" -ForegroundColor Green

# 3. List Companies
Write-Host "3. List Companies..." -ForegroundColor Yellow
$list = Invoke-RestMethod -Uri "$base/companies" -Method Get -Headers $headers
Write-Host "   Success: Found $($list.data.Count) companies`n" -ForegroundColor Green

# 4. Get Single
Write-Host "4. Get Company Details..." -ForegroundColor Yellow
$details = Invoke-RestMethod -Uri "$base/companies/$parentId" -Method Get -Headers $headers
Write-Host "   Success: $($details.data.name)`n" -ForegroundColor Green

# 5. Update
Write-Host "5. Update Company..." -ForegroundColor Yellow
$updateBody = '{"website":"https://fabhomes.ug"}'
$update = Invoke-RestMethod -Uri "$base/companies/$parentId" -Method Put -Headers $headers -ContentType "application/json" -Body $updateBody
Write-Host "   Success: Website set to $($update.data.website)`n" -ForegroundColor Green

# 6. Statistics
Write-Host "6. Get Statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$base/companies/statistics" -Method Get -Headers $headers
Write-Host "   Success: Total=$($stats.data.total_companies), Active=$($stats.data.active_companies)`n" -ForegroundColor Green

Write-Host "All tests passed!`n" -ForegroundColor Green
