# Windows build requirements

The native Windows project lives in `native/CloudDeskAgent.vcxproj` and must be compiled and validated on a Windows build runner. Run `build-windows.ps1` from a VS Developer PowerShell; it builds `release\\x64\\CloudDeskAgent.exe`, optionally signs it, and prints the SHA-256 required by the dashboard installer. The direct command is `msbuild native\\CloudDeskAgent.vcxproj /p:Configuration=Release /p:Platform=x64`. `main.cpp` registers the Windows service control handler and exits cleanly on stop/shutdown; it intentionally opens no inbound socket. The Linux preview only validates the TypeScript contracts and mock providers.

## Required release checks

1. Build the service on Windows with the Visual Studio C++ x64 workload using `build-windows.ps1`.
2. Add the native capture adapter using Windows Graphics Capture or Desktop Duplication.
3. Validate H.264/VP8 encoding, frame pacing, backpressure, and multi-monitor selection.
4. Sign the executable and installer with an Authenticode certificate.
5. Verify the signature and install/uninstall behavior on a clean Windows VM.
6. Never ship `MockCaptureProvider` or an unsigned binary as the production agent.

The service must keep enrollment tokens in the protected config path, use outbound-only connections, and redact authorization values from logs. Configure the dashboard only with a signed executable URL and matching SHA-256 value.
