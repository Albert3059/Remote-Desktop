#include "CloudDeskAgentService.h"
#include "ScreenCaptureProvider.h"
#include <chrono>
#include <thread>
#include <utility>
#include <windows.h>
#include <winhttp.h>

#pragma comment(lib, "winhttp.lib")

namespace {
bool SendHeartbeat(const clouddesk::AgentConfig& config) {
  URL_COMPONENTS url{sizeof(url)};
  wchar_t host[256]{};
  wchar_t path[1024]{};
  url.lpszHostName = host;
  url.dwHostNameLength = ARRAYSIZE(host);
  url.lpszUrlPath = path;
  url.dwUrlPathLength = ARRAYSIZE(path);
  const std::wstring endpoint = config.controlPlaneUrl + L"/api/agent/heartbeat";
  if (!WinHttpCrackUrl(endpoint.c_str(), 0, 0, &url)) return false;
  HINTERNET session = WinHttpOpen(L"CloudDeskAgent/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
  if (!session) return false;
  HINTERNET connection = WinHttpConnect(session, host, url.nPort, 0);
  HINTERNET request = connection ? WinHttpOpenRequest(connection, L"POST", path, nullptr, nullptr, nullptr, WINHTTP_FLAG_SECURE) : nullptr;
  const std::wstring headers = L"Content-Type: application/json\r\nAuthorization: Bearer " + config.enrollmentToken;
  const std::string body = "{\"deviceId\":\"" + std::string(config.deviceId.begin(), config.deviceId.end()) + "\",\"agentVersion\":\"1.0.0\"}";
  const bool sent = request && WinHttpSendRequest(request, headers.c_str(), static_cast<DWORD>(headers.size()), const_cast<char*>(body.data()), static_cast<DWORD>(body.size()), static_cast<DWORD>(body.size()), 0) && WinHttpReceiveResponse(request, nullptr);
  DWORD status = 0;
  DWORD statusSize = sizeof(status);
  if (sent) WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, nullptr, &status, &statusSize, nullptr);
  if (request) WinHttpCloseHandle(request);
  if (connection) WinHttpCloseHandle(connection);
  WinHttpCloseHandle(session);
  return sent && status >= 200 && status < 300;
}
}

namespace clouddesk {
CloudDeskAgentService::CloudDeskAgentService(AgentConfig config) : config_(std::move(config)) {}
int CloudDeskAgentService::Run() {
  while (!stopping_) {
    SendHeartbeat(config_);
    for (int second = 0; second < 30 && !stopping_; ++second) std::this_thread::sleep_for(std::chrono::seconds(1));
  }
  return 0;
}
void CloudDeskAgentService::RequestStop() { stopping_ = true; }
}
