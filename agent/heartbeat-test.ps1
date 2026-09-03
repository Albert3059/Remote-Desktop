[CmdletBinding()]
param(
  [string]$ApiUrl,
  [string]$DeviceId,
  [string]$EnrollmentToken,
  [string]$ConfigPath = (Join-Path $env:ProgramData 'CloudDeskAgent\config.json'),
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = 'Stop'
if ((-not $ApiUrl) -or (-not $DeviceId) -or (-not $EnrollmentToken)) {
  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Missing agent config: $ConfigPath"
  }
  $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  if (-not $ApiUrl) { $ApiUrl = $config.CLOUDDESK_API_URL }
  if (-not $DeviceId) { $DeviceId = $config.CLOUDDESK_DEVICE_ID }
  if (-not $EnrollmentToken) { $EnrollmentToken = $config.CLOUDDESK_ENROLLMENT_TOKEN }
}
$ApiUrl = $ApiUrl.TrimEnd('/')
$payload = @{
  deviceId = $DeviceId
  agentVersion = '0.1.0-test'
  sentAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json

Write-Host 'CloudDesk heartbeat test running. Press Ctrl+C to stop.' -ForegroundColor Cyan
while ($true) {
  try {
    Invoke-RestMethod -Uri "$ApiUrl/api/agent/heartbeat" -Method Post `
      -Headers @{ Authorization = "Bearer $EnrollmentToken" } `
      -ContentType 'application/json' -Body $payload | Out-Null
    Write-Host "Heartbeat sent at $((Get-Date).ToString('s'))" -ForegroundColor Green
  }
  catch {
    Write-Warning "Heartbeat failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $IntervalSeconds
}
