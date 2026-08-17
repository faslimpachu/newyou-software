import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { encryptSession, decryptSession, hashPassword } from '@/lib/session'
import { GET as dashboardGet } from '@/app/api/dashboard/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Session URL-safe base64', () => {
  it('encrypts and decrypts a session roundtrip', () => {
    const data = {
      userId: 'user-123',
      role: 'superadmin',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    } as import('@/lib/session').SessionData
    const token = encryptSession(data)
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(token).not.toContain('=')

    const decoded = decryptSession(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.userId).toBe('user-123')
    expect(decoded!.role).toBe('superadmin')
  })

  it('returns null for expired session', () => {
    const token = encryptSession({
      userId: 'user-123',
      role: 'receptionist',
      expiresAt: Date.now() - 1000,
    })
    expect(decryptSession(token)).toBeNull()
  })

  it('returns null for tampered token', () => {
    expect(decryptSession('invalid-token')).toBeNull()
  })
})

describe('Dashboard API', () => {
  it('returns 200 with expected top-level keys', async () => {
    const passwordHash = await hashPassword('password123')
    await prisma.user.upsert({
      where: { username: 'dashuser' },
      update: {},
      create: {
        username: 'dashuser',
        name: 'Dash User',
        passwordHash,
        role: 'receptionist',
        active: true,
      },
    })

    const req = new Request('http://localhost/api/dashboard', {
      method: 'GET',
      headers: { Cookie: `session=${encryptSession({
        userId: 'dashuser',
        role: 'receptionist',
        expiresAt: Date.now() + 86400000,
      })}` },
    })

    const res = await dashboardGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('stats')
    expect(data).toHaveProperty('monthlyRegistrations')
    expect(data).toHaveProperty('consultationTypes')
    expect(data).toHaveProperty('monthlyRevenue')
    expect(data).toHaveProperty('recentRegistrations')
    expect(data).toHaveProperty('upcomingFollowUps')
    expect(data).toHaveProperty('recentBilling')
    expect(data.purchase).toBeDefined()
    expect(data.purchase).toHaveProperty('inventoryValue')
    expect(data.purchase).toHaveProperty('expiredStockValue')
    expect(data.purchase).toHaveProperty('expiringSoonCount')
    expect(data.purchase).toHaveProperty('expiringSoonValue')
    expect(data.purchase).toHaveProperty('totalBatches')
  })
})
