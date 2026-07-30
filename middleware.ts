import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decryptSession, encryptSession, SessionData } from '@/lib/session'

const publicPaths = ['/login', '/_next', '/favicon.ico', '/sw.js']
const apiPublicPaths = ['/api/auth/login', '/api/auth/logout']
const TTL_MS = 24 * 60 * 60 * 1000

function refreshSessionCookie(response: NextResponse, session: SessionData): void {
  const refreshed: SessionData = {
    userId: session.userId,
    role: session.role,
    expiresAt: Date.now() + TTL_MS,
  }
  const token = encryptSession(refreshed)
  const maxAge = Math.floor(TTL_MS / 1000)
  response.cookies.set('session', token, {
    httpOnly: true,
    path: '/',
    maxAge,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const isPublicApi = apiPublicPaths.some((p) => pathname === p || pathname.startsWith(p))
    if (isPublicApi) {
      return NextResponse.next()
    }
  }

  const token = request.cookies.get('session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = decryptSession(token)
  if (!session) {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      response.cookies.delete('session')
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }

  const response = NextResponse.next()
  refreshSessionCookie(response, session)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|logo.svg|icon.svg|apple-icon.png).*)'],
}
