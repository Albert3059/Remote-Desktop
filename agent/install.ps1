param(
  [Parameter(Mandatory=$true)][string]$ApiUrl,
  [Parameter(Mandatory=$true)][string]$DeviceId,
  [Parameter(Mandatory=$true)][string]$EnrollmentToken
)

$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:ProgramData 'CloudDeskAgent'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

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
Set-Acl -Path $configPath -AclObject $acl

Write-Output "CloudDesk agent files staged at $installDir"
Write-Output 'Next step: place a signed CloudDeskAgent Windows service binary and run install-service.ps1 as Administrator.'
