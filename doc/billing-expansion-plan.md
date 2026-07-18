# Billing Workspace Expansion — Implementation Plan

## Overview

**Goal:** Transform `components/billing/billing-workspace.tsx` from a simple billing-only page into a full-featured Universal Billing + Expenses + Reports workspace, as designed in `components/billing/billing-workspace copy.tsx`.

**Current state (after manual file swap):**
- `components/billing/billing-workspace.tsx` → NEW full-featured code (1608 lines, mock data, 3 tabs: Billing / Expenses / Reports)
- `components/billing/billing-workspace copy 2.tsx` → OLD billing-only code backup (733 lines, API-connected)
- `components/billing/billing-workspace copy.tsx` → Source of new code (unchanged)

**Target state:**
- `billing-workspace.tsx` remains the real page with full features
- All mock data replaced with real API calls
- Expenses and Reports modules fully wired to backend
- Patient MR lookup connected to real API

---

## 1. What the New Page Contains

### Module Tabs
1. **Billing & Revenue** — invoice list, create invoice, view/print/export PDF
2. **Expenses** — expense list, add/edit/delete expense, receipt upload, print voucher
3. **Reports** — daily report, monthly report, export Excel/PDF

### Dashboard Metrics (4 cards)
- Total Revenue
- Total Expenses
- Net Profit
- Outstanding Patient Bills

### Key Features to Preserve
- Professional A4 invoice print template with clinic letterhead
- Patient MR lookup with autofill
- Dynamic bill items (add/remove)
- Discount, tax, payment tracking
- PDF export via html2canvas + jspdf

---

## 2. Backend Readiness Audit

### Database
- **Provider:** SQLite (`provider = "sqlite"` in `prisma/schema.prisma`)
- **Current models:** Patient, Visit, OPSheet, Prescription, NutritionAssessment, AyurcareTreatment, FollowUp, Invoice, InvoiceItem, Document, Staff, MRSequence
- **Missing model:** Expense (must be added)

### Already Working (from existing code)
| Endpoint | Method | Status |
|---|---|---|
| `/api/billing` | GET (list), POST (create) | ✅ Ready — returns `{ invoices, total, page, limit }` |
| `/api/billing/[id]` | GET (detail), PATCH (update) | ✅ Ready |
| `/api/billing/[id]/print` | GET (print view) | ✅ Ready |
| `/api/patients/[mr]` | GET (patient lookup by MR) | ✅ Already exists — returns full patient record with `patientName`, `mr`, `mobileNumber`, `age`, `dob`, `gender`, `bloodGroup`, `address`, `district`, `state`, `pinCode` |

### MISSING — Must Build Before Go-Live

#### A. Expenses CRUD API (NEW)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/expenses` | GET | List all expenses (with filters: date, month, category) |
| `/api/expenses` | POST | Create expense |
| `/api/expenses/[id]` | GET | Single expense detail |
| `/api/expenses/[id]` | PATCH | Update expense |
| `/api/expenses/[id]` | DELETE | Delete expense |

**Special requirement:** File upload handling for receipt attachments (images/PDFs). Decide storage strategy:
- Option A: Base64 in database (simple, no file system)
- Option B: Local filesystem (`/public/uploads/`)
- Option C: Cloud storage (S3/etc.)

#### B. Database Schema — Expense Model
Add to `prisma/schema.prisma`:
```prisma
model Expense {
  id            String   @id @default(cuid())
  date          String   // ISO yyyy-mm-dd
  category      String
  description   String
  amount        Float
  paymentMethod String
  paidTo        String
  remarks       String?
  receiptName   String?
  receiptDataUrl String? // base64 or file path
  addedBy       String
  createdDate   String   // display date, set once
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### C. Reports API (Optional — can be client-side for now)
The Reports panel in the copy computes daily/monthly revenue/expenses/profit from `invoices` and `expenses` arrays. This can work client-side if:
- Both invoices and expenses are fetched on tab load
- OR build dedicated endpoints:
  - `GET /api/reports/daily` — aggregated by day
  - `GET /api/reports/monthly` — aggregated by month

### Important API Shape Notes

#### Billing API (`/api/billing?limit=100`)
- Returns: `{ invoices: Invoice[], total: number, page: number, limit: number }`
- New component fetches with `limit=100` and maps via `mapDbInvoiceToFrontend`
- **Compatible:** New component uses `(data.invoices || []).map(...)` — matches API shape exactly

#### Patient API (`/api/patients/[mr]`)
- Returns: `{ patient: Patient }` with fields `patientName`, `mr`, `mobileNumber`, `age` (Int), `dob` (DateTime), `gender`, `bloodGroup`, `address`, `district`, `state`, `pinCode`
- New component's `handleMrNumberChange` maps these to frontend `Patient` type:
  - `patientName` → `name`
  - `mr` → `mrNumber`
  - `mobileNumber` → `contact`
  - `age` → `age` (as string)
  - `dob` → `dob` (as ISO date string)
  - `address + district + state + pinCode` → `address`
- **Compatible:** Existing API already supports the new component's MR lookup needs

---

## 3. Implementation Plan — Step by Step

### Phase 1: Backend Foundation (Do First)
**Goal:** Build the missing APIs so the frontend has something to call.

#### Step 1.1: Patient Lookup API (Already Exists — Verify Compatibility)
- **Endpoint:** `GET /api/patients/[mr]` already exists at `app/api/patients/[mr]/route.ts`
- **Returns:** `{ patient: Patient }` with fields `patientName`, `mr`, `mobileNumber`, `age` (Int), `dob` (DateTime), `gender`, `bloodGroup`, `address`, `district`, `state`, `pinCode`
- **New component mapping:** `handleMrNumberChange` in `NewInvoiceModal` maps these to frontend `Patient` type:
  - `patientName` → `name`
  - `mr` → `mrNumber`
  - `mobileNumber` → `contact`
  - `age` → string
  - `dob` → ISO date string
  - `address + district + state + pinCode` → `address`
- **Action:** Verify the existing API works with the new component's MR lookup flow. No new endpoint needed.

#### Step 1.2: Expenses Database Migration
- Add `Expense` model to `prisma/schema.prisma`
- Run `npx prisma migrate dev --name add-expenses`
- Verify migration succeeds

#### Step 1.3: Expenses API Routes
- Create `app/api/expenses/route.ts` (GET list + POST create)
- Create `app/api/expenses/[id]/route.ts` (GET detail + PATCH update + DELETE)
- Implement query filtering (date, month, category) in GET
- Handle file upload in POST/PATCH (multipart/form-data)
- Return consistent JSON shape matching frontend `Expense` type

#### Step 1.4: Verify Existing Billing APIs
- Confirm `/api/billing?limit=100` works (or adjust frontend to use pagination)
- Test invoice creation end-to-end
- Test invoice detail fetch

---

### Phase 2: Frontend Wiring (Connect Real APIs)
**Goal:** Replace all mock/seed data and synchronous lookups with real API calls.

#### Step 2.1: Replace Seed Data with API Fetch
In `BillingWorkspace` component:
- Replace `const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices)` with `useState<Invoice[]>([])`
- Add `useEffect` to fetch `/api/billing?limit=100` on mount
- Add `loading` and `error` states
- Replace `handleSaveInvoice` to call real API (similar to old code but adapted for new structure)

#### Step 2.2: Wire Expenses Panel
- Replace `const [expenses, setExpenses] = useState<Expense[]>(seedExpenses)` with API fetch
- Wire `onAdd`, `onEdit`, `onDelete` to real API calls
- Add loading/error states to ExpensesPanel
- Handle receipt file upload in `NewExpenseModal` (convert to base64 or FormData)

#### Step 2.3: Wire Reports Panel
- Option A (simple): Fetch invoices + expenses, compute aggregates client-side (already implemented in copy)
- Option B (scalable): Call `/api/reports/daily` and `/api/reports/monthly`
- Wire Excel/PDF export buttons

#### Step 2.4: Patient MR Lookup
- Replace synchronous `PATIENT_DIRECTORY[mrNumber]` lookup with async API call
- Add debounce (already implemented in copy: 400ms)
- Add `AbortController` for cleanup
- Add loading state while fetching
- Handle 404 (new patient) vs 200 (existing patient)

---

### Phase 3: Refinement & Safety
**Goal:** Make sure everything works correctly and safely.

#### Step 3.1: Invoice ID Generation
- Current copy uses: `INV-${Math.floor(90000 + Math.random() * 9999)}`
- Backend already generates sequential IDs: `INV-${String(nextNum).padStart(5, '0')}`
- **Decision:** Let backend generate IDs. Frontend should NOT set `id` on create; use backend-returned ID.

#### Step 3.2: Date Handling
- Backend stores `invoiceDate` as display string (e.g., "02 Jun 2026")
- Frontend should send ISO date or let backend set display date
- Ensure consistency between frontend and backend date formats

#### Step 3.3: Error Handling
- Add toast notifications for all API errors
- Show loading states on all buttons during API calls
- Handle network failures gracefully

#### Step 3.4: Validation Sync
- Frontend has client-side validation (`canSave` / `validate`)
- Backend must enforce same rules server-side
- Ensure error messages match between frontend and backend

#### Step 3.5: PDF Export Verification
- Test html2canvas + jspdf export for invoices
- Test print layout for invoices and expense vouchers
- Ensure A4 sizing is correct

---

## 4. Existing Tests & Test Plan

### Current Test File
**File:** `components/billing/billing-workspace.test.tsx` (272 lines)

**What it currently tests (old billing-only component):**
- Loading state on initial render
- Invoice list rendering after fetch
- Error state on fetch failure
- Empty state when no invoices
- Dashboard metrics (Today collected, Outstanding, Open invoices)
- New invoice modal open/close
- Invoice creation flow (MR lookup → fill details → save → preview)
- Invoice preview modal open on row click
- Print window opening from invoice preview
- PDF export button click
- Center name display

**Test dependencies mocked:**
- `next/navigation` → `useRouter`
- `html2canvas` → returns mock canvas
- `jspdf` → returns mock PDF instance
- `global.fetch` → mock API responses

### What Breaks After File Swap
The current test file will **fail immediately** after swapping to the new 1608-line component because:

1. **Mock data shape mismatch** — old tests use `invoiceNumber`, `patientName`, etc. (API shape). New component uses `id`, `patient.name`, `patient.mrNumber` (frontend shape).
2. **Missing tabs** — new component has Billing / Expenses / Reports tabs; old tests don't account for tab navigation.
3. **Missing expense/report elements** — old tests don't cover ExpensesPanel or ReportsPanel.
4. **Different modal triggers** — old tests look for "Create invoice" text, which still exists but the modal internals changed.
5. **Different print behavior** — old test expects `window.open` for print; new component uses `window.print()` with `@media print` CSS.

### Required Test Updates

#### A. Fix Existing Billing Tests (Must Do First)
Update mock data shape to match new frontend `Invoice` type:
```ts
// Old shape (API):
{ invoiceNumber: 'INV-00001', patientName: 'Aarav Sharma', ... }

