<#
    Stores this project's secrets as Windows *user* environment variables.

    Why not .env.local? This repo sits inside a OneDrive-synced folder, so a
    secret written to a file here gets uploaded to OneDrive and retained in its
    version history. User environment variables live in the registry
    (HKCU\Environment), which OneDrive does not sync.

    Values are read with -AsSecureString so they are never echoed to the
    console and never land in your PowerShell history.

    Usage:
        powershell -ExecutionPolicy Bypass -File scripts\set-secrets.ps1

    Then open a NEW terminal — setx only affects processes started afterwards.
#>

[CmdletBinding()]
param(
    # Set only these variables, e.g. -Only ANTHROPIC_API_KEY
    [string[]] $Only
)

$ErrorActionPreference = 'Stop'

$secrets = @(
    @{
        Name = 'ANTHROPIC_API_KEY'
        Help = 'Anthropic API key (console.anthropic.com/settings/keys), starts with sk-ant-'
    }
    @{
        Name = 'DATABASE_URL'
        Help = 'Postgres URL, e.g. postgresql://user:pass@host.rds.amazonaws.com:5432/clouddesk?sslmode=require'
    }
)

if ($Only) {
    $secrets = $secrets | Where-Object { $Only -contains $_.Name }
    if (-not $secrets) {
        throw "No known secret matches -Only $($Only -join ', ')"
    }
}

function Read-Secret {
    param([string] $Prompt)

    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

Write-Host ''
Write-Host 'Storing secrets as user environment variables.' -ForegroundColor Cyan
Write-Host 'Press Enter on any prompt to leave that variable unchanged.' -ForegroundColor DarkGray
Write-Host ''

$changed = @()

foreach ($secret in $secrets) {
    $name = $secret.Name
    $existing = [Environment]::GetEnvironmentVariable($name, 'User')
    $state = if ($existing) { 'currently set' } else { 'not set' }

    Write-Host "$name ($state)" -ForegroundColor Yellow
    Write-Host "  $($secret.Help)" -ForegroundColor DarkGray

    $value = Read-Secret -Prompt "  value"

    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host '  skipped' -ForegroundColor DarkGray
        Write-Host ''
        continue
    }

    # setx truncates at 1024 chars and mangles trailing backslashes; the .NET
    # API has neither limitation.
    [Environment]::SetEnvironmentVariable($name, $value.Trim(), 'User')
    $changed += $name
    Write-Host "  stored ($($value.Trim().Length) chars)" -ForegroundColor Green
    Write-Host ''
}

if (-not $changed) {
    Write-Host 'Nothing changed.' -ForegroundColor DarkGray
    return
}

Write-Host "Stored: $($changed -join ', ')" -ForegroundColor Green
Write-Host ''
Write-Host 'Open a NEW terminal, then restart the dev server:' -ForegroundColor Cyan
Write-Host '    npm run dev' -ForegroundColor White
Write-Host ''
Write-Host 'Verify without printing the value:' -ForegroundColor Cyan
foreach ($name in $changed) {
    Write-Host "    [bool]`$env:$name" -ForegroundColor White
}
Write-Host ''
