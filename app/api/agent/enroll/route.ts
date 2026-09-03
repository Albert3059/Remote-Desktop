import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { remoteDevices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.pairingCode === 'string' ? body.pairingCode.trim().toUpperCase() : ''
  const identity = body?.identity
  if (!/^CD-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code) || !identity?.hostname) return NextResponse.json({ error: 'Invalid enrollment request' }, { status: 400 })
  const now = new Date()
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const existing = await db.select().from(remoteDevices).where(eq(remoteDevices.pairingCode, code))
  if (!existing[0]) return NextResponse.json({ error: 'Pairing code unavailable' }, { status: 409 })
  const values = { id: existing[0].id, userId: existing[0].userId, name: identity.hostname.toUpperCase(), hostname: identity.hostname, os: identity.os ?? 'Windows', status: 'online', pairingCode: code, enrollmentTokenHash: tokenHash, agentVersion: identity.agentVersion ?? '0.1.0', lastSeenAt: now, createdAt: existing[0]?.createdAt ?? now, updatedAt: now }
  const device = await db.update(remoteDevices).set(values).where(eq(remoteDevices.id, existing[0].id)).returning()
  return NextResponse.json({ deviceId: device[0].id, enrollmentToken: token })
}
