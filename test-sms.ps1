Write-Host "=== SMS Registration Test ===" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:5000"
$phoneNumber = "+1234567890"

function Send-SmsTest {
    param(
        [string]$Message,
        [string]$Description
    )
    
    Write-Host "`n Sending: $Message" -ForegroundColor Blue
    Write-Host "   ($Description)" -ForegroundColor Yellow
    
    $body = @{
        phoneNumber = $phoneNumber
        message = $Message
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/sms/test" -Method POST -Body $body -ContentType "application/json"
        Write-Host "Response:" -ForegroundColor Green
        Write-Host $response.response
        Start-Sleep -Seconds 1
        return $response
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "Checking if server is running..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health"
    Write-Host "Server is running!" -ForegroundColor Green
}
catch {
    Write-Host "Server is not running! Start it with: cd server; npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting full registration flow..." -ForegroundColor Cyan
Write-Host "Using phone: $phoneNumber`n" -ForegroundColor Gray

Send-SmsTest -Message "START" -Description "Initiate registration"
Send-SmsTest -Message "Test User" -Description "Provide name"
Send-SmsTest -Message "1" -Description "Select first office"
Send-SmsTest -Message "1" -Description "Select first service"
Send-SmsTest -Message "YES" -Description "Confirm registration"

Write-Host "`nTesting Check Token" -ForegroundColor Cyan
Send-SmsTest -Message "2" -Description "Check active token"

Write-Host "`nTesting Other Commands" -ForegroundColor Cyan
Send-SmsTest -Message "HELP" -Description "Show help"
Send-SmsTest -Message "CANCEL" -Description "Cancel"

Write-Host "`nTest Complete!" -ForegroundColor Green
