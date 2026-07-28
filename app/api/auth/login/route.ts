import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSessionCookie, decryptSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user || !user.passwordHash || !user.active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const cookie = createSessionCookie(user)

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          phone: user.phone,
          centerType: user.centerType,
        },
      },
      {
        headers: {
          'Set-Cookie': cookie,
        },
      }
    )
  } catch (e) {
    console.error('Login error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
