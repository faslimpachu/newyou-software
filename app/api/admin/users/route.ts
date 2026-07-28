import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, hashPassword } from '@/lib/session'

export async function GET(request: Request) {
  try {
    await requireRole(request, ['superadmin'])
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        centerType: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('List users error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ['superadmin'])
    const body = await request.json()
    const { name, username, password, role, phone, centerType, active } = body

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role,
        phone,
        centerType,
        active: active ?? true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        centerType: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Create user error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
