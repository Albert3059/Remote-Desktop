#include "CloudDeskAgentService.h"
#include "ScreenCaptureProvider.h"
#include <chrono>
#include <thread>
#include <utility>

namespace clouddesk {
CloudDeskAgentService::CloudDeskAgentService(AgentConfig config) : config_(std::move(config)) {}
int CloudDeskAgentService::Run() {
  // Production implementation must use Windows Graphics Capture or Desktop Duplication.
  while (!stopping_) std::this_thread::sleep_for(std::chrono::seconds(1));
  return 0;
}
void CloudDeskAgentService::RequestStop() { stopping_ = true; }
}
