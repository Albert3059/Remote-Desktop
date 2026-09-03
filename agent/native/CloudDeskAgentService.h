#pragma once
#include "AgentConfig.h"

namespace clouddesk {
class CloudDeskAgentService {
public:
  explicit CloudDeskAgentService(AgentConfig config);
  int Run();
  void RequestStop();
private:
  AgentConfig config_;
  bool stopping_{false};
};
}
