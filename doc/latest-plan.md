# Implementation Plan (Master) — Frontend + Backend + MySQL

## Overview

Applies to: `D:\Github\hos\newyou-software`

Stack: Next.js 16 (App Router) + React 19 + Prisma + MySQL

Current state: frontend-only with mock state in `lib/`. No API routes, no Prisma schema, no database connection.

Source of truth for requirements: `doc/plan.md`
Backend reference: `doc/backend-plan.md`

---

## 1. Database / MySQL

### Environment setup

Create `.env` (add `.env` to `.gitignore`):
```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/newyou_hms"
DIRECT_URL="mysql://USER:PASSWORD@HOST:3306/newyou_hms"
```

Values to replace later:
- `USER` → MySQL username
- `PASSWORD` → MySQL password
- `HOST` → MySQL host (localhost or server IP)
- `newyou_hms` → database name

### SQLite for local development

For faster local dev you can use **SQLite** instead of running a MySQL server.

Dev `.env` (SQLite):
```
DATABASE_URL="file:./dev.db"
```

Keep the schema models identical. Only two things change:
- In `schema.prisma`, use `provider = "sqlite"` for dev
- Use the SQLite `DATABASE_URL` in `.env`

Migrations with SQLite:
```bash
npx prisma migrate dev --name init
```

Switch to MySQL for production by:
1. Changing `provider = "mysql"` in `schema.prisma`
2. Updating `DATABASE_URL` to the MySQL connection string
3. Running `npx prisma migrate dev` against the MySQL database

### Prisma setup

Files to create:
- `prisma/schema.prisma`
- `prisma/migrations/` (created by Prisma)
- `prisma/seed.ts`

Migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Seed:
- Default staff/admin users
- Default lookup data

---

## 2. Prisma Schema

**File:** `prisma/schema.prisma`

Use field names from `doc/plan.md` as the canonical source.

### Models

| Model | Key Fields (Canonical plan names) |
|---|---|
| `Patient` | mr, consultationType, patientName, parentName, gender, mobileNumber, address, district, state, pinCode, dob, age, bloodGroup, status, createdAt |
| `Visit` | patientMr, doctor, dietitian, appointmentDate, appointmentTimeSlot, status, createdAt |
| `OPSheet` | patientMr, visitId, clinicalExamination, vitals, diagnosis, symptoms, status, createdAt |
| `Prescription` | patientMr, opSheetId, diagnosis, medicines, advice, followUp, doctorSignature, createdAt |
| `NutritionAssessment` | patientMr, assessmentDate, program, weight, bmi, bodyFat, dietPlan, observations, recommendations, notes, reviewDate, dietitian |
| `AyurcareTreatment` | patientMr, diagnosis, treatmentPlan, medicines, procedures, therapies, advice, practitioner, reviewDate, notes |
| `FollowUp` | patientMr, program, reviewDate, dueDate, assignedTo, priority, status, remarks |
| `Invoice` | patientMr, invoiceNumber, invoiceDate, consultationType, centerType, subtotal, tax, grandTotal, paymentMethod, paidAmount, balance, status, remarks |
| `InvoiceItem` | invoiceId, description, quantity, rate, discount, tax, subtotal |
| `Document` | patientMr, title, category, fileName, filePath, fileType, uploadedBy, remarks, uploadedAt |
| `Staff` | name, role, email, phone, centerType, active |
| `MRSequence` | centerType, lastNumber, updatedAt |

### Constraints

- `Patient.mobileNumber` — unique, 10 digits, numeric
- `Patient.mr` — unique, immutable, per-center sequential
- `MRSequence` — atomic transactions
- All FKs with proper cascade rules

---

## 3. API Routes

**Directory:** `/app/api/`

| Route | Methods | Purpose |
|---|---|---|
| `/api/register` | POST | Create patient, atomic MR generation, mobile uniqueness, auto-create first visit |
| `/api/patients` | GET, POST | List (pagination/search/filter), create |
| `/api/patients/[mr]` | GET, PATCH, DELETE | Detail, update status |
| `/api/patients/[mr]/documents` | POST, GET, PATCH, DELETE | Upload, download, replace, delete |
| `/api/visits` | GET, POST | List visits, create |
| `/api/visits/[id]` | PATCH | Update status, assign date/time/doctor/dietitian |
| `/api/op-sheets` | GET, POST, PATCH | CRUD |
| `/api/prescriptions` | GET, POST, PATCH | CRUD, blank prescription |
| `/api/nutrition/assessments` | GET, POST, PATCH | Per-patient CRUD |
| `/api/ayurcare/treatments` | GET, POST, PATCH | Per-patient CRUD |
| `/api/follow-ups` | GET, POST, PATCH | CRUD |
| `/api/billing` | GET, POST | Invoice list, create |
| `/api/billing/[id]` | GET, PATCH | Detail, update |
| `/api/billing/[id]/print` | GET | Server-side PDF generation |
| `/api/reports` | GET | Patient list, revenue, registration reports |
| `/api/reports/export` | GET | CSV, Excel export for reports and patient tables |
| `/api/lookup` | GET | Staff, services, programs dropdown data |

