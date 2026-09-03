export type AgentConfig = {
  apiBaseUrl: string
  deviceId: string
  enrollmentToken: string
  heartbeatIntervalMs: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const apiBaseUrl = env.CLOUDDESK_API_URL?.trim()
  const deviceId = env.CLOUDDESK_DEVICE_ID?.trim()
  const enrollmentToken = env.CLOUDDESK_ENROLLMENT_TOKEN?.trim()

  if (!apiBaseUrl || !deviceId || !enrollmentToken) {
    throw new Error('Missing CLOUDDESK_API_URL, CLOUDDESK_DEVICE_ID, or CLOUDDESK_ENROLLMENT_TOKEN')
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
    deviceId,
    enrollmentToken,
    heartbeatIntervalMs: Number(env.CLOUDDESK_HEARTBEAT_INTERVAL_MS ?? 30_000),
  }
}
