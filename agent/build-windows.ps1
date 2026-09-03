[CmdletBinding()]
param(
  [ValidateSet('Release')][string]$Configuration = 'Release',
  [ValidateSet('x64')][string]$Platform = 'x64',
  [string]$CertificateThumbprint,
  [string]$TimestampServer = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'native\CloudDeskAgent.vcxproj'
$output = Join-Path $PSScriptRoot "release\$Platform"
New-Item -ItemType Directory -Force -Path $output | Out-Null

$msbuild = Get-Command msbuild.exe -ErrorAction SilentlyContinue
if (-not $msbuild) {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (Test-Path $vswhere) {
    $msbuildPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find MSBuild\**\Bin\MSBuild.exe | Select-Object -First 1
    if ($msbuildPath) { $msbuild = Get-Command $msbuildPath }
  }
}
if (-not $msbuild) { throw 'MSBuild with the C++ x64 workload was not found. Run this script from a Visual Studio Developer PowerShell.' }

& $msbuild.Source $project /m /t:Rebuild "/p:Configuration=$Configuration" "/p:Platform=$Platform" "/p:OutDir=$output\"
if ($LASTEXITCODE -ne 0) { throw "MSBuild failed with exit code $LASTEXITCODE." }

$binary = Join-Path $output 'CloudDeskAgent.exe'
if (-not (Test-Path $binary)) { throw "Build completed but did not produce $binary." }
if ($CertificateThumbprint) {
  $certificate = Get-ChildItem "Cert:\CurrentUser\My\$CertificateThumbprint" -ErrorAction Stop
  Set-AuthenticodeSignature -FilePath $binary -Certificate $certificate -TimestampServer $TimestampServer | Out-Null
  if ((Get-AuthenticodeSignature $binary).Status -ne 'Valid') { throw 'Authenticode signature validation failed.' }
} else {
  Write-Warning 'Binary is unsigned. Do not distribute it to client machines.'
}

$hash = (Get-FileHash -Path $binary -Algorithm SHA256).Hash
Write-Output "Binary: $binary"
Write-Output "SHA256: $hash"
Write-Output 'Configure CLOUDDESK_AGENT_BINARY_URL with the published HTTPS URL.'
Write-Output "Configure CLOUDDESK_AGENT_SHA256 with $hash"