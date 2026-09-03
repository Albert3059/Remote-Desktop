export type ScreenFrame = { width: number; height: number; capturedAt: string; data: Uint8Array }

export interface ScreenPublisher {
  start(onFrame: (frame: ScreenFrame) => void): Promise<void>
  stop(): Promise<void>
}

export class MockScreenPublisher implements ScreenPublisher {
  private timer?: ReturnType<typeof setInterval>
  async start(onFrame: (frame: ScreenFrame) => void) {
    this.timer = setInterval(() => onFrame({ width: 1920, height: 1080, capturedAt: new Date().toISOString(), data: new Uint8Array() }), 1000)
  }
  async stop() { if (this.timer) clearInterval(this.timer) }
}
