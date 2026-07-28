import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { prisma } from '@/lib/prisma'
import { hashPassword, encryptSession } from '@/lib/session'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Auth API', () => {
  it('POST login succeeds with valid credentials', async () => {
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

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    })

    const res = await loginPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.user.username).toBe('testuser')
    expect(data.user.role).toBe('receptionist')
  })

  it('POST login fails with wrong password', async () => {
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

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'wrongpass' }),
    })

    const res = await loginPost(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Invalid credentials')
  })

  it('POST login fails for non-existent user', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nouser', password: 'password123' }),
    })

    const res = await loginPost(req)
    expect(res.status).toBe(401)
  })

  it('POST login fails for inactive user', async () => {
    const passwordHash = await hashPassword('password123')
    await prisma.user.create({
      data: {
        username: 'inactive',
        name: 'Inactive User',
        passwordHash,
        role: 'receptionist',
        active: false,
      },
    })

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'inactive', password: 'password123' }),
    })

    const res = await loginPost(req)
    expect(res.status).toBe(401)
  })

  it('POST login fails with missing fields', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser' }),
    })

    const res = await loginPost(req)
    expect(res.status).toBe(401)
  })

  it('POST logout clears session', async () => {
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
})
