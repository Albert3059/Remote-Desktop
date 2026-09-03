export type StreamTransportState = 'idle' | 'connecting' | 'publishing' | 'reconnecting' | 'closed'

export type StreamTransportConfig = { sessionId: string; authorization: string; endpoint: string; expiresAt: string }

export interface StreamTransport {
  readonly state: StreamTransportState
  connect(config: StreamTransportConfig): Promise<void>
  publish(frame: { sequence: number; payload: Uint8Array; keyFrame: boolean }): Promise<void>
  reconnect(): Promise<void>
  close(): Promise<void>
}

export class MockStreamTransport implements StreamTransport {
  state: StreamTransportState = 'idle'
  private config?: StreamTransportConfig

  async connect(config: StreamTransportConfig) {
    if (new Date(config.expiresAt).getTime() <= Date.now()) throw new Error('Stream authorization expired')
    this.config = config
    this.state = 'connecting'
    await new Promise((resolve) => setTimeout(resolve, 10))
    this.state = 'publishing'
  }

  async publish(frame: { sequence: number; payload: Uint8Array; keyFrame: boolean }) {
    if (!this.config || this.state !== 'publishing') throw new Error('Stream transport is not publishing')
    if (new Date(this.config.expiresAt).getTime() <= Date.now()) { this.state = 'reconnecting'; throw new Error('Stream authorization expired') }
    void frame
  }

  async reconnect() { if (!this.config) throw new Error('Stream transport has not connected'); await this.connect(this.config) }
  async close() { this.state = 'closed'; this.config = undefined }
}
