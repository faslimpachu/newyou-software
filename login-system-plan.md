# Login System Implementation Plan

## Overview
Add secure, role-based authentication to the existing Next.js + Prisma + MySQL application. No external auth providers; minimal, safe, and aligned with the current stack.

---

## 1. Rename `Staff` → `User`

### Files to change
- `prisma/schema.prisma`
  - Rename `model Staff` to `model User`
  - Rename `@@map("staff")` to `@@map("users")`
  - Update all relation fields referencing `Staff` → `User`
- `prisma/seed.ts`
  - Update model references and table name
- Any TypeScript files importing `Prisma.Staff` → `Prisma.User`

### After change
Run:
```bash
npx prisma migrate dev --name rename-staff-to-user
```

---

## 2. Add `passwordHash` to `User`

### Schema change
```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  username     String   @unique
  passwordHash String
  role         String   // superadmin | admin | receptionist
  phone        String?
  centerType   String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

Run:
```bash
npx prisma migrate dev --name add-password-hash
```

---

## 3. Session Strategy

- **Cookie-based encrypted session** (HttpOnly, SameSite=Strict, Secure in production)
- **TTL:** 24 hours
- **No JWT in localStorage** (prevents XSS)
- Session stores minimal data: `userId`, `role`, `expiresAt`

### Why this is safest and easiest
- No external service
- No extra database table
- Works with your existing Next.js server components / route handlers

---

## 4. Dependencies

Install:
```bash
npm install bcryptjs cookie crypto-js
npm install -D @types/bcryptjs @types/cookie @types/crypto-js
```

Notes:
- `bcryptjs` is pure JS, no native compilation needed
- `crypto-js` for symmetric encryption of the session cookie value

---

## 5. Core Files to Create

### `lib/session.ts`
Helpers:
- `encryptSession(data)` → string
- `decryptSession(token)` → data | null
- `getCurrentUser()` → reads cookie, queries DB, returns User | null
- `requireUser()` → same but throws 401 if not logged in
- `createSession(user)` → sets HttpOnly cookie
- `clearSession()` → clears cookie

### `app/api/auth/login/route.ts`
- Accepts `POST` with `{ username, password }`
- Looks up user by username
- Compares password with `bcryptjs`
- On success: `createSession(user)`, return `{ ok: true }`
- On failure: return `401` with generic message

### `app/api/auth/logout/route.ts`
- Clears session cookie

### `app/login/page.tsx`
- shadcn/ui form
- Fields: `username`, `password`
- React Hook Form + Zod validation
- Calls `/api/auth/login`

### `app/layout.tsx`
- Server component session check
- Redirect to `/login` if not authenticated

---

## 6. User Creation (Super Admin Only)

### Page: `app/admin/users/page.tsx`
- Protected to `superadmin` role only
- Table listing all users
- Button to create new user
- Form fields: `name`, `username`, `password`, `role`, `phone`, `centerType`, `active`

### API: `app/api/admin/users/route.ts`
- `GET` → list users (superadmin only)
- `POST` → create user (superadmin only), hash password before save

### API: `app/api/admin/users/[id]/route.ts`
- `PATCH` → update user (superadmin only)
- `DELETE` → deactivate user (soft delete via `active = false`, superadmin only)

---

## 7. Role-Based Access

Use the existing `User.role` field.

| Role         | Access                                   |
| ------------ | ---------------------------------------- |
| superadmin   | Full access, including **User Creation** |
| admin        | Full access **except User Creation**     |
| receptionist | Full access **except User Creation**     |

### Enforcing Roles

* Restrict only the **User Creation** feature to `superadmin`.
* All other roles can access all existing features.
* Implement this in the simplest way possible.
* Make the implementation **feature-ready** so that additional role-based restrictions can be added easily in the future without major code changes.
* Use middleware or server-side checks before rendering protected routes.
* Provide a helper such as `requireRole(allowedRoles)` so future features can define their allowed roles with minimal changes.

---

## 8. Seed / Initial Setup

### `prisma/seed.ts`
```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('change-me-immediately', 10)

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      name: 'Super Admin',
      passwordHash,
      role: 'superadmin',
      active: true,
    },
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect())
```

Run once:
```bash
npx prisma db seed
```

---

## 9. Security Checklist

- [ ] Passwords hashed with bcrypt (cost 10)
- [ ] Session cookie: HttpOnly, SameSite=Strict, Secure in production
- [ ] No passwords or tokens in localStorage
- [ ] Generic error messages on login (no user enumeration)
- [ ] Rate limiting on `/api/auth/login` (optional, can add middleware)
- [ ] All protected routes check session server-side
- [ ] Admin APIs verify role before any action

---

## 10. Execution Order

1. Rename `Staff` → `User` + migrate
2. Add `passwordHash` field + migrate
3. Install dependencies
4. Create `lib/session.ts`
5. Create `/api/auth/login` and `/api/auth/logout`
6. Create `/login` page
7. Add middleware or layout session check
8. Create admin user management API + page
9. Update seed script
10. Run seed, test login flow
11. Verify route protection