### Auth (when added)

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Staff login |
| `/api/auth/session` | GET, POST | Session management |

---

## 4. Frontend Fixes (No Backend Required)

Fix these first or in parallel with backend. Use exact names from `doc/plan.md`.

### Registration (`components/patients/patient-workspace.tsx`)
- [ ] Label `Patient Name` (combine first/last)
- [ ] Label `Parent/Father/Husband/Mother Name`
- [ ] Label `Address`
- [ ] Make `Consultation Type` mandatory inside form
- [ ] Auto-create first visit UI flow on successful registration

### OP Sheet (`components/patients/patient-workspace.tsx`)
- [ ] Add `Save & Continue` button
- [ ] Increase `Clinical Examination` textarea to `min-h-[600px]`
- [ ] Add version history UI (history list + diff view)
- [ ] Replace generic print with dedicated A4 template

### Prescription (`components/patients/patient-workspace.tsx`)
- [ ] Separate `Gender` field from `Age`
- [ ] Add professional footer
- [ ] Fix header: full address including `JUBILEE BAZAR, ONDEN ROAD, KANNUR-670001, KERALA, INDIA`
- [ ] Bind prescription fields to state with Save/Update

### Printing (replace `window.print()` with A4 templates)
- [ ] `components/visits/visits-workspace.tsx`
- [ ] `components/clinical/care-workspace.tsx` (Nutrition + Ayurcare)
- [ ] `components/workflows/workflow-workspace.tsx` (Follow-up)
- [ ] `components/patients/patient-workspace.tsx` (OP Sheet already partially done)

### Patient Profile Documents
- [ ] Fix View document handler
- [ ] Fix Download document handler
- [ ] Add Replace document
- [ ] Add Remarks input field
- [ ] Add Uploaded By staff picker

### Visits (`components/visits/visits-workspace.tsx`)
- [ ] Make patient table row clickable → opens Patient Profile
- [ ] Implement Fetch patient logic in Schedule modal

### Patients (`components/patients/patient-directory.tsx`)
- [ ] Fix mislabeled Export PDF button (currently exports CSV)

### Nutrition (`components/clinical/care-workspace.tsx`, `kind="nutrition"`)
- [ ] Rename table column `Diet Plan` → `Program`

### Ayurcare (`components/clinical/care-workspace.tsx`, `kind="ayurcare"`)
- [ ] Replace `alert('Exported.')` with real PDF export
- [ ] Replace `window.print()` with A4 template

### Follow-up (`components/workflows/workflow-workspace.tsx`)
- [ ] Replace `window.print()` with A4 template
- [ ] Split `Address / phone` column into separate `Contact Number` column
- [ ] Add `Remarks` to table columns

### Billing (`components/billing/billing-workspace.tsx`)
- [ ] Add `DOB` field to editor and A4 template
- [ ] Make `Paid Amount` editable
- [ ] Label `Consultation Type` (currently `Type`)

### General
- [ ] Add toast notification system (replace `alert()`)
- [ ] Add loading states to all API-bound actions
- [ ] Replace `alert()` with toast error handling
- [ ] Wire pagination UI to API query params

---

## 5. Server-Side Logic

### MR Number Generation
- Atomic transaction on `MRSequence`
- Thread-safe, never duplicate
- `NU000001` / `AY000001`

### Validation
- Every form needs matching server-side validation
- Mobile: 10 digits, numeric, unique
- Duplicate check before insert
- Required fields enforced server-side

### PDF Generation
- Server-side PDF for all templates
- Libraries: `@react-pdf/renderer` or Puppeteer/Playwright
- A4 Portrait, hospital format, no browser UI

### File Upload
- Multipart handling
- Store in `uploads/` (local) or S3-compatible storage
- Serve via download route
- Type whitelist: PDF, images, Word, scanned reports

### Pagination
- Query params: `?page=&limit=&search=&sort=`
- Server-side filtering/sorting
- Total count in response

### Status Transitions
- Enforce valid state changes
- Audit trail for status changes

---

## 6. Frontend-to-Backend Wiring

After APIs are ready:
1. Replace all mock `useState` arrays with actual API calls
2. Wire loading states
3. Handle real error responses
4. Replace `window.print()` with PDF download links
5. Wire pagination UI to API `?page=&limit=` params
6. Cache invalidation after mutations

---

## 7. Implementation Order

```
1. Create prisma/schema.prisma
2. Setup .env with MySQL placeholders
3. Run migrations + seed
4. Build Register + Patients API routes
5. Build Visits + OP Sheet API routes
6. Build Prescriptions + Billing API routes
7. Build Nutrition + Ayurcare API routes
8. Build Follow-up + Documents API routes
9. Build Reports + Lookup API routes
10. Add auth (optional)
11. Fix frontend gaps (can run alongside steps 4-9)
12. Wire frontend to APIs
13. Add PDF generation (server-side)
```

