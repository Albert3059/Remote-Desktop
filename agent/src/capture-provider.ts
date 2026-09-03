export type CaptureCapability = { platform: 'windows'; method: 'graphics-capture' | 'desktop-duplication' | 'mock'; width: number; height: number; codec: 'h264' | 'vp8' | 'raw' }

export type CapturedFrame = { sequence: number; capturedAt: string; width: number; height: number; keyFrame: boolean; payload: Uint8Array }

export type CaptureOptions = { maxFps: number; maxInFlightFrames: number; signal?: AbortSignal }

export interface CaptureProvider {
  capabilities(): Promise<CaptureCapability[]>
  start(options: CaptureOptions, onFrame: (frame: CapturedFrame) => Promise<void> | void): Promise<void>
  stop(): Promise<void>
}

export class MockCaptureProvider implements CaptureProvider {
  private timer?: ReturnType<typeof setInterval>
  private sequence = 0
  private stopped = true

  async capabilities() { return [{ platform: 'windows' as const, method: 'mock' as const, width: 1920, height: 1080, codec: 'raw' as const }] }

  async start(options: CaptureOptions, onFrame: (frame: CapturedFrame) => Promise<void> | void) {
    await this.stop()
    this.stopped = false
    const interval = Math.max(1000 / Math.max(1, options.maxFps), 100)
    this.timer = setInterval(async () => {
      if (this.stopped || options.signal?.aborted) return
      const sequence = ++this.sequence
      await onFrame({ sequence, capturedAt: new Date().toISOString(), width: 1920, height: 1080, keyFrame: sequence % 30 === 1, payload: new Uint8Array() })
    }, interval)
  }

  async stop() {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }
}
