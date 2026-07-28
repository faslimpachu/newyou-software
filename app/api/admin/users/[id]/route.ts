import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, hashPassword } from '@/lib/session'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRole(request, ['superadmin'])
    const body = await request.json()
    const { name, username, password, role, phone, centerType, active } = body

    const existing = await prisma.user.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (phone !== undefined) updateData.phone = phone
    if (centerType !== undefined) updateData.centerType = centerType
    if (active !== undefined) updateData.active = active
    if (username !== undefined && username !== existing.username) {
      const dup = await prisma.user.findUnique({ where: { username } })
      if (dup) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
      }
      updateData.username = username
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ user })
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update user error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRole(request, ['superadmin'])
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Delete user error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
