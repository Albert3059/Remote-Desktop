[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [Parameter(Mandatory = $true)][string]$PairingCode,
  [string]$AgentVersion = '0.1.0'
)

$ErrorActionPreference = 'Stop'
$ApiUrl = $ApiUrl.TrimEnd('/')
$PairingCode = $PairingCode.Trim().ToUpperInvariant()
if ($PairingCode -notmatch '^CD-[A-Z0-9]{3}-[A-Z0-9]{3}$') {
  throw 'Pairing code must look like CD-ABC-123.'
}

$deviceId = [guid]::NewGuid().ToString()
$hostname = $env:COMPUTERNAME
$body = @{
  pairingCode = $PairingCode
  identity = @{
    deviceId = $deviceId
    hostname = $hostname
    os = 'windows'
    agentVersion = $AgentVersion
  }
} | ConvertTo-Json -Depth 3

$result = Invoke-RestMethod -Uri "$ApiUrl/api/agent/enroll" -Method Post -ContentType 'application/json' -Body $body
if (-not $result.deviceId -or -not $result.enrollmentToken) {
  throw 'Enrollment did not return device credentials.'
}

& (Join-Path $PSScriptRoot 'install.ps1') `
  -ApiUrl $ApiUrl `
  -DeviceId $result.deviceId `
  -EnrollmentToken $result.enrollmentToken

Write-Host "Enrolled $hostname as device $($result.deviceId)." -ForegroundColor Green
Write-Host 'The staged config is protected under %ProgramData%\CloudDeskAgent.' -ForegroundColor DarkGray
Write-Host 'A runnable signed service binary is still required for automatic heartbeat service installation.' -ForegroundColor Yellow
