import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { remoteDevices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const body = await request.json().catch(() => null)
  if (!token || typeof body?.deviceId !== 'string') return NextResponse.json({ error: 'Invalid heartbeat' }, { status: 400 })
  const hash = createHash('sha256').update(token).digest('hex')
  const now = new Date()
  const updated = await db.update(remoteDevices).set({ status: 'online', agentVersion: body.agentVersion ?? '0.1.0', lastSeenAt: now, updatedAt: now }).where(eq(remoteDevices.enrollmentTokenHash, hash)).returning()
  if (!updated[0] || updated[0].id !== body.deviceId) return NextResponse.json({ error: 'Invalid agent credentials' }, { status: 401 })
  return NextResponse.json({ ok: true, receivedAt: now.toISOString() })
}
