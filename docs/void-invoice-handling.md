# Handling Duplicate Invoices in Production

## Problem
Users sometimes create duplicate invoices. Deleting is not allowed — it breaks audit trails, financial reports, and stock records.

## Solution: Void Instead of Delete

Mark duplicates as `VOID` using the existing `status` field. The invoice stays in the database but is excluded from all active financial calculations.

## Current Invoice Model

From `prisma/schema.prisma` (lines 181-208):

```prisma
model Invoice {
  id              Int      @id @default(autoincrement())
  invoiceNumber   String   @unique
  center          String
  billType        String
  patientName     String
  patientMrNumber String
  patientAge      String?
  patientDob      String?
  patientGender   String?
  patientBloodGroup String?
  patientAddress  String?
  patientContact  String?
  invoiceDate     String
  discount        Float     @default(0)
  tax             Float     @default(0)
  paid            Float     @default(0)
  paymentMethod   String?
  subtotal        Float?
  grandTotal      Float?
  balance         Float?
  status          String?
  createdAt       DateTime @default(now())

  items           InvoiceItem[]

  @@map("invoices")
}
```

## Schema Changes

Add three nullable columns — **no existing fields are modified**:

```prisma
  voidedAt        DateTime?
  voidedBy        String?
  voidReason      String?
```

Full model after change:

```prisma
model Invoice {
  id              Int      @id @default(autoincrement())
  invoiceNumber   String   @unique
  center          String
  billType        String
  patientName     String
  patientMrNumber String
  patientAge      String?
  patientDob      String?
  patientGender   String?
  patientBloodGroup String?
  patientAddress  String?
  patientContact  String?
  invoiceDate     String
  discount        Float     @default(0)
  tax             Float     @default(0)
  paid            Float     @default(0)
  paymentMethod   String?
  subtotal        Float?
  grandTotal      Float?
  balance         Float?
  status          String?
  voidedAt        DateTime?
  voidedBy        String?
  voidReason      String?
  createdAt       DateTime @default(now())

  items           InvoiceItem[]

  @@map("invoices")
}
```

## Migration

```bash
# Development
npx prisma migrate dev --name add-invoice-void-fields

# Production
npx prisma migrate deploy
```

Do not run `migrate dev` against production.

The migration only adds three nullable columns. The actual DDL execution behavior depends on the MySQL version, storage engine, and generated migration SQL. Test the migration on a production-like database before deploying.

## Production Safety

This change is safe for production with large datasets because:

- **No existing data is modified.** The migration only adds three nullable columns. Existing rows are untouched.
- **No deletions.** The original invoice row, all items, and all related records stay exactly as they are.
- **No breaking changes to existing queries.** All current code continues to work because the new columns are nullable and not referenced anywhere yet.
- **Single-row update on void.** When voiding, only one `UPDATE` runs against the `invoices` table. No batch operations, no table scans, no locks on other rows.
- **Voided invoices are excluded by filter.** All 7 financial queries listed above add `status: { not: 'VOID' }`. This is a simple indexed filter — it does not scan or modify existing data.
- **Reversible at the database level.** If anything goes wrong, an admin can set `status` back to `'Pending'` or `'Paid'` and clear the void fields with a single SQL update.
- **No impact on stock or payments.** The void only changes the invoice `status` and metadata. It does not touch batches, transactions, or payments.
- **Migration is additive only.** Adding nullable columns to MySQL is a metadata-only operation on most storage engines. It does not rewrite the entire table.

### What to verify before deploying to production

1. Run the migration on a staging database that has a copy of production data.
2. Confirm the generated SQL only adds columns and does not modify any existing data.
3. Verify all 7 queries listed in "Filtering Rules" have `status: { not: 'VOID' }` added.
4. Confirm the `PATCH /api/billing/[id]` void logic runs **before** the auto-status recalculation and skips it.
5. Test voiding an invoice and confirm:
   - The invoice disappears from the list and summary
   - The invoice still exists in the database with all original data
   - The void fields (`voidedAt`, `voidedBy`, `voidReason`) are populated

## How Status Currently Works

The `status` field is **auto-calculated** — not manually editable.

### On creation (`POST /api/billing`)
`app/api/billing/route.ts:102`:
```typescript
status: totals.balance > 0 ? 'Pending' : 'Paid'
```

### On update (`PATCH /api/billing/[id]`)
`app/api/billing/[id]/route.ts:106,137`:
```typescript
updateData.status = totals.balance > 0 ? 'Pending' : 'Paid'
```

This auto-calculation **must be bypassed** when voiding. The void logic must run first and then stop — no recalculation.

## API Changes

