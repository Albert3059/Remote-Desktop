param(
  [string]$BinaryPath = "$PSScriptRoot\\CloudDeskAgent.exe"
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $BinaryPath)) { throw "Signed agent binary not found: $BinaryPath" }

$signature = Get-AuthenticodeSignature -FilePath $BinaryPath
if ($signature.Status -ne 'Valid') { throw "Agent binary signature is not valid: $($signature.Status)" }

Write-Output "Signature valid for $BinaryPath"
Write-Output 'Register the service only after verifying the publisher certificate and clean-VM install behavior.'
