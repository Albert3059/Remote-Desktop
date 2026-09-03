#include "AgentConfig.h"
#include <fstream>
#include <regex>
#include <stdexcept>
#include <windows.h>

namespace {
std::wstring ReadValue(const std::wstring& json, const wchar_t* key) {
  const std::wregex pattern(L"\\\"" + std::wstring(key) + L"\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
  std::wsmatch match;
  if (!std::regex_search(json, match, pattern)) throw std::runtime_error("Invalid CloudDesk agent config");
  return match[1].str();
}
}

namespace clouddesk {
AgentConfig AgentConfig::Load(const std::wstring& path) {
  std::wifstream file(path);
  if (!file) throw std::runtime_error("CloudDesk agent config was not found");
  const std::wstring json((std::istreambuf_iterator<wchar_t>(file)), std::istreambuf_iterator<wchar_t>());
  AgentConfig config;
  config.controlPlaneUrl = ReadValue(json, L"CLOUDDESK_API_URL");
  config.deviceId = ReadValue(json, L"CLOUDDESK_DEVICE_ID");
  config.enrollmentToken = ReadValue(json, L"CLOUDDESK_ENROLLMENT_TOKEN");
  return config;
}
}