'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { remoteDevices } from '@/lib/db/schema'
import { randomBytes, createHash } from 'node:crypto'
import { headers } from 'next/headers'

export async function createAgentInstall() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const now = new Date()
  const installToken = randomBytes(32).toString('hex')
  const device = await db.insert(remoteDevices).values({
    id: crypto.randomUUID(), userId: session.user.id, name: 'NEW WINDOWS AGENT', hostname: 'pending-install', os: 'Windows', status: 'pending_install',
    pairingCode: null, installTokenHash: createHash('sha256').update(installToken).digest('hex'), installTokenExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    agentVersion: 'pending', lastSeenAt: null, createdAt: now, updatedAt: now,
  }).returning()
  return { device: device[0], installToken }
}