<#
    Provisions the Postgres instance this app needs on AWS RDS, then stores the
    resulting connection string as a user environment variable (never a file in
    this OneDrive-synced folder, and never printed to the console).

    Prerequisites:
      1. AWS CLI v2 installed  (already done: aws --version)
      2. Credentials configured, either
           aws configure sso     -> then pass -Profile <name>
           aws configure         -> default profile, no -Profile needed
         The IAM principal needs rds:CreateDBInstance, rds:DescribeDBInstances,
         rds:DescribeDBEngineVersions, ec2:DescribeVpcs,
         ec2:DescribeSecurityGroups, ec2:CreateSecurityGroup,
         ec2:AuthorizeSecurityGroupIngress.
         SSO tokens expire — re-run `aws sso login --profile <name>` when they do.

    Usage:
        powershell -ExecutionPolicy Bypass -File scripts\provision-rds.ps1 -Region us-east-1 -AwsProfile clouddesk -WhatIfOnly
        powershell -ExecutionPolicy Bypass -File scripts\provision-rds.ps1 -Region us-east-1 -AwsProfile clouddesk

    THIS CREATES BILLABLE AWS RESOURCES. Run with -WhatIfOnly first to see the
    plan and the estimated cost without creating anything.

    Tear down with:
        aws rds delete-db-instance --db-instance-identifier clouddesk-pg `
            --skip-final-snapshot --delete-automated-backups --region us-east-1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $Region,

    # Named AWS profile to use. Required for IAM Identity Center (SSO) setups,
    # where credentials live under a profile rather than as default keys.
    # Not named -Profile: $Profile is a PowerShell automatic variable.
    [string] $AwsProfile,

    [string] $InstanceId    = 'clouddesk-pg',
    [string] $DbName        = 'clouddesk',
    [string] $MasterUser    = 'clouddesk_admin',
    [string] $InstanceClass = 'db.t4g.micro',
    [int]    $StorageGb     = 20,
    [int]    $BackupDays    = 7,

    # Print the plan and exit without creating anything.
    [switch] $WhatIfOnly,

    # Skip the interactive confirmation. Needed when running from an
    # automated / non-interactive shell, where Read-Host cannot prompt.
    [switch] $Yes
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'
if (-not (Test-Path $aws)) {
    $cmd = Get-Command aws -ErrorAction SilentlyContinue
    if (-not $cmd) { throw 'AWS CLI not found. Install it, then re-run.' }
    $aws = $cmd.Source
}

# Every `aws` call below inherits this, so the profile does not have to be
# threaded through each invocation.
if ($AwsProfile) {
    $env:AWS_PROFILE = $AwsProfile
    Write-Host "Using AWS profile '$AwsProfile'." -ForegroundColor DarkGray
}

function Invoke-Aws {
    param([string[]] $Arguments)

    $out = & $aws @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "aws $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
    if ([string]::IsNullOrWhiteSpace($out)) { return $null }
    return ($out | Out-String | ConvertFrom-Json)
}

# ---------------------------------------------------------------- identity ---

Write-Host ''
Write-Host 'Checking AWS credentials...' -ForegroundColor Cyan
try {
    $me = Invoke-Aws @('sts', 'get-caller-identity', '--output', 'json', '--region', $Region)
}
catch {
    # SSO access tokens are short-lived; an expired one looks like a plain
    # credential failure, so name the likely fix rather than the raw error.
    $hint = 'aws sso login'
    if ($AwsProfile) { $hint = "aws sso login --profile $AwsProfile" }
    Write-Host ''
    Write-Host 'Could not authenticate to AWS.' -ForegroundColor Red
    Write-Host "If you use IAM Identity Center, your token has probably expired. Run:" -ForegroundColor Yellow
    Write-Host "    $hint" -ForegroundColor White
    Write-Host 'Otherwise configure credentials with `aws configure sso` or `aws configure`.' -ForegroundColor Yellow
    Write-Host ''
    throw
}
Write-Host "  account $($me.Account)" -ForegroundColor DarkGray
Write-Host "  arn     $($me.Arn)" -ForegroundColor DarkGray

# --------------------------------------------------------------------- vpc ---

$vpcs = Invoke-Aws @(
    'ec2', 'describe-vpcs',
    '--filters', 'Name=isDefault,Values=true',
    '--output', 'json', '--region', $Region
)
if (-not $vpcs.Vpcs -or $vpcs.Vpcs.Count -eq 0) {
    throw "No default VPC in $Region. Create one (aws ec2 create-default-vpc --region $Region) or pass an existing subnet group."
}
$vpcId = $vpcs.Vpcs[0].VpcId
Write-Host "  vpc     $vpcId (default)" -ForegroundColor DarkGray

# ---------------------------------------------------------------- local ip ---

Write-Host ''
Write-Host 'Detecting this machine''s public IP...' -ForegroundColor Cyan
$myIp = (Invoke-RestMethod -Uri 'https://checkip.amazonaws.com' -TimeoutSec 20).Trim()
if ($myIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
    throw "Could not determine public IPv4 address (got '$myIp')."
}
$cidr = "$myIp/32"
Write-Host "  $cidr will be the ONLY address allowed to reach port 5432" -ForegroundColor DarkGray

# -------------------------------------------------------------------- plan ---

$sgName = "$InstanceId-sg"

Write-Host ''
Write-Host 'Plan' -ForegroundColor Yellow
Write-Host "  region           $Region"
Write-Host "  engine           postgres (latest 17.x in region)"
Write-Host "  instance id      $InstanceId"
Write-Host "  instance class   $InstanceClass"
Write-Host "  storage          $StorageGb GB gp3, encrypted"
Write-Host "  database         $DbName"
Write-Host "  master user      $MasterUser"
Write-Host "  password         generated, 32 chars, stored in DATABASE_URL only"
Write-Host "  public access    yes, restricted to $cidr"
Write-Host "  security group   $sgName (in $vpcId)"
Write-Host "  backups          $BackupDays days"
Write-Host "  multi-AZ         no"
Write-Host ''
Write-Host '  COST: db.t4g.micro + 20GB gp3 is free-tier eligible for 12 months on a' -ForegroundColor Yellow
Write-Host '  new account. Outside the free tier expect roughly USD 15-20/month, more' -ForegroundColor Yellow
Write-Host '  in af-south-1. You are responsible for these charges.' -ForegroundColor Yellow
Write-Host ''

if ($WhatIfOnly) {
    Write-Host 'WhatIfOnly set - nothing was created.' -ForegroundColor Cyan
    return
}

if ($Yes) {
    Write-Host 'Confirmation skipped (-Yes).' -ForegroundColor DarkGray
}
else {
    $confirm = Read-Host "Type 'create' to provision these resources"
    if ($confirm -ne 'create') {
        Write-Host 'Aborted. Nothing was created.' -ForegroundColor DarkGray
        return
    }
}

# ---------------------------------------------------------- security group ---

Write-Host ''
Write-Host "Security group $sgName..." -ForegroundColor Cyan

$existing = Invoke-Aws @(
    'ec2', 'describe-security-groups',
    '--filters', "Name=group-name,Values=$sgName", "Name=vpc-id,Values=$vpcId",
    '--output', 'json', '--region', $Region
)

if ($existing.SecurityGroups.Count -gt 0) {
    $sgId = $existing.SecurityGroups[0].GroupId
    Write-Host "  reusing $sgId" -ForegroundColor DarkGray
}
else {
    $created = Invoke-Aws @(
        'ec2', 'create-security-group',
        '--group-name', $sgName,
        '--description', "Postgres access for the CloudDesk app",
        '--vpc-id', $vpcId,
        '--output', 'json', '--region', $Region
    )
    $sgId = $created.GroupId
    Write-Host "  created $sgId" -ForegroundColor Green
}

# Idempotent: AWS rejects a duplicate rule, which is fine here.
try {
    Invoke-Aws @(
        'ec2', 'authorize-security-group-ingress',
        '--group-id', $sgId,
        '--protocol', 'tcp', '--port', '5432', '--cidr', $cidr,
        '--output', 'json', '--region', $Region
    ) | Out-Null
    Write-Host "  allowed 5432 from $cidr" -ForegroundColor Green
}
catch {
    if ($_.Exception.Message -match 'Duplicate|already exists') {
        Write-Host "  rule for $cidr already present" -ForegroundColor DarkGray
    }
    else { throw }
}

# ---------------------------------------------------------------- password ---

# Alphanumeric only: RDS rejects '/', '@', '"' and spaces in master passwords,
# and staying alphanumeric also avoids URL-encoding the connection string.
$alphabet = ([char[]]('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'))
$bytes    = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$password = -join (0..31 | ForEach-Object { $alphabet[$bytes[$_] % $alphabet.Length] })

# ------------------------------------------------------------ db instance ---

Write-Host ''
$already = $null
try {
    $already = Invoke-Aws @(
        'rds', 'describe-db-instances', '--db-instance-identifier', $InstanceId,
        '--output', 'json', '--region', $Region
    )
}
catch { $already = $null }

if ($already) {
    Write-Host "DB instance $InstanceId already exists - reusing it." -ForegroundColor Yellow
    Write-Host 'Its master password is not recoverable. If you do not have the' -ForegroundColor Yellow
    Write-Host 'connection string, reset it with:' -ForegroundColor Yellow
    Write-Host "    aws rds modify-db-instance --db-instance-identifier $InstanceId --master-user-password <new> --apply-immediately --region $Region" -ForegroundColor White
    $password = $null
}
else {
    # Pick the newest Postgres 17 version this region actually offers.
    $versions = Invoke-Aws @(
        'rds', 'describe-db-engine-versions',
        '--engine', 'postgres',
        '--query', 'DBEngineVersions[?starts_with(EngineVersion, `17.`)].EngineVersion',
        '--output', 'json', '--region', $Region
    )
    if (-not $versions -or $versions.Count -eq 0) {
        throw "No PostgreSQL 17.x engine version available in $Region."
    }
    $engineVersion = ($versions | Sort-Object { [version]$_ } -Descending)[0]

    Write-Host "Creating $InstanceId (postgres $engineVersion)..." -ForegroundColor Cyan
    Invoke-Aws @(
        'rds', 'create-db-instance',
        '--db-instance-identifier', $InstanceId,
        '--db-instance-class', $InstanceClass,
        '--engine', 'postgres',
        '--engine-version', $engineVersion,
        '--master-username', $MasterUser,
        '--master-user-password', $password,
        '--db-name', $DbName,
        '--allocated-storage', "$StorageGb",
        '--storage-type', 'gp3',
        '--storage-encrypted',
        '--vpc-security-group-ids', $sgId,
        '--publicly-accessible',
        '--backup-retention-period', "$BackupDays",
        '--no-multi-az',
        '--no-auto-minor-version-upgrade',
        '--copy-tags-to-snapshot',
        '--tags', 'Key=app,Value=clouddesk', 'Key=managed-by,Value=provision-rds.ps1',
        '--output', 'json', '--region', $Region
    ) | Out-Null
    Write-Host '  create requested' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Waiting for the instance to become available (usually 5-10 minutes)...' -ForegroundColor Cyan
& $aws rds wait db-instance-available --db-instance-identifier $InstanceId --region $Region
if ($LASTEXITCODE -ne 0) {
    throw "Instance did not reach 'available'. Check the RDS console in $Region."
}

$described = Invoke-Aws @(
    'rds', 'describe-db-instances', '--db-instance-identifier', $InstanceId,
    '--output', 'json', '--region', $Region
)
$endpoint = $described.DBInstances[0].Endpoint.Address
$port     = $described.DBInstances[0].Endpoint.Port

Write-Host "  available at $endpoint`:$port" -ForegroundColor Green

# ----------------------------------------------------------- store secret ---

if ($password) {
    $url = "postgresql://$MasterUser`:$password@$endpoint`:$port/$DbName`?sslmode=require"
    [Environment]::SetEnvironmentVariable('DATABASE_URL', $url, 'User')

    Write-Host ''
    Write-Host 'DATABASE_URL stored as a user environment variable.' -ForegroundColor Green
    Write-Host 'It was not written to any file and not printed above.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Next steps - in a NEW terminal so the variable is inherited:' -ForegroundColor Cyan
Write-Host '    node scripts\apply-schema.mjs' -ForegroundColor White
Write-Host '    npm run dev' -ForegroundColor White
Write-Host ''
