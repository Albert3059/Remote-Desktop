export type AgentStatus = 'installing' | 'pending_pairing' | 'online' | 'stale' | 'offline'

export type AgentIdentity = {
  deviceId: string
  hostname: string
  os: 'windows'
  agentVersion: string
}

export type EnrollmentRequest = {
  pairingCode: string
  identity: AgentIdentity
}

export type HeartbeatRequest = {
  deviceId: string
  agentVersion: string
  sentAt: string
}

export type AgentCapability = 'screen' | 'keyboard' | 'mouse'

export const agentCapabilities: AgentCapability[] = ['screen', 'keyboard', 'mouse']

export function isValidPairingCode(value: string) {
  return /^[A-Z0-9]{6}$/.test(value.trim().toUpperCase())
}
