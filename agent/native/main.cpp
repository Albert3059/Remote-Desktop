#include "CloudDeskAgentService.h"
#include <windows.h>
#include <string>
#include <utility>

namespace {
constexpr wchar_t kServiceName[] = L"CloudDeskAgent";
clouddesk::CloudDeskAgentService* g_service = nullptr;
SERVICE_STATUS_HANDLE g_statusHandle = nullptr;

void SetStatus(DWORD state, DWORD win32ExitCode = NO_ERROR, DWORD waitHint = 0) {
  SERVICE_STATUS status{SERVICE_WIN32_OWN_PROCESS, state, 0, win32ExitCode, 0, waitHint, 0};
  if (state == SERVICE_START_PENDING) status.dwControlsAccepted = 0;
  else status.dwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN;
  if (g_statusHandle) SetServiceStatus(g_statusHandle, &status);
}

void WINAPI ControlHandler(DWORD control) {
  if (control == SERVICE_CONTROL_STOP || control == SERVICE_CONTROL_SHUTDOWN) {
    SetStatus(SERVICE_STOP_PENDING, NO_ERROR, 3000);
    if (g_service) g_service->RequestStop();
  }
}

void WINAPI ServiceMain(DWORD, LPWSTR*) {
  g_statusHandle = RegisterServiceCtrlHandlerW(kServiceName, ControlHandler);
  if (!g_statusHandle) return;
  SetStatus(SERVICE_START_PENDING, NO_ERROR, 3000);

  // Configuration is loaded by the installer/runtime in the signed service package.
  clouddesk::AgentConfig config;
  config.controlPlaneUrl = L"https://api.clouddesk.example";
  clouddesk::CloudDeskAgentService service(std::move(config));
  g_service = &service;
  SetStatus(SERVICE_RUNNING);
  const int result = service.Run();
  g_service = nullptr;
  SetStatus(SERVICE_STOPPED, result == 0 ? NO_ERROR : ERROR_SERVICE_SPECIFIC_ERROR);
}
}

int wmain() {
  SERVICE_TABLE_ENTRYW dispatchTable[] = {
    {const_cast<LPWSTR>(kServiceName), ServiceMain},
    {nullptr, nullptr},
  };
  if (!StartServiceCtrlDispatcherW(dispatchTable)) return static_cast<int>(GetLastError());
  return 0;
}
