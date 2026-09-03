[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$BinaryUrl,
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Fa-f0-9]{64}$')][string]$Sha256
)

$ErrorActionPreference = 'Stop'
[Environment]::SetEnvironmentVariable('CLOUDDESK_AGENT_BINARY_URL', $BinaryUrl.Trim(), 'User')
[Environment]::SetEnvironmentVariable('CLOUDDESK_AGENT_SHA256', $Sha256.Trim().ToUpperInvariant(), 'User')
Write-Host 'Stored CloudDesk agent release settings for new terminals.' -ForegroundColor Green
Write-Host "Binary URL: $BinaryUrl"
Write-Host "SHA-256: $($Sha256.ToUpperInvariant())"
Write-Host 'Restart the Next.js server after opening a new terminal.' -ForegroundColor Yellow