// New shape (frontend):
{ id: 'INV-00001', center: 'nutrition', patient: { name: 'Aarav Sharma', mrNumber: 'NU000001', ... }, ... }
```

Update fetch mock to return `{ invoices: [...] }` directly (not wrapped in pagination object with `total`, `page`, `limit`), because the new component calls `/api/billing?limit=100` and maps via `mapDbInvoiceToFrontend`.

Update print test — new component calls `window.print()` directly, not `window.open`.

#### B. Add New Tests for Expenses Module
- Expenses tab renders when clicked
- Expenses table displays seeded/expense data
- "Add expense" button opens NewExpenseModal
- NewExpenseModal form fields render (date, category, description, amount, payment method, paid to, remarks)
- New category can be added via "+ Add new category…"
- Receipt file attachment UI renders
- Save expense calls correct API and adds to list
- Edit expense opens modal pre-filled
- Delete expense shows ConfirmDialog
- ConfirmDialog "Delete expense" removes expense
- Expense detail modal renders with print/delete buttons

#### C. Add New Tests for Reports Module
- Reports tab renders when clicked
- Daily report table renders
- Monthly report table renders
- "Export Excel" button renders
- "Export PDF" button renders
- Reports show "No records yet." when empty

#### D. Add New Tests for Tab Navigation
- Billing tab is active by default
- Clicking "Expenses" tab shows expenses panel
- Clicking "Reports" tab shows reports panel
- Tab content switches correctly

#### E. Add New Tests for Dashboard Metrics
- 4 metric cards render: Total Revenue, Total Expenses, Net Profit, Outstanding Patient Bills
- Net Profit shows positive/negative styling correctly
- Icons render on metric cards

#### F. Add New Tests for Patient MR Lookup
- Entering existing MR number triggers async lookup
- Patient details autofill on found
- "No record on file" message for new MR
- Loading state shows during lookup
- Debounce works (400ms delay)

---

## 5. Safe Implementation Guidelines

### Do NOT Break Existing Billing
- The old code in `billing-workspace copy 2.tsx` is your safety net
- If something goes wrong during wiring, you can revert to old code immediately
- Make small incremental changes and test after each

### Testing Order
1. Test patient lookup API with existing MR numbers
2. Test expense CRUD manually via API client (Postman/ThunderClient)
3. Wire one module at a time (billing first, then expenses, then reports)
4. Test each module in browser before moving to next

### Rollback Strategy
- Keep `billing-workspace copy 2.tsx` until everything is verified
- If new code breaks, rename files back:
  - `billing-workspace.tsx` → delete or rename
  - `billing-workspace copy 2.tsx` → `billing-workspace.tsx`

### Code Quality
- Follow existing patterns from `app/api/billing/route.ts`
- Use same Prisma patterns (include, where, orderBy)
- Match frontend type shapes exactly to avoid runtime errors
- Add TypeScript types for all API responses

---

## 6. Dependencies Check

### Already Installed (from copy code)
- `lucide-react` — icons ✅
- `html2canvas` — PDF export ✅
- `jspdf` — PDF generation ✅

### May Need to Install
- `xlsx` (SheetJS) — for Excel export in Reports panel
  - Check if already in `package.json`
  - If not: `npm install xlsx`

---

## 7. File Reference Map

| File | Current Role | Action Needed |
|---|---|---|
| `components/billing/billing-workspace.tsx` | Real page (new code) | Wire to APIs (Phase 2) |
| `components/billing/billing-workspace copy.tsx` | Source new code | No change (reference only) |
| `components/billing/billing-workspace copy 2.tsx` | Backup old code | Keep until verified |
| `app/api/billing/route.ts` | Invoice list/create | ✅ Ready, verify limit param |
| `app/api/billing/[id]/route.ts` | Invoice detail/update | ✅ Ready |
| `app/api/billing/[id]/print/route.ts` | Print view | ✅ Ready |
| `app/api/patients/[mr]/route.ts` | Patient lookup | ✅ Already exists — verify compatibility with new component |
| `app/api/expenses/route.ts` | Expense list/create | ❌ Must create |
| `app/api/expenses/[id]/route.ts` | Expense detail/update/delete | ❌ Must create |
| `prisma/schema.prisma` | Database schema | ❌ Must add Expense model |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend APIs not ready on time | Medium | High | Build APIs in Phase 1 before touching frontend |
| Expense file upload complexity | Medium | Medium | Start with base64 storage, optimize later |
| Patient API response shape mismatch | Low | Medium | Verify existing `/api/patients/[mr]` returns fields new component expects |
| PDF export breaks on different browsers | Low | Medium | Test in Chrome/Edge, add fallback |
| Invoice ID conflict (frontend vs backend) | Medium | High | Let backend generate IDs only |
| Date format mismatch | Medium | Medium | Standardize on ISO in DB, format for display |
| Breaking existing billing flow | Low | High | Keep backup file, test incrementally |

---

## 9. Completion Checklist

### Backend
- [ ] Expense model added to Prisma schema and migrated
- [ ] `GET /api/expenses` endpoint working
- [ ] `POST /api/expenses` endpoint working
- [ ] `GET /api/expenses/[id]` endpoint working
- [ ] `PATCH /api/expenses/[id]` endpoint working
- [ ] `DELETE /api/expenses/[id]` endpoint working
- [ ] Verify `/api/patients/[mr]` compatibility with new component's MR lookup flow

### Frontend Wiring
- [ ] `billing-workspace.tsx` fetches invoices from `/api/billing?limit=100`
- [ ] `billing-workspace.tsx` fetches expenses from `/api/expenses`
- [ ] NewInvoiceModal uses `/api/patients/:mrNumber` for lookup
- [ ] handleSaveInvoice uses real API (not seed data)
- [ ] handleSaveExpense uses real API
- [ ] handleDeleteExpense uses real API
- [ ] Receipt file upload works in NewExpenseModal
- [ ] Reports panel displays real data
- [ ] PDF export works for invoices
- [ ] Print works for invoices and expense vouchers
- [ ] Excel export works for reports (if xlsx installed)
- [ ] All loading and error states show correctly

### Tests
- [ ] Existing billing tests updated to match new component shape
- [ ] New tests added for Expenses tab and modals
- [ ] New tests added for Reports tab
- [ ] New tests added for tab navigation
- [ ] New tests added for dashboard metrics and icons
- [ ] New tests added for patient MR lookup flow
- [ ] `npm run test` passes — all tests green
- [ ] `npm run build` succeeds — no TypeScript or build errors
- [ ] `npm run lint` passes — no lint errors
- [ ] `npm run typecheck` passes — no type errors

### Cleanup
- [ ] Old backup file (`billing-workspace copy 2.tsx`) can be deleted

---

## 10. Notes for Implementing Agent

1. **Do not modify** `billing-workspace copy.tsx` — it is the source of truth for the new design
2. **Do not delete** `billing-workspace copy 2.tsx` until everything is verified
3. **Work in this order:** Backend APIs first → Frontend wiring second → Testing third
4. **The copy file is 1608 lines** — read it fully before starting implementation
5. **The old file is 733 lines** — reference it only for rollback or to see original API patterns
6. **All API shapes must match** the TypeScript types defined in the copy file exactly
7. **Expense receipt upload** is the most complex part — ask for clarification on storage strategy if unsure
8. **Invoice IDs:** Backend generates them. Frontend should not pre-generate IDs on create.
9. **Test file exists** at `components/billing/billing-workspace.test.tsx` (272 lines) — it tests the OLD component and must be fully updated before it will pass against the new component.
10. **Run verification in this order after changes:**
    ```bash
    npm run test        # Run all tests
    npm run build       # Verify TypeScript + build
    npm run lint        # Check code style
    npm run typecheck   # Check types
    ```
11. **Do not mark any section complete** until all 4 verification commands pass cleanly.
