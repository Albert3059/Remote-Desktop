// Applies scripts/schema.sql to the database in DATABASE_URL.
//
// Uses the `pg` driver the app already depends on, so no psql install is
// needed. Safe to re-run — every statement is IF NOT EXISTS and the whole
// file runs in one transaction.
//
//   node scripts/apply-schema.mjs
//   node scripts/apply-schema.mjs --check   (verify only, no writes)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const checkOnly = process.argv.includes('--check')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Run scripts\\set-secrets.ps1, then open a new terminal.'
  )
  process.exit(1)
}

const EXPECTED = [
  'user',
  'session',
  'account',
  'verification',
  'remote_devices',
  'remote_sessions',
]

// RDS presents an AWS-managed CA that is not in Node's default trust store.
// Verifying it properly needs the AWS global bundle; until that is wired up,
// encrypt in transit without asserting the chain.
const needsSsl = /\.rds\.amazonaws\.com/.test(connectionString)

const client = new pg.Client({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  connectionTimeoutMillis: 15_000,
})

async function listTables() {
  const { rows } = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  )
  return rows.map((r) => r.table_name)
}

try {
  await client.connect()

  const { rows: version } = await client.query('select version()')
  console.log(version[0].version.split(',')[0])

  if (!checkOnly) {
    const sql = readFileSync(join(here, 'schema.sql'), 'utf8')
    await client.query(sql)
    console.log('schema applied')
  }

  const tables = await listTables()
  const missing = EXPECTED.filter((t) => !tables.includes(t))

  console.log(`tables in public: ${tables.join(', ') || '(none)'}`)

  if (missing.length) {
    console.error(`MISSING: ${missing.join(', ')}`)
    process.exit(1)
  }
  console.log('all 6 expected tables present')
} catch (error) {
  console.error(`failed: ${error.message}`)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
