# Phase 2 Refactoring - Quick Test Script
# Run this script to perform basic smoke tests on all refactored endpoints

param(
    [Parameter(Mandatory = $true)]
    [string]$AuthToken,
    
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://localhost:3000",
    
    [Parameter(Mandatory = $false)]
    [string]$OrganizationId = ""
)

$headers = @{
    "Authorization" = "Bearer $AuthToken"
    "Content-Type"  = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Refactoring - Smoke Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $params = @{
            Uri         = "$BaseUrl$Url"
            Method      = $Method
            Headers     = $headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host " ✓ PASS" -ForegroundColor Green
        
        $script:testResults += @{
            Name       = $Name
            Status     = "PASS"
            StatusCode = 200
        }
        
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 401) {
            Write-Host " ⚠ UNAUTHORIZED (Check token)" -ForegroundColor Yellow
        }
        elseif ($statusCode -eq 403) {
            Write-Host " ⚠ FORBIDDEN (Check permissions)" -ForegroundColor Yellow
        }
        elseif ($statusCode -eq 404) {
            Write-Host " ⚠ NOT FOUND (May be expected if no data)" -ForegroundColor Yellow
        }
        else {
            Write-Host " ✗ FAIL ($statusCode)" -ForegroundColor Red
        }
        
        $script:testResults += @{
            Name       = $Name
            Status     = "FAIL"
            StatusCode = $statusCode
            Error      = $_.Exception.Message
        }
        
        return $null
    }
}

Write-Host "1. EVENTS SERVICE" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

Test-Endpoint -Name "Get Events" -Url "/api/events?organizationId=$OrganizationId"
Test-Endpoint -Name "Get Event Types" -Url "/api/events/types"

Write-Host ""
Write-Host "2. STUDY GROUPS SERVICE" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

Test-Endpoint -Name "Get User's Study Groups" -Url "/api/study-groups"
Test-Endpoint -Name "Get User Presence" -Url "/api/study-groups/presence"

Write-Host ""
Write-Host "3. CONVERSATIONS SERVICE" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

Test-Endpoint -Name "Get Direct Conversations" -Url "/api/conversations/direct"
Test-Endpoint -Name "Search Users" -Url "/api/conversations/search?query=test"

Write-Host ""
Write-Host "4. NOTIFICATIONS SERVICE" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

Test-Endpoint -Name "Get Notifications" -Url "/api/notifications"
Test-Endpoint -Name "Get Unread Count" -Url "/api/notifications/unread-count"
Test-Endpoint -Name "Get Blocked Users" -Url "/api/notifications/blocked"

Write-Host ""
Write-Host "5. SCHEDULE SERVICE" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$today = Get-Date -Format "yyyy-MM-dd"
$nextWeek = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

Test-Endpoint -Name "Get User Schedule" -Url "/api/schedule/me?startDate=$today&endDate=$nextWeek"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host ""
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Test creating resources (events, groups, messages)" -ForegroundColor White
    Write-Host "2. Test tenant isolation with different organizations" -ForegroundColor White
    Write-Host "3. Test the frontend integration" -ForegroundColor White
    Write-Host "4. Check server logs for any errors" -ForegroundColor White
}
else {
    Write-Host "⚠ Some tests failed. Check the details above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common Issues:" -ForegroundColor Cyan
    Write-Host "- 401: Invalid or expired auth token" -ForegroundColor White
    Write-Host "- 403: User doesn't have required permissions" -ForegroundColor White
    Write-Host "- 404: No data exists yet (may be expected)" -ForegroundColor White
    Write-Host "- 400: Missing organizationId in tenant context" -ForegroundColor White
}

Write-Host ""
Write-Host "For detailed testing, see: TESTING_PHASE2.md" -ForegroundColor Cyan
Write-Host ""

# Export results to JSON
$testResults | ConvertTo-Json | Out-File "test-results-phase2.json"
Write-Host "Results saved to: test-results-phase2.json" -ForegroundColor Gray
