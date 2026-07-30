import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { encryptSession } from '@/lib/session'

function publicUrl(path: string): string {
  return `http://localhost${path}`
}

function authCookie(userId: string, role: string): string {
  const token = encryptSession({
    userId,
    role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  })
  return `session=${token}; HttpOnly; Path=/`
}

describe('Middleware auth', () => {
  it('allows public API login without session', async () => {
    const req = new NextRequest(publicUrl('/api/auth/login'))
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows public API logout without session', async () => {
    const req = new NextRequest(publicUrl('/api/auth/logout'))
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('blocks protected API without session', async () => {
    const req = new NextRequest(publicUrl('/api/patients'))
    const res = await middleware(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('blocks protected API with invalid session', async () => {
    const req = new NextRequest(publicUrl('/api/patients'), {
      headers: { Cookie: 'session=invalid-token' },
    })
    const res = await middleware(req)
    expect(res.status).toBe(401)
  })

  it('blocks protected API with expired session', async () => {
    const token = encryptSession({
      userId: 'user-1',
      role: 'receptionist',
      expiresAt: Date.now() - 1000,
    })
    const req = new NextRequest(publicUrl('/api/patients'), {
      headers: { Cookie: `session=${token}` },
    })
    const res = await middleware(req)
    expect(res.status).toBe(401)
  })

  it('allows protected API with valid session', async () => {
    const req = new NextRequest(publicUrl('/api/patients'), {
      headers: { Cookie: authCookie('user-1', 'receptionist') },
    })
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows non-API public pages without session', async () => {
    const req = new NextRequest(publicUrl('/login'))
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects non-API protected page without session to login', async () => {
    const req = new NextRequest(publicUrl('/dashboard'))
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/login')
  })

  it('allows non-API protected page with valid session', async () => {
    const req = new NextRequest(publicUrl('/dashboard'), {
      headers: { Cookie: authCookie('user-1', 'receptionist') },
    })
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })
})
