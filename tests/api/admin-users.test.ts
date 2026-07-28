import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/admin/users/route'
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route'
import { prisma } from '@/lib/prisma'
import { hashPassword, encryptSession } from '@/lib/session'

function makeCookie(data: Record<string, unknown>): string {
  const token = encryptSession(data as unknown as import('@/lib/session').SessionData)
  return `session=${token}; HttpOnly; Path=/`
}

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Admin Users API', () => {
  it('GET returns users for superadmin', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'superadmin',
      expiresAt: Date.now() + 86400000,
    })
    const req = new Request('http://localhost/api/admin/users', {
      method: 'GET',
      headers: { Cookie: cookie },
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.users).toHaveLength(1)
    expect(data.users[0].role).toBe('superadmin')
  })

  it('GET returns 403 for non-superadmin', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        name: 'Admin User',
        passwordHash,
        role: 'admin',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'admin',
      expiresAt: Date.now() + 86400000,
    })

    const req = new Request('http://localhost/api/admin/users', {
      method: 'GET',
      headers: { Cookie: cookie },
    })

    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('POST creates a new user', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'superadmin',
      expiresAt: Date.now() + 86400000,
    })
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New User',
        username: 'newuser',
        password: 'newpass123',
        role: 'receptionist',
        phone: '9999999999',
        centerType: 'both',
        active: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.user.username).toBe('newuser')
    expect(data.user.role).toBe('receptionist')
    expect(data.user.passwordHash).toBeUndefined()
  })

  it('POST rejects duplicate username', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        active: true,
      },
    })
    await prisma.user.create({
      data: {
        username: 'existing',
        name: 'Existing',
        passwordHash: await hashPassword('pass'),
        role: 'receptionist',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'superadmin',
      expiresAt: Date.now() + 86400000,
    })
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Dup',
        username: 'existing',
        password: 'newpass123',
        role: 'receptionist',
        phone: '',
        centerType: 'both',
        active: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('PATCH updates a user', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'superadmin',
      expiresAt: Date.now() + 86400000,
    })
    const req = new Request(`http://localhost/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name', phone: '8888888888' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: user.id }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.name).toBe('Updated Name')
    expect(data.user.phone).toBe('8888888888')
  })

  it('DELETE deactivates a user', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        active: true,
      },
    })

    const cookie = makeCookie({
      userId: user.id,
      role: 'superadmin',
      expiresAt: Date.now() + 86400000,
    })
    const req = new Request(`http://localhost/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: user.id }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated?.active).toBe(false)
  })
})
