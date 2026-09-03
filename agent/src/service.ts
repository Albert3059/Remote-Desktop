import { CloudDeskClient } from './client.js'
import { MockCaptureProvider } from './capture-provider.js'
import { loadConfig } from './config.js'
import { log } from './logger.js'
import { MockStreamTransport } from './stream-transport.js'

export async function runAgent() {
  const config = loadConfig()
  const client = new CloudDeskClient(config)
  const capture = new MockCaptureProvider()
  const transport = new MockStreamTransport()
  let stopping = false

  const stop = () => {
    stopping = true
    void capture.stop()
    void transport.close()
    log('info', 'Windows agent stopping', { deviceId: config.deviceId })
  }

  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  log('info', 'Windows agent started', { deviceId: config.deviceId, heartbeatIntervalMs: config.heartbeatIntervalMs })
  const capabilities = await capture.capabilities()
  log('info', 'Capture capabilities detected', { deviceId: config.deviceId, methods: capabilities.map((item) => item.method) })

  while (!stopping) {
    try {
      await client.heartbeat()
      log('info', 'Heartbeat sent', { deviceId: config.deviceId })
    } catch (error) {
      log('warn', 'Heartbeat failed; will retry', { deviceId: config.deviceId, error: error instanceof Error ? error.message : 'unknown' })
    }
    await new Promise((resolve) => setTimeout(resolve, config.heartbeatIntervalMs))
  }
}
