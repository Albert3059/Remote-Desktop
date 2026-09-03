# CloudDesk Windows Agent

This package is the service-ready foundation for the CloudDesk Windows endpoint agent.

## Build

Run `pnpm check` from this directory or `pnpm exec tsc --noEmit -p agent/tsconfig.json` from the repository root.

The compiled entry point is intended to be wrapped as `clouddesk-agent.exe` using a Windows-compatible Node runtime packaging tool. The repository does not include a signed executable.

## Client install flow

1. Set `CLOUDDESK_AGENT_BINARY_URL` to the published, signed x64 `clouddesk-agent.exe` and set `CLOUDDESK_AGENT_SHA256` to its SHA-256 hash.
2. Sign in to the dashboard, create a pairing record, and select **Download installer**.
3. Copy the downloaded `clouddesk-agent-install.ps1` to the Windows client.
4. Open PowerShell as Administrator and run `Set-ExecutionPolicy -Scope Process Bypass`, then `./clouddesk-agent-install.ps1`.

The installer enrolls the computer, downloads and verifies the executable, protects the enrollment token under `%ProgramData%\\CloudDeskAgent`, installs the automatic Windows service, and starts it. It uses outbound HTTPS only.

For manual staging, `install.ps1` accepts `-AgentBinary` and `-ExpectedSha256`, then installs the service automatically when the executable is present.

The agent makes outbound HTTPS requests only. Enrollment tokens are never written to logs. Supply a trusted Authenticode certificate and verify the signature before production distribution.

## AWS Windows EC2 test

The web app must be reachable from the EC2 instance over HTTPS. `localhost:3000` on the developer PC is not reachable from EC2. Deploy the app first, then create a pairing record in the dashboard using a code such as `CD-AWS-001`.

Copy this folder to the EC2 instance and run PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\enroll.ps1 -ApiUrl 'https://YOUR-APP-DOMAIN' -PairingCode 'CD-AWS-001'
```

This calls the enrollment endpoint and stores the device credentials under `%ProgramData%\CloudDeskAgent` with administrator-only access. The repository currently contains a mock TypeScript heartbeat agent rather than a signed `clouddesk-agent.exe`; do not install it as a production Windows service until the native binary is built, configured for the deployed URL, and signed.

For a temporary heartbeat test, run this in a second elevated PowerShell window. The script reads the protected enrollment credentials automatically:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\heartbeat-test.ps1
```

The dashboard should show the device as `online` after the first successful heartbeat. The native project still needs to be built and signed on a Windows build runner before a production binary can be published; the repository does not ship an executable.
