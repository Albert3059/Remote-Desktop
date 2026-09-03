import { NextResponse } from 'next/server'
import { listRemoteDevices } from '@/app/actions/remote'

export async function GET() {
  try {
    return NextResponse.json(await listRemoteDevices())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
