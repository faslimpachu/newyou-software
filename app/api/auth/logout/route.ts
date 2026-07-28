import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST() {
  try {
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': clearSessionCookie(),
        },
      }
    )
  } catch (e) {
    console.error('Logout error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
