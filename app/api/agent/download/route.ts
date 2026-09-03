import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { remoteDevices } from '@/lib/db/schema'
import { randomBytes, createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  const now = new Date()
  const installToken = randomBytes(32).toString('hex')
  await db.insert(remoteDevices).values({
    id: crypto.randomUUID(), userId: session.user.id, name: 'NEW WINDOWS AGENT', hostname: 'pending-install', os: 'Windows', status: 'pending_install',
    pairingCode: null, installTokenHash: createHash('sha256').update(installToken).digest('hex'), installTokenExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    agentVersion: 'pending', lastSeenAt: null, createdAt: now, updatedAt: now,
  })

  const apiUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin
  const binaryUrl = process.env.CLOUDDESK_AGENT_BINARY_URL ?? ''
  const sha256 = process.env.CLOUDDESK_AGENT_SHA256 ?? ''
  const script = `# CloudDesk Windows Agent installer
$ErrorActionPreference = 'Stop'
$apiUrl = '${apiUrl.replace(/'/g, "''")}'
$installToken = '${installToken}'
$agentBinary = '${binaryUrl.replace(/'/g, "''")}'
$expectedSha256 = '${sha256}'
if (-not $agentBinary) { throw 'This deployment has no signed agent binary configured.' }
$body = @{ installToken = $installToken; identity = @{ hostname = $env:COMPUTERNAME; os = 'windows'; agentVersion = '0.1.0' } } | ConvertTo-Json -Depth 3
$result = Invoke-RestMethod -Uri ($apiUrl.TrimEnd('/') + '/api/agent/install') -Method Post -ContentType 'application/json' -Body $body
$installDir = Join-Path $env:ProgramData 'CloudDeskAgent'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$serviceBinary = Join-Path $installDir 'clouddesk-agent.exe'
Invoke-WebRequest -Uri $agentBinary -OutFile $serviceBinary -UseBasicParsing
if ($expectedSha256) { if ((Get-FileHash $serviceBinary -Algorithm SHA256).Hash -ne $expectedSha256.ToUpperInvariant()) { Remove-Item $serviceBinary -Force; throw 'Agent hash verification failed.' } }
@{ CLOUDDESK_API_URL = $apiUrl; CLOUDDESK_DEVICE_ID = $result.deviceId; CLOUDDESK_ENROLLMENT_TOKEN = $result.enrollmentToken } | ConvertTo-Json | Set-Content (Join-Path $installDir 'config.json') -Encoding UTF8
$acl = Get-Acl (Join-Path $installDir 'config.json'); $acl.SetAccessRuleProtection($true, $false); $acl.SetOwner([System.Security.Principal.NTAccount]'BUILTIN\\Administrators'); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule('BUILTIN\\Administrators','FullControl','Allow'))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule('SYSTEM','Read','Allow'))); Set-Acl (Join-Path $installDir 'config.json') $acl
$serviceName = 'CloudDeskAgent'
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) { Stop-Service $serviceName -Force -ErrorAction SilentlyContinue; sc.exe delete $serviceName | Out-Null }
New-Service -Name $serviceName -BinaryPathName ('"' + $serviceBinary + '"') -DisplayName 'CloudDesk Windows Agent' -Description 'Secure outbound CloudDesk remote support agent' -StartupType Automatic | Out-Null
Start-Service $serviceName
Write-Host 'CloudDesk Agent installed and started.' -ForegroundColor Green
`
  return new NextResponse(script, { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'attachment; filename="clouddesk-agent-install.ps1"' } })
}
