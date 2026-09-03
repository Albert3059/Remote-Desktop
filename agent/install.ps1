param(
  [Parameter(Mandatory=$true)][string]$ApiUrl,
  [Parameter(Mandatory=$true)][string]$DeviceId,
  [Parameter(Mandatory=$true)][string]$EnrollmentToken,
  [Parameter(Mandatory=$false)][string]$AgentBinary,
  [Parameter(Mandatory=$false)][string]$ExpectedSha256
)

$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:ProgramData 'CloudDeskAgent'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

if ($AgentBinary) {
  $serviceBinary = Join-Path $installDir 'clouddesk-agent.exe'
  Invoke-WebRequest -Uri $AgentBinary -OutFile $serviceBinary -UseBasicParsing
  if ($ExpectedSha256) {
    $actualSha256 = (Get-FileHash -Path $serviceBinary -Algorithm SHA256).Hash
    if ($actualSha256 -ne $ExpectedSha256.ToUpperInvariant()) {
      Remove-Item $serviceBinary -Force
      throw 'Downloaded agent failed SHA-256 verification.'
    }
  }
}

$config = @{
  CLOUDDESK_API_URL = $ApiUrl
  CLOUDDESK_DEVICE_ID = $DeviceId
  CLOUDDESK_ENROLLMENT_TOKEN = $EnrollmentToken
} | ConvertTo-Json

$configPath = Join-Path $installDir 'config.json'
Set-Content -Path $configPath -Value $config -Encoding UTF8

# Restrict the enrollment token to local administrators and the service identity.
$acl = Get-Acl $configPath
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner([System.Security.Principal.NTAccount]'BUILTIN\\Administrators')
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule('BUILTIN\\Administrators','FullControl','Allow')
$acl.AddAccessRule($rule)
$serviceRule = New-Object System.Security.AccessControl.FileSystemAccessRule('SYSTEM','Read','Allow')
$acl.AddAccessRule($serviceRule)
Set-Acl -Path $configPath -AclObject $acl

Write-Output "CloudDesk agent files staged at $installDir"
if (Test-Path (Join-Path $installDir 'clouddesk-agent.exe')) {
  & (Join-Path $PSScriptRoot 'install-service.ps1') -InstallDir $installDir
} else {
  Write-Output 'Agent binary not supplied; configure AgentBinary or place a signed clouddesk-agent.exe before installing the service.'
}
