import type { AgentIdentity, HeartbeatRequest, EnrollmentRequest } from '../../lib/agent-contract.js'
import { log } from './logger.js'
import type { AgentConfig } from './config.js'

export class CloudDeskClient {
  constructor(private readonly config: AgentConfig) {}

  async enroll(pairingCode: string, identity: AgentIdentity) {
    const payload: EnrollmentRequest = { pairingCode, identity }
    return this.post('/api/agent/enroll', payload)
  }

  async heartbeat() {
    const payload: HeartbeatRequest = {
      deviceId: this.config.deviceId,
      agentVersion: '0.1.0',
      sentAt: new Date().toISOString(),
    }
    return this.post('/api/agent/heartbeat', payload)
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.enrollmentToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      log('warn', 'CloudDesk request rejected', { path, status: response.status })
      throw new Error(`CloudDesk request failed with ${response.status}`)
    }

    return response.json() as Promise<unknown>
  }
}
