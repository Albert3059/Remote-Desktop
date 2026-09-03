# Publish the Windows agent

## Important limitation

The current native project is a Windows service foundation. It does not yet contain the production screen-capture, heartbeat, or streaming implementation. Do not distribute the generated executable to real client machines until those components are complete and tested.

The steps below are the release procedure for the signed executable once the native agent is production-ready.

## 1. Prepare a Windows build machine

Install:

1. Windows 10 or 11 x64.
2. Visual Studio 2022 with **Desktop development with C++**.
3. Windows 10/11 SDK.
4. Git and Node.js only if you also need to build the TypeScript agent.
5. An Authenticode code-signing certificate available in `Cert:\CurrentUser\My`.

Open **Developer PowerShell for Visual Studio**. This provides `msbuild.exe` and the native compiler.

## 2. Build and sign

```powershell
git clone YOUR_REPOSITORY_URL
cd Remote-Desktop\agent
.uild-windows.ps1 -CertificateThumbprint YOUR_CERT_THUMBPRINT
```

The script creates `agent\release\x64\CloudDeskAgent.exe`, signs it, validates the signature, and prints the SHA-256 hash.

Without a certificate, you may run:

```powershell
.\build-windows.ps1
```

That output is for development only. The script warns that the executable is unsigned.

## 3. Verify the release

```powershell
$binary = '.\release\x64\CloudDeskAgent.exe'
Get-AuthenticodeSignature $binary | Format-List Status,SignerCertificate
Get-FileHash $binary -Algorithm SHA256
```

The signature status must be `Valid`. Keep the printed 64-character SHA-256 value; it must match the value configured in the web app.

## 4. Publish the executable

Upload `CloudDeskAgent.exe` to an HTTPS-only, public download location. Suitable options include an object-storage bucket, a GitHub Release asset, or a release server behind a CDN.

The final URL must download the executable directly, without an HTML login page. Test it from a clean machine:

```powershell
Invoke-WebRequest -Uri 'https://downloads.example.com/CloudDeskAgent.exe' -OutFile "$env:TEMP\CloudDeskAgent.exe"
Get-FileHash "$env:TEMP\CloudDeskAgent.exe" -Algorithm SHA256
Get-AuthenticodeSignature "$env:TEMP\CloudDeskAgent.exe"
```

The downloaded hash must equal the build hash and the signature must remain `Valid`.

## 5. Configure the web app

From the repository root, set the release URL and hash outside the synced project folder:

```powershell
.\scripts\set-agent-release.ps1 `
  -BinaryUrl 'https://downloads.example.com/CloudDeskAgent.exe' `
  -Sha256 'PASTE_THE_64_CHARACTER_SHA256_HERE'
```

Open a new terminal, then restart the app:

```powershell
npm run dev
```

For production hosting, configure `CLOUDDESK_AGENT_BINARY_URL` and `CLOUDDESK_AGENT_SHA256` in the hosting provider's environment settings and redeploy. Do not commit these values to `.env.local` or source control.

## 6. Install on a client machine

1. Sign in to CloudDesk.
2. Create a pairing record.
3. Select **Download installer**.
4. Copy `clouddesk-agent-install.ps1` to the Windows client.
5. Open PowerShell as Administrator.
6. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\clouddesk-agent-install.ps1
```

The installer enrolls the computer, downloads the signed executable, verifies the SHA-256 value, stores credentials under `%ProgramData%\CloudDeskAgent`, installs the automatic service, and starts it.

## 7. Verify the client

```powershell
Get-Service CloudDeskAgent
Get-AuthenticodeSignature "$env:ProgramData\CloudDeskAgent\clouddesk-agent.exe"
Get-Content "$env:ProgramData\CloudDeskAgent\config.json"
```

The configuration file is protected for local administrators. Never send its contents in support messages because it contains the enrollment token.