---

## Notes

- This plan covers all 12 sections from `doc/plan.md`
- Field names and labels should match `doc/plan.md` exactly
- Backend and frontend work can overlap
- MySQL connection is not required to write the schema, only when running migrations

---

## 8. Testing Strategy

### Test runner

Use **Vitest** (already in devDependencies).

### Configuration

`vitest.config.ts` settings needed:
- `test.environment = 'node'` for API/integration tests
- `test.environment = 'jsdom'` for frontend component tests
- Separate test database from dev database

### Test database

Use a dedicated test database, not the dev database.

**Option A — MySQL:**
- Create a separate test schema/database (`newyou_hms_test`)
- `vitest.config.ts` uses `.env.test` with `DATABASE_URL` pointing to test DB
- `beforeAll`: connect Prisma to test DB
- `beforeEach`: clean all tables (or use transactions + rollback)
- `afterAll`: disconnect Prisma

**Option B — SQLite (recommended for fast tests):**
- Use `file::memory:` SQLite connection string in test env
- Prisma schema `provider = "sqlite"` for test config
- Instant reset between tests

Example `.env.test`:
```
DATABASE_URL="file:./test.db"
```

### Test directories

```
tests/
  unit/
    lib/
      registration-data.test.ts
      utils.test.ts
  api/
    register.test.ts
    patients.test.ts
    visits.test.ts
    op-sheets.test.ts
    prescriptions.test.ts
    nutrition.test.ts
    ayurcare.test.ts
    follow-ups.test.ts
    billing.test.ts
    documents.test.ts
    reports.test.ts
    lookup.test.ts
  integration/
    registration-flow.test.ts
    patient-workflow.test.ts
    billing-workflow.test.ts
  components/
    patient-workspace.test.tsx
    visits-workspace.test.tsx
    billing-workspace.test.tsx
    care-workspace.test.tsx
```

### Backend API test pattern

Import the route handler directly and call it with a mock `Request`:

```ts
import { GET, POST } from '@/app/api/patients/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.staff.deleteMany();
  await prisma.patient.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('POST /api/patients creates a patient', async () => {
  const req = new Request('http://localhost/api/patients', {
    method: 'POST',
    body: JSON.stringify({ patientName: 'Test', mobileNumber: '9999999999', ... }),
  });
  const response = await POST(req);
  expect(response.status).toBe(201);
  const data = await response.json();
  expect(data.mr).toBeTruthy();
});

test('POST /api/register rejects duplicate mobile', async () => {
  // create first patient
  // attempt second with same mobile
  // expect 409
});
```

### File upload test pattern

Use `form-data` package to build multipart request:

```ts
import FormData from 'form-data';
import { POST } from '@/app/api/documents/route';

test('POST /api/documents accepts PDF upload', async () => {
  const form = new FormData();
  form.append('file', new Blob(['pdf content'], { type: 'application/pdf' }), 'test.pdf');
  form.append('title', 'Test document');
  // ...
  const req = new Request('http://localhost/api/documents', { method: 'POST', body: form });
  const response = await POST(req);
  expect(response.status).toBe(201);
});
```

### Frontend component test pattern

Use existing Testing Library setup (`@testing-library/react`):

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientWorkspace } from '@/components/patients/patient-workspace';

test('shows validation error when mobile is not 10 digits', async () => {
  render(<PatientWorkspace />);
  fireEvent.click(screen.getByText('Register'));
  await waitFor(() => {
    expect(screen.getByText('Mobile number must be exactly 10 digits')).toBeTruthy();
  });
});
```

### Test coverage requirements

| Layer | Tools | Minimum coverage |
|---|---|---|
| Backend API routes | Vitest + Prisma | Every route, happy path + error cases |
| Frontend components | Vitest + React Testing Library | Every form, button, validation message |
| E2E critical flows | Vitest + Playwright (optional) | Registration → Visit → OP Sheet → Prescription → Billing |

### Run commands

Update `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:api": "vitest run tests/api",
    "test:components": "vitest run tests/components",
    "test:unit": "vitest run tests/unit",
    "test:e2e": "vitest run tests/e2e",
    "test:all": "vitest run tests/",
    "build": "next build",
    "dev": "next dev",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### Verification checklist (run before marking any section complete)

- [ ] `npm run test` passes — all API + frontend tests green
- [ ] `npm run build` succeeds — no TypeScript or build errors
- [ ] `npm run lint` passes — no lint errors
- [ ] `npm run typecheck` passes — no type errors
- [ ] Test database is reset between test runs
- [ ] All API route handlers have corresponding test files
- [ ] All frontend form components have validation test coverage

### CI pipeline (recommended)

On every push/PR:
1. `npm install`
2. `npm run test:all`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build`