Update `PATCH /api/billing/[id]` (`app/api/billing/[id]/route.ts`):

### Void flow
```
PATCH invoice { "status": "VOID", "voidReason": "Duplicate invoice" }
  → verify invoice is not already VOID
  → verify requester has permission
  → status = "VOID"
  → voidedAt = current server time
  → voidedBy = authenticated user (from session, never from frontend)
  → voidReason = supplied reason
  → STOP
  → DO NOT recalculate status
```

### Normal update flow (unchanged)
```
PATCH invoice
  → calculate balance
  → balance > 0 → Pending
  → balance = 0 → Paid
```

### Rules
- **Do not accept `voidedBy` from the frontend.** The backend sets it from the authenticated session.
- If there is no authenticated user, **reject with 401**.
- If the invoice is already `VOID`, reject all PATCH requests with **403**.
- The void block must execute **before** the balance recalculation and must skip it entirely.

### Example request
```json
{
  "status": "VOID",
  "voidReason": "Duplicate invoice"
}
```

## voidedBy Handling

The backend sets `voidedBy` from the authenticated session. Never trust it from the browser.

### Audit trail
Voided invoices show:
- `voidedBy`: who voided it
- `voidedAt`: exact timestamp
- `voidReason`: why it was voided

### Reversibility
A void is permanent. Once `status = 'VOID'`, it cannot be changed back.

## UI Changes

1. Add a **"Void"** button in the invoice row actions (`components/billing/billing-workspace.tsx`)
2. Confirmation dialog with a required **"Reason"** text field before voiding
3. Grey out or hide voided invoices from the main list (add a "Show voided" toggle if needed)
4. Display `voidedAt`, `voidedBy`, and `voidReason` in the invoice detail view
5. **Once voided, the invoice becomes read-only** — disable all editing buttons and hide the Void button (it should only appear on non-voided invoices)

## UI Implementation Details

All changes are in `components/billing/billing-workspace.tsx`.

### 1. Add "Actions" column to invoice table

Current table header (line 763-773) has 8 columns with no Actions column:
```tsx
<th className="px-5 py-3">Invoice</th>
<th className="px-5 py-3">Center</th>
...
<th className="px-5 py-3 text-right">Balance</th>
```

Add an Actions column:
```tsx
<th className="px-5 py-3 text-right">Actions</th>
```

Current row (line 786-805) has no Actions cell. Add one:
```tsx
<td className="px-5 py-4 text-right">
  {invoice.status !== 'VOID' && (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={(e) => { e.stopPropagation(); handleVoidClick(invoice) }}
      title="Void invoice"
    >
      <Ban className="size-4" />
    </Button>
  )}
</td>
```

Update the empty state `colSpan` from 8 to 9.

### 2. Add void state and handler in BillingWorkspace

Add state near other state declarations (around line 430):
```tsx
const [voidTarget, setVoidTarget] = useState<Invoice | null>(null)
const [voidReason, setVoidReason] = useState('')
const [voiding, setVoiding] = useState(false)
```

Add handler:
```tsx
const handleVoidClick = (invoice: Invoice) => {
  setVoidTarget(invoice)
  setVoidReason('')
}

const handleVoidConfirm = async () => {
  if (!voidTarget || !voidReason.trim()) return
  setVoiding(true)
  try {
    const res = await fetch(`/api/billing/${encodeURIComponent(voidTarget.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VOID', voidReason: voidReason.trim() }),
    })
    if (!res.ok) {
      const err = await res.json()
      setErrorInvoices(err.error || 'Failed to void invoice')
      return
    }
    setVoidTarget(null)
    setVoidReason('')
    setInvoiceRefresh((current) => current + 1)
    setSummaryRefresh((current) => current + 1)
    if (viewInvoice?.id === voidTarget.id) setViewInvoice(null)
  } catch {
    setErrorInvoices('Failed to void invoice')
  } finally {
    setVoiding(false)
  }
}
```

### 3. Add Void confirmation dialog

Reuse the existing `ConfirmDialog` component (line 918). Add a reason input inside it:

```tsx
{voidTarget && (
  <ModalShell onClose={() => { setVoidTarget(null); setVoidReason('') }}>
    <div className="p-6">
      <h2 className="font-display text-lg font-semibold">Void this invoice?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This will mark invoice <strong>{voidTarget.id}</strong> as VOID. This cannot be undone.
      </p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="voidReason">Reason for voiding *</Label>
        <Input
          id="voidReason"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="e.g. Duplicate invoice"
          disabled={voiding}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setVoidTarget(null); setVoidReason('') }} disabled={voiding}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleVoidConfirm} disabled={voiding || !voidReason.trim()}>
          {voiding ? 'Voiding...' : 'Void invoice'}
        </Button>
      </div>
    </div>
  </ModalShell>
)}
```

### 4. Style voided rows

In the invoice table row (line 786-805), add visual distinction:
```tsx
<tr
  key={invoice.id}
  onClick={() => setViewInvoice(invoice)}
  className={`cursor-pointer border-b hover:bg-muted/50 ${
    invoice.status === 'VOID' ? 'bg-muted/30 opacity-60' : ''
  }`}
>
```

Optionally add a "VOID" badge in the invoice number cell:
```tsx
<div className="flex items-center gap-2">
  {invoice.status === 'VOID' && <Badge variant="destructive">VOID</Badge>}
  <span className={invoice.status === 'VOID' ? 'line-through text-muted-foreground' : 'font-medium text-primary'}>
    {invoice.id}
  </span>
</div>
```

### 5. Show void info in InvoiceModal

In `InvoiceModal` (line 1238), after the Bill title bar (line 1294-1301), add void info if applicable:

```tsx
{invoice.status === 'VOID' && (
  <div className="mt-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm">
    <p className="font-semibold text-destructive">VOIDED</p>
    <p>By: {invoice.voidedBy || 'Unknown'}</p>
    <p>On: {formatDateDisplay(invoice.voidedAt)}</p>
    {invoice.voidReason && <p>Reason: {invoice.voidReason}</p>}
  </div>
)}
```

Note: `InvoiceModal` currently receives `invoice` as `Invoice` type. The `Invoice` type in the frontend (line 61-72) does not include `voidedAt`, `voidedBy`, or `voidReason`. These fields need to be added to the frontend `Invoice` type so they are passed through from the API response.

### 6. Frontend type update

In the `Invoice` type (line 61-72), add:
```tsx
type Invoice = {
  id: string
  center: Center
  billType: string
  patient: Patient
  date: string
  items: Line[]
  discount: number
  tax: number
  paid: number
  paymentMethod: string
  status?: string
  voidedAt?: string | null
  voidedBy?: string | null
  voidReason?: string | null
}
```

### 7. Existing patterns reused

This implementation reuses existing components already in the file:
- `ConfirmDialog` / `ModalShell` — same pattern as expense deletion (line 867-875)
- `Ban` icon — already imported (line 9)
- `Badge` — already imported from UI components (used elsewhere in this file)
- `Input`, `Label` — already imported
- `Button` — already imported
- State update pattern — same as `deleteTarget` for expenses (line 430)

## Filtering Rules

Exclude `status === 'VOID'` from every query that contributes to financial totals.

### Files that need `status: { not: 'VOID' }` added:

| File | Line(s) | Query | Purpose |
|------|---------|-------|---------|
| `app/api/billing/route.ts` | 36 | `prisma.invoice.findMany()` | Invoice list |
| `app/api/billing/route.ts` | 43 | `prisma.invoice.count()` | Invoice count |
| `app/api/billing/summary/route.ts` | 12 | `prisma.invoice.aggregate()` | Summary totals |
| `app/api/billing/summary/route.ts` | 33 | `prisma.invoice.aggregate()` | Today's payments |
| `app/api/dashboard/route.ts` | 53 | `prisma.invoice.aggregate()` | Dashboard revenue |
| `app/api/dashboard/route.ts` | 103 | `prisma.invoice.findMany()` | Monthly revenue chart |
| `app/api/dashboard/route.ts` | 164 | `prisma.invoice.findMany()` | Recent billing list |

### Queries that do NOT need filtering:
- `app/api/billing/[id]/route.ts` — single invoice lookup (view/print a specific invoice)
- `app/api/billing/[id]/print/route.ts` — single invoice print

## Safety Guarantees

- Zero deletions — the original invoice row stays intact
- Zero data loss — all items and payments remain linked
- Existing behavior unchanged — all current invoices remain active
- No breaking changes — new columns are nullable and unused by existing code

## What Happens If Something Goes Wrong

1. The invoice is not deleted — it is only marked as `VOID`
2. All financial data remains intact
3. No cascading deletions or data corruption

## Implementation Order

1. Update `prisma/schema.prisma` — add `voidedAt`, `voidedBy`, `voidReason`
2. Run migration (dev, test, then production)
3. Update `PATCH /api/billing/[id]` to handle void and **skip auto-status recalculation** on void
4. Add `status: { not: 'VOID' }` to the 7 queries listed above
5. Add "Void" button and confirmation dialog with reason field in UI
6. Add `voidedAt`/`voidedBy`/`voidReason` display in invoice detail modal
7. Test with a duplicate invoice in development
