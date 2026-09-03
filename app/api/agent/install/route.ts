import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { remoteDevices } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const claim = typeof body?.installToken === 'string' ? body.installToken.trim() : ''
  const identity = body?.identity
  if (!claim || !identity?.hostname) return NextResponse.json({ error: 'Invalid installation request' }, { status: 400 })
  const now = new Date()
  const claimHash = createHash('sha256').update(claim).digest('hex')
  const existing = await db.select().from(remoteDevices).where(and(eq(remoteDevices.installTokenHash, claimHash), gt(remoteDevices.installTokenExpiresAt, now)))
  if (!existing[0]) return NextResponse.json({ error: 'Installation link expired or already used' }, { status: 401 })
  const enrollmentToken = randomBytes(32).toString('hex')
  const device = await db.update(remoteDevices).set({ name: identity.hostname.toUpperCase(), hostname: identity.hostname, os: identity.os ?? 'Windows', status: 'online', installTokenHash: null, installTokenExpiresAt: null, enrollmentTokenHash: createHash('sha256').update(enrollmentToken).digest('hex'), agentVersion: identity.agentVersion ?? '0.1.0', lastSeenAt: now, updatedAt: now }).where(eq(remoteDevices.id, existing[0].id)).returning()
  return NextResponse.json({ deviceId: device[0].id, enrollmentToken })
}