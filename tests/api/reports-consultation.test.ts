import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { hashPassword, encryptSession } from '@/lib/session'
import { GET } from '@/app/api/reports/consultation/route'

function makeCookie(data: Record<string, unknown>): string {
  const token = encryptSession(data as unknown as import('@/lib/session').SessionData)
  return `session=${token}; HttpOnly; Path=/`
}

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Reports consultation API', () => {
  it('returns empty report when no visits exist', async () => {
    const passwordHash = await hashPassword('password123')
    const admin = await prisma.user.create({
      data: {
        username: 'adminreport',
        name: 'Admin',
        passwordHash,
        role: 'admin',
        active: true,
      },
    })

    const req = new Request('http://localhost/api/reports/consultation', {
      headers: { Cookie: makeCookie({ userId: admin.id, role: 'admin', expiresAt: Date.now() + 86400000 }) },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('visits')
    expect(data).toHaveProperty('doctorReport')
    expect(data).toHaveProperty('statusBreakdown')
    expect(data.doctorReport).toHaveLength(0)
  })

  it('returns 401 without auth', async () => {
    const req = new Request('http://localhost/api/reports/consultation')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
