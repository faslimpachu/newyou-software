import { cookies } from 'next/headers'
import crypto from 'crypto-js'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const TTL_MS = 24 * 60 * 60 * 1000

export interface SessionData {
  userId: string
  role: string
  expiresAt: number
}

export function encryptSession(data: SessionData): string {
  return crypto.AES.encrypt(JSON.stringify(data), SECRET).toString()
}

export function decryptSession(token: string): SessionData | null {
  try {
    const bytes = crypto.AES.decrypt(token, SECRET)
    const json = bytes.toString(crypto.enc.Utf8)
    if (!json) return null
    const data = JSON.parse(json) as SessionData
    if (data.expiresAt < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export async function getCurrentUser(request?: Request) {
  let token: string | undefined

  if (request) {
    const cookieHeader = request.headers.get('cookie')
    token = cookieHeader?.split('; ').find((c) => c.startsWith('session='))?.slice(8)
  } else {
    const cookieStore = await cookies()
    token = cookieStore.get('session')?.value
  }

  if (!token) return null
  const session = decryptSession(token)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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

  if (!user || !user.active) return null
  return user
}

export async function requireUser(request?: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(request: Request | undefined, allowedRoles: string[]) {
  const user = await requireUser(request)
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

export function createSessionCookie(user: { id: string; role: string }): string {
  const data: SessionData = {
    userId: user.id,
    role: user.role,
    expiresAt: Date.now() + TTL_MS,
  }
  const token = encryptSession(data)
  const maxAge = Math.floor(TTL_MS / 1000)
  return `session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`
}

export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
