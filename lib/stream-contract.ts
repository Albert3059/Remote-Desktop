export type StreamState = 'connecting' | 'streaming' | 'reconnecting' | 'ended'

export type IceCandidate = { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }
export type StreamSignal = { type: 'offer' | 'answer' | 'ice'; sessionId: string; sdp?: string; candidate?: IceCandidate }
export type StreamAuthorization = { sessionId: string; deviceId: string; expiresAt: string; capabilities: ['screen'] }

export function isSignal(value: unknown): value is StreamSignal {
  if (!value || typeof value !== 'object') return false
  const signal = value as Partial<StreamSignal>
  return ['offer', 'answer', 'ice'].includes(signal.type ?? '') && typeof signal.sessionId === 'string'
}
