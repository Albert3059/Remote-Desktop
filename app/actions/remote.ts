'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { remoteDevices, remoteSessions } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function listRemoteDevices() {
  const userId = await getUserId()
  return db.select().from(remoteDevices).where(eq(remoteDevices.userId, userId)).orderBy(desc(remoteDevices.updatedAt))
}

export async function pairRemoteDevice(pairingCode: string) {
  const userId = await getUserId()
  const normalized = pairingCode.trim().toUpperCase()
  if (!/^CD-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(normalized)) throw new Error('Invalid pairing code')
  const now = new Date()
  const device = await db.insert(remoteDevices).values({
    id: crypto.randomUUID(), userId, name: `PENDING-${normalized.slice(-3)}`, hostname: `pending-${normalized.slice(-3).toLowerCase()}`, os: 'Windows 11 Pro', status: 'pending_pairing', pairingCode: normalized, agentVersion: 'pending', lastSeenAt: null, createdAt: now, updatedAt: now,
  }).returning()
  revalidatePath('/')
  return device[0]
}

export async function startRemoteSession(deviceId: string) {
  const userId = await getUserId()
  const device = await db.select().from(remoteDevices).where(and(eq(remoteDevices.id, deviceId), eq(remoteDevices.userId, userId)))
  if (!device[0]) throw new Error('Device not found')
  const now = new Date()
  const session = await db.insert(remoteSessions).values({ id: crypto.randomUUID(), userId, deviceId, status: 'connecting', startedAt: now, createdAt: now }).returning()
  return session[0]
}

export async function endRemoteSession(sessionId: string) {
  const userId = await getUserId()
  const updated = await db.update(remoteSessions).set({ status: 'ended', endedAt: new Date() }).where(and(eq(remoteSessions.id, sessionId), eq(remoteSessions.userId, userId))).returning()
  if (!updated[0]) throw new Error('Session not found')
  revalidatePath('/')
  return updated[0]
}

export async function removeRemoteDevice(deviceId: string) {
  const userId = await getUserId()
  await db.delete(remoteDevices).where(and(eq(remoteDevices.id, deviceId), eq(remoteDevices.userId, userId)))
  revalidatePath('/')
}
