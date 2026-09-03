#pragma once
#include <cstdint>
#include <vector>

namespace clouddesk {
struct CaptureFrame { std::vector<std::uint8_t> rgba; std::uint32_t width{}; std::uint32_t height{}; std::uint64_t timestampUs{}; };
class ScreenCaptureProvider {
public:
  virtual ~ScreenCaptureProvider() = default;
  virtual bool Start() = 0;
  virtual bool TryAcquire(CaptureFrame& frame) = 0;
  virtual void Stop() = 0;
};
}
