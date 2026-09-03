import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { remoteSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { isSignal } from '@/lib/stream-contract'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [remote] = await db.select().from(remoteSessions).where(and(eq(remoteSessions.id, id), eq(remoteSessions.userId, session.user.id)))
  const body = await request.json().catch(() => null)
  if (!remote || remote.status === 'ended' || !isSignal({ ...body, sessionId: id })) return NextResponse.json({ error: 'Invalid signal' }, { status: 400 })
  return NextResponse.json({ accepted: true, type: body.type, sessionId: id })
}
