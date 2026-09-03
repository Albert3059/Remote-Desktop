export type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  process.stdout.write(`${JSON.stringify({ level, message, ...context, timestamp: new Date().toISOString() })}\n`)
}
