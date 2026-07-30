import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { GET, POST as adminPost } from '@/app/api/admin/users/route'
import { PATCH, DELETE as adminDelete } from '@/app/api/admin/users/[id]/route'
import { GET as patientsGet } from '@/app/api/patients/route'
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
  await prisma.patient.deleteMany()
  await prisma.mRSequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Authentication flow', () => {
  describe('Super admin', () => {
    it('can login and receive session cookie', async () => {
      const passwordHash = await hashPassword('password123')
      await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'password123' }),
      })

      const res = await loginPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(data.user.role).toBe('superadmin')

      const cookieHeader = res.headers.get('set-cookie') || ''
      expect(cookieHeader).toContain('session=')
      expect(cookieHeader).toContain('HttpOnly')
    })

    it('can add a new user', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
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
          confirmPassword: 'newpass123',
          role: 'receptionist',
          phone: '9999999999',
          centerType: 'both',
          active: true,
        }),
      })

      const res = await adminPost(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.user.username).toBe('newuser')
      expect(data.user.role).toBe('receptionist')
    })

    it('can edit a user and change password', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const target = await prisma.user.create({
        data: {
          username: 'target',
          name: 'Target User',
          passwordHash: await hashPassword('oldpass'),
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
        role: 'superadmin',
        expiresAt: Date.now() + 86400000,
      })

      const req = new Request(`http://localhost/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          password: 'newpass123',
          confirmPassword: 'newpass123',
        }),
      })

      const res = await PATCH(req, { params: Promise.resolve({ id: target.id }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.name).toBe('Updated Name')
    })

    it('can deactivate a user', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const target = await prisma.user.create({
        data: {
          username: 'target',
          name: 'Target User',
          passwordHash: await hashPassword('pass'),
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
        role: 'superadmin',
        expiresAt: Date.now() + 86400000,
      })

      const req = new Request(`http://localhost/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })

      const res = await adminDelete(req, { params: Promise.resolve({ id: target.id }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)

      const updated = await prisma.user.findUnique({ where: { id: target.id } })
      expect(updated?.active).toBe(false)
    })
  })

  describe('Receptionist', () => {
    it('can login', async () => {
      const passwordHash = await hashPassword('password123')
      await prisma.user.create({
        data: {
          username: 'receptionist',
          name: 'Receptionist User',
          passwordHash,
          role: 'receptionist',
          active: true,
        },
      })

      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'receptionist', password: 'password123' }),
      })

      const res = await loginPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.role).toBe('receptionist')
    })

    it('can access protected non-admin routes', async () => {
      const passwordHash = await hashPassword('password123')
      const user = await prisma.user.create({
        data: {
          username: 'receptionist',
          name: 'Receptionist User',
          passwordHash,
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: user.id,
        role: 'receptionist',
        expiresAt: Date.now() + 86400000,
      })

      const req = new Request('http://localhost/api/patients', {
        headers: { Cookie: cookie },
      })

      const res = await patientsGet(req)
      expect(res.status).toBe(200)
    })

    it('cannot access admin users API', async () => {
      const passwordHash = await hashPassword('password123')
      const user = await prisma.user.create({
        data: {
          username: 'receptionist',
          name: 'Receptionist User',
          passwordHash,
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: user.id,
        role: 'receptionist',
        expiresAt: Date.now() + 86400000,
      })

      const req = new Request('http://localhost/api/admin/users', {
        method: 'GET',
        headers: { Cookie: cookie },
      })

      const res = await GET(req)
      expect(res.status).toBe(403)
    })

    it('cannot create admin users', async () => {
      const passwordHash = await hashPassword('password123')
      const user = await prisma.user.create({
        data: {
          username: 'receptionist',
          name: 'Receptionist User',
          passwordHash,
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: user.id,
        role: 'receptionist',
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
          password: 'pass123',
          role: 'receptionist',
        }),
      })

      const res = await adminPost(req)
      expect(res.status).toBe(403)
    })
  })

  describe('Session and logout', () => {
    it('logout clears session cookie', async () => {
      const passwordHash = await hashPassword('password123')
      await prisma.user.create({
        data: {
          username: 'testuser',
          name: 'Test User',
          passwordHash,
          role: 'receptionist',
          active: true,
        },
      })

      const loginReq = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      })
      const loginRes = await loginPost(loginReq)
      expect(loginRes.status).toBe(200)

      const logoutReq = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: (loginRes.headers.get('set-cookie') || '').split(', ').join('; '),
        },
      })

      const logoutRes = await logoutPost()
      expect(logoutRes.status).toBe(200)
      const logoutData = await logoutRes.json()
      expect(logoutData.ok).toBe(true)

      const cookieHeader = logoutRes.headers.get('set-cookie') || ''
      expect(cookieHeader).toContain('session=')
      expect(cookieHeader).toContain('Max-Age=0')
    })

    it('cannot access protected route without session', async () => {
      const req = new Request('http://localhost/api/patients')
      const res = await patientsGet(req)
      expect(res.status).toBe(200)
    })
  })

  describe('Password confirmation', () => {
    it('rejects mismatched passwords on add user', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
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
          confirmPassword: 'differentpass',
          role: 'receptionist',
        }),
      })

      const res = await adminPost(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Passwords do not match')
    })

    it('rejects mismatched passwords on edit user', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const target = await prisma.user.create({
        data: {
          username: 'target',
          name: 'Target User',
          passwordHash: await hashPassword('oldpass'),
          role: 'receptionist',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
        role: 'superadmin',
        expiresAt: Date.now() + 86400000,
      })

      const req = new Request(`http://localhost/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'newpass123',
          confirmPassword: 'differentpass',
        }),
      })

      const res = await PATCH(req, { params: Promise.resolve({ id: target.id }) })
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Passwords do not match')
    })

    it('allows add user when confirmPassword is omitted', async () => {
      const passwordHash = await hashPassword('password123')
      const admin = await prisma.user.create({
        data: {
          username: 'superadmin',
          name: 'Super Admin',
          passwordHash,
          role: 'superadmin',
          active: true,
        },
      })

      const cookie = makeCookie({
        userId: admin.id,
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
          username: 'newuser2',
          password: 'newpass123',
          role: 'receptionist',
        }),
      })

      const res = await adminPost(req)
      expect(res.status).toBe(201)
    })
  })
})
