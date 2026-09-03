#pragma once
#include <string>

namespace clouddesk {
struct AgentConfig {
  std::wstring enrollmentToken;
  std::wstring controlPlaneUrl;
  std::wstring deviceId;
  static AgentConfig Load(const std::wstring& path);
};
}
