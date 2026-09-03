import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { remoteSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [remote] = await db.select().from(remoteSessions).where(and(eq(remoteSessions.id, id), eq(remoteSessions.userId, session.user.id)))
  if (!remote || remote.status === 'ended') return NextResponse.json({ error: 'Session unavailable' }, { status: 404 })
  const expiresAt = new Date(Date.now() + 60_000).toISOString()
  return NextResponse.json({ sessionId: id, deviceId: remote.deviceId, expiresAt, capabilities: ['screen'] })
}
