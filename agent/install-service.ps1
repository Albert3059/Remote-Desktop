param(
  [Parameter(Mandatory=$false)][string]$InstallDir = (Join-Path $env:ProgramData 'CloudDeskAgent'),
  [Parameter(Mandatory=$false)][string]$ServiceName = 'CloudDeskAgent'
)

$ErrorActionPreference = 'Stop'
$serviceBinary = Join-Path $InstallDir 'clouddesk-agent.exe'
if (-not (Test-Path $serviceBinary)) { throw "Missing agent binary: $serviceBinary" }

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $ServiceName | Out-Null
}

New-Service -Name $ServiceName -BinaryPathName "`"$serviceBinary`"" -DisplayName 'CloudDesk Windows Agent' -Description 'Secure outbound CloudDesk remote support agent' -StartupType Automatic | Out-Null
Start-Service -Name $ServiceName
Write-Output "Installed and started $ServiceName"
Write-Output 'Signing: supply a trusted Authenticode certificate before distribution.'
