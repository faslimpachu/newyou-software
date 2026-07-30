# Authentication Plan — Next.js Middleware

## Goal
Protect all API routes with the existing session system, without touching any existing route handler files.

## Why Middleware
- Single file controls access to every `/api/*` route
- Runs before any handler or database logic
- Impossible to forget protection when a new route is added later
- Reuses the same signed session cookie that `/api/auth/me` already validates

## What Gets Protected
Every route under `/api/*` **except**:

- `/api/auth/login` — must stay public
- `/api/auth/logout` — must stay public

This includes, for example:

- `/api/patients`, `/api/patients/[mr]`, `/api/patients/[mr]/documents`
- `/api/visits`, `/api/visits/[id]`
- `/api/expenses`, `/api/expenses/[id]`
- `/api/dashboard`
- `/api/prescriptions`, `/api/follow-ups`, `/api/nutrition/assessments`, `/api/op-sheets`, `/api/ayurcare/treatments`
- `/api/billing`, `/api/billing/summary`, `/api/billing/[id]`, `/api/billing/[id]/print`
- `/api/register`
- `/api/lookup`
- `/api/admin/users`, `/api/admin/users/[id]`

## How It Works
1. Request arrives at any `/api/*` path
2. Middleware checks if path is in the **public allowlist** (`/auth/login`, `/auth/logout`)
3. If public → allow through, no session check
4. If protected → read the session cookie
5. If cookie is missing, malformed, or expired → return `401 Unauthorized`
6. If cookie is valid → allow through to the route handler

## Public Allowlist
```
/api/auth/login
/api/auth/logout
```

Everything else under `/api/*` requires a valid session.

## Session Cookie Format
Same cookie that `/api/auth/login` already sets and `/api/auth/me` already reads:

- **Name:** defined in `lib/session.ts`
- **Value:** encrypted payload containing `{ userId, role, expiresAt }`
- **Flags:** `HttpOnly`, `SameSite=Strict`, `Secure` in production
- **TTL:** 24 hours

## What the Middleware File Does
- Located at project root: `middleware.ts`
- Matches `/api/:path*`
- Reads the session cookie
- Calls the existing session verification logic
- Returns `401 JSON response` for unauthenticated requests
- Does **not** modify or wrap any route handler files

## Implementation Steps
1. Create `middleware.ts` at the project root
2. Import the session helper from `lib/session.ts`
3. Define the matcher for `/api/:path*`
4. Define the public allowlist array
5. On each request: check allowlist → if protected, verify session → return 401 or pass through

## After Adding Middleware
- Test: open any protected API URL in an incognito browser → should get `401`
- Test: log in via `/api/auth/login` → session cookie is set
- Test: call a protected API with the session cookie → should work normally
- Test: hit `/api/auth/login` without a session → should still work (public)
- Test: create a new route under `/api/anything-new` → should be protected automatically

## Edge Cases
- `/api/auth/login` and `/api/auth/logout` must never be accidentally added to the protected check
- Middleware runs on both server and edge runtime; keep the session verification compatible with both
- Static files and non-`/api` routes are not affected by this middleware
