# Pharmacy Sales Module - Implementation Plan

## Objective

Add a simple pharmacy sales feature under **Purchase & Inventory** that:
- Looks up existing patients by MR number (reuses the working MR lookup from `/billing` create invoice)
- Sells medicines/products from stock
- Automatically reduces batch quantity
- Records payment + customer details
- Prints a simple receipt

**Do not touch** `/billing`. This is a separate module for product sales, not clinic services.

---

## Current State

| Module | Purpose | Limitation |
|--------|---------|-----------|
| `/billing` | Clinic services (consultation, lab, therapy) | Has working MR lookup and patient detail capture, but no product/batch fields |
| `/inventory-adjustments` | Manual stock corrections | Can decrease stock via "Sale" type, but has no payment fields, no patient info, no receipt |
| `/products` & `/batches` | Product master & batch tracking | No `sellingPrice` on batches; products have `sellingPrice` field but no UI to set it |

---

## Proposed Solution

### 1. Add `sellingPrice` to ProductBatch

- New field: `sellingPrice` (Decimal, default 0)
- Location: `app/batches/page.tsx` table
- Display: Add a new **"Selling Price"** column in the batches table
- If price is not set (0), cell shows **"-"** (click to edit inline)
- If price is set, cell shows **"₹XX.XX"** (click to edit inline)
- Editable: Yes — click cell, enter price, press Enter or click away to save
- Fallback: if batch has no sellingPrice, pharmacy sales uses `Product.sellingPrice`

### 2. New Page: `/pharmacy-sales`

**Route**: `app/pharmacy-sales/page.tsx`

**Workflow**:
1. Enter MR number (same lookup pattern as `/billing` create invoice)
2. If MR found: auto-fill customer details (name, gender, phone, age, DOB, blood group, address)
3. If MR not found: allow manual entry of customer details
4. Select product from dropdown
5. Select batch from dropdown (filtered by product)
6. Price auto-fills from selected batch's `sellingPrice`
7. Enter quantity (validates against batch stock)
8. Select payment method (Cash/UPI/Card/Bank)
9. Save

**On Save**:
- Creates `PharmacySale` record with customer details + sale details
- Creates `InventoryTransaction` with `type: SALE` (reuses existing logic)
- Reduces `ProductBatch.quantity` atomically
- Shows success message

**Important**: The `unitPrice` is **copied** into the `PharmacySale` record at the time of sale. Even if the batch's `sellingPrice` is edited later, old sales keep their original price. This preserves accurate history.

### 3. New API: `POST /api/pharmacy-sales`

- Validates stock availability
- Creates sale record
- Updates batch quantity
- Returns saved sale with receipt data

### 4. New Table: `pharmacy_sales`

```prisma
model PharmacySale {
  id              String   @id @default(uuid())
  saleNumber      String   @unique
  patientMr       String?  // optional, links to existing Patient if provided
  customerName    String   // always stored directly
  customerPhone   String?
  gender          String?
  age             String?
  dateOfBirth     String?
  bloodGroup      String?
  address         String?
  productId       String
  batchId         String
  quantity        Decimal
  unitPrice       Decimal
  totalAmount     Decimal
  paymentMethod   String
  notes           String?
  createdAt       DateTime @default(now())
}
```

### 5. Patient Lookup

- Reuse the existing `/api/patients?search=...` endpoint for MR lookup
- Same UI pattern as `/billing` create invoice (MR number input with search results dropdown)
- If MR exists: auto-fill customer details into pharmacy sale form
- If MR not found: allow manual entry of all customer fields
- On save: store customer details directly in the `PharmacySale` record — no separate customer table, no relation to `Patient`

### 6. Print Receipt

- Reuse the **existing working print pattern** from `app/purchase-invoices/page.tsx` (the iframe/A5 print flow)
- Do NOT build a new print method — follow the exact same iframe + HTML template + `print()` approach
- Simple product receipt: product name, batch, qty, amount, date, payment method, customer name/phone

### 7. Sidebar Navigation

Add to `components/dashboard/sidebar-nav.tsx` under **Purchase & Inventory**:

```
{ label: 'Pharmacy Sales', icon: Stethoscope, href: '/pharmacy-sales' }
```

---

## What This Does NOT Do

- No linkage to existing `Patient` table (stores customer data directly in sale record)
- No discounts, taxes, or complex billing
- No cart/multiple items (one product per sale for now)
- No integration with `/billing` invoices

---

## Why This Is the Simplest and Safest Approach

### What we touch
- Add `sellingPrice` to `ProductBatch` schema — new field with default `0`, existing batches unaffected
- Add 1 new table: `pharmacy_sales` — separate table, no schema changes to existing tables
- Batches page: add one read/write column — only adds UI, doesn't change existing columns or logic
- New `/pharmacy-sales` page — completely separate route, no changes to `/billing` or any other page
- Reuse existing MR lookup API (`/api/patients?search=...`) — proven working pattern from `/billing`
- Reuse existing `InventoryTransaction` logic — already tested in `/inventory-adjustments`, proven atomic stock reduction

### What we do NOT touch
- `/billing` — untouched
- `/inventory-adjustments` — untouched
- `/products` page — untouched (for now)
- `/purchase-invoices` — untouched
- Any existing API route — untouched
- Existing `Patient` table — untouched, no relations

### Risk level: Low

The only real risk is data-entry: staff might forget to set `sellingPrice` on a batch. This is not a code-breaking issue. If batch price is missing, pharmacy sales falls back to `Product.sellingPrice` or allows manual entry.

---

## Steps to Implement

1. **Schema**: Add `sellingPrice` to `ProductBatch`, add `pharmacy_sales` table
   - Run `npx prisma db push` or migration
2. **Batches page**: Add `sellingPrice` column with inline edit to table
3. **New API**: Create `app/api/pharmacy-sales/route.ts`
4. **New page**: Create `app/pharmacy-sales/page.tsx` with MR lookup (reuse `/billing` pattern)
5. **Sidebar**: Add nav item
6. **Tests**: Add API test + UI test for sale flow
7. **Print**: Add receipt modal by reusing the exact iframe/A5 print pattern from `app/purchase-invoices/page.tsx`

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Reuse `/inventory-adjustments` with type `SALE` | No payment tracking, no receipt, mixed audit trail |
| Add pharmacy fields to `/billing` | `/billing` is for services, not product stock |
| Use `purchasePrice` for sales | Purchase price ≠ selling price; different business logic |
| Create separate `pharmacy_customers` table | Unnecessary complexity; storing details directly in sale record is simpler |
| Set price at sale time only (no batch field) | Requires manual entry every time; no price history per batch |
| Separate "Add Selling Price" button/modal on batches page | Extra clicks, more code; inline edit is faster and simpler |