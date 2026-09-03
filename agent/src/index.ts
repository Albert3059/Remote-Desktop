import { runAgent } from './service.js'

runAgent().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Agent failed to start'}\n`)
  process.exitCode = 1
})
