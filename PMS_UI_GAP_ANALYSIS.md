# PMS UI Gap Analysis — `PMS_BUGFIX_PLAN.md`

## Summary

All **Purchase & Inventory** pages, forms, tables, validations, sidebar links, dashboard widgets, and dedicated batch management page are now fully implemented and aligned with the approved plan. All tests pass and the production build succeeds.

---

## 1. Sidebar Navigation — Purchase & Inventory

| # | Label | Route | Page | API | Status |
|---|-------|-------|------|-----|--------|
| 1 | Suppliers | `/suppliers` | ✅ | ✅ | OK |
| 2 | Products | `/products` | ✅ | ✅ | OK |
| 3 | Categories | `/product-categories` | ✅ | ✅ | OK |
| 4 | Purchase Invoices | `/purchase-invoices` | ✅ | ✅ | OK |
| 5 | Supplier Payments | `/supplier-payments` | ✅ | ✅ | OK |
| 6 | Inventory Adjustment | `/inventory-adjustments` | ✅ | ✅ | OK |
| 7 | Stock History | `/inventory-transactions` | ✅ | ✅ | OK |
| 8 | **Batches** | **`/batches`** | **✅** | **✅** | **OK — NEW** |

---

## 2. Page-by-Page Verification

### 2.1 Suppliers (`/suppliers`) ✅
- **Form fields:** Supplier Name (required), Contact Person, Phone, Email, Address, GST Number, Opening Balance, Status
- **Validation:** Supplier name required; backend trims and validates
- **Table columns:** Supplier Name, Contact Person, Phone, Email, GST Number, Opening Balance, Status, Actions
- **Ledger view:** Click Eye icon → inline panel with Total Purchases, Total Payments, Outstanding Balance, Last Purchase Date, Recent Purchases table, Recent Payments table
- **Restrictions:** Only ACTIVE suppliers shown in dropdowns; deactivate via DELETE sets status to INACTIVE
- **Formula:** `outstandingBalance = openingBalance + totalPurchases - totalPayments`

### 2.2 Products (`/products`) ✅
- **Form fields:** Product Name (required), Product Code (auto-generated, disabled on edit), SKU, Category (dropdown), Unit, Purchase Price, Selling Price, GST %, Minimum Stock, Maximum Stock, Current Stock (create only), Image URL, Active status
- **Validation:** Backend validates GST 0–100; code auto-generated as `PRD-YYYYMMDD-NNNN`; SKU unique
- **Table columns:** Product Name, Code, SKU, Category, Purchase Price, Selling Price, Stock, Min/Max, Status badge (Out of Stock / Low Stock / Overstock / Healthy), Actions
- **Batch table (embedded):** Product, Batch Number, **Supplier**, Qty, Avg Cost, Expiry, Status
- **Low stock warning:** Card appears when `currentStock < minimumStock`
- **Restrictions:** Cannot edit Product Code; currentStock only settable on create

### 2.3 Categories (`/product-categories`) ✅
- **Form fields:** Category Name (required), Description, Active status
- **Validation:** Name required
- **Table columns:** Name, Description, Products count, Status, Actions
- **Restrictions:** Deactivate via DELETE

### 2.4 Purchase Invoices (`/purchase-invoices`) ✅
- **Header fields:** Invoice Date (required, default today), Supplier (dropdown, required), Payment Mode (Cash/Bank/UPI/Credit), Due Date, Notes
- **Item table columns:** Product (dropdown), Quantity, Purchase Rate, **Batch Number**, **Expiry Date**, Amount, Remove button
- **Validation:** Backend validates quantity > 0, purchaseRate > 0, GST 0–100, batchNumber required, product exists
- **Totals:** Subtotal, Tax (12%), Grand Total — auto-calculated
- **Invoice detail view:** Shows Payment Mode, Due Date, Status, Notes, Items table with Batch Number + Expiry Date, Subtotal, Tax, Grand Total, Paid, Balance
- **Batch/expiry:** Each item sends `batchNumber` and `expiryDate`; backend creates `ProductBatch` and `BatchReceipt` via `receiveStock()`
- **Restrictions:** Cannot edit invoice after creation (immutable)

### 2.5 Supplier Payments (`/supplier-payments`) ✅
- **Form fields:** Supplier (dropdown, required), Invoice (optional, filtered by supplier and balance > 0), Amount (required), Payment Date (required, default today), Payment Mode (Cash/Bank/UPI/Credit), Reference, Notes
- **Validation:** Amount > 0; amount <= invoice balance (atomic guard); supplier-invoice match; backend uses `updateMany` with `balance >= amount` for concurrency
- **Table columns:** Payment Number, Date, Supplier, Invoice, Amount, Mode, Reference, Notes
- **Status transitions:** PENDING → PARTIAL → PAID; OVERDUE when `dueDate < today && balance > 0`
- **Restrictions:** Invoice must belong to selected supplier; only unpaid/partially paid invoices shown

### 2.6 Inventory Adjustment (`/inventory-adjustments`) ✅
- **Form fields:** Product (dropdown, required), Operation (Increase/Decrease), Quantity (required), Batch (dropdown, required), Unit Cost (required for Increase, hidden for Decrease), Supplier (required for Increase), Notes
- **Reason types:** ADJUSTMENT_IN, ADJUSTMENT_OUT, SALE, EXPIRED, DAMAGED, LOST, RETURN_OUT
- **Validation:** Product must exist; batch must belong to product; quantity > 0; for decreases, batch quantity >= quantity (atomic); backend uses `updateMany` with `quantity >= qty`
- **Receipt-layer FIFO:** Decreases allocated to `BatchReceipt` in `createdAt` order; atomic `updateMany` with `remainingQuantity >= qty`
- **Feature flag:** Manual SALE controlled by `ALLOW_MANUAL_SALE_ADJUSTMENT` env var
- **Purchase Correction:** NOT in reasons dropdown
- **Table columns:** Date, Product, Type badge, Quantity (+/-), Notes
- **Restrictions:** Batch required for ALL operations; unitCost required for increases

### 2.7 Stock History (`/inventory-transactions`) ✅
- **Filters:** Product (dropdown), Type (dropdown), Start Date, End Date, Clear Filters
- **Table columns:** Product, Type badge, Quantity (+/-), Reference, Notes, Date
- **Type badges:** Purchase (default), Sale (secondary), Adjustment In (outline), Adjustment Out/Return/Expired/Damaged/Lost (destructive)
- **Empty state:** "No transactions found"
- **Loading state:** "Loading..."
- **Restrictions:** Read-only; no create/edit/delete

### 2.8 Batches (`/batches`) ✅ NEW
- **Search:** By batch number, product name, or supplier
- **Filter tabs:** All, Expired, Expiring Soon, OK, No Expiry — each with live count badge
- **Table columns:** Product (with SKU), Batch Number, Supplier, Qty, Avg Cost, Expiry Date, Status badge
- **Status badges:** Expired (red/destructive), Expiring Soon (yellow/secondary), OK (green/default), No Expiry (gray/outline)
- **API:** `GET /api/batches` supports `?expiryStatus=...` and `?search=...`
- **Loading state:** "Loading batches..."
- **Error state:** Red error message
- **Empty state:** "No batches found"
- **Sidebar:** Linked under Purchase & Inventory

---

## 3. Dashboard (`/`) ✅ Aligned

**16 stat cards total:**

| # | Card | Source | Plan Requirement |
|---|------|--------|------------------|
| 1 | Today's Registrations | patients | — |
| 2 | Today's Visits | visits | — |
| 3 | Total Patients | patients | — |
| 4 | Nutrition Patients | patients | — |
| 5 | Ayurcare Patients | patients | — |
| 6 | Revenue Today | invoices | — |
| 7 | Cash Collected | invoices | — |
| 8 | Follow-up Today | followUps | — |
| 9 | Total Suppliers | suppliers (ACTIVE) | — |
| 10 | Low Stock Items | products where currentStock < minimumStock | — |
| 11 | Pending Payments | invoices where status IN (PENDING, PARTIAL, OVERDUE) | — |
| 12 | **Inventory Value** | `sum(BatchReceipt.remainingQuantity × purchaseRate)` | ✅ §2.11.9 |
| 13 | **Expired Stock Value** | `sum(BatchReceipt.remainingQuantity × purchaseRate)` where expiryDate < today | ✅ §2.11.8 |
| 14 | **Expiring Soon Count** | count where expiryDate >= today AND < today + 30 days | ✅ §2.11.8 |
| 15 | **Expiring Soon Value** | `sum(BatchReceipt.remainingQuantity × purchaseRate)` where expiryDate >= today AND < today + 30 days | ✅ §2.11.8 |
| 16 | **Total Batches** | count where quantity > 0 | ✅ §2.11.8 |

---

## 4. Backend Alignment

| Plan Section | Status | Evidence |
|--------------|--------|----------|
| 2.1 Shared InventoryService | ✅ | `lib/inventory-service.ts` — `receiveStock()`, `adjustStock()`, `consumeStock()` |
| 2.2 Payment concurrency | ✅ | `supplier-payments/route.ts` — atomic `updateMany` guard |
| 2.3 OVERDUE status | ✅ | `lib/payment-status.ts`; dashboard includes OVERDUE in pending payments |
| 2.4 Supplier ledger formula | ✅ | `suppliers/[id]/route.ts` — `openingBalance + purchases - payments` |
| 2.5 Purchase Correction removed | ✅ | Not in `validTypes` in `inventory-adjustments/route.ts` |
| 2.6 Invoice immutability | ✅ | No edit/delete workflow |
| 2.7 Receipt-layer valuation | ✅ | `getInventoryValue()` sums `remainingQuantity × purchaseRate` |
| 2.8 GST validation 0–100 | ✅ | `products/route.ts` + `[id]/route.ts` |
| 2.9 Manual SALE feature flag | ✅ | `ALLOW_MANUAL_SALE_ADJUSTMENT` guard |
| 2.11 Batch/expiry + FEFO | ✅ | `ProductBatch`, `BatchReceipt`, atomic FIFO, FEFO in `consumeStock()` |
| 2.12 Mixed responsibilities | ✅ | Addressed by shared `InventoryService` |

---

## 5. Test Coverage

| Category | Count | Status |
|----------|-------|--------|
| Unit/UI tests | 128 | ✅ Pass |
| API/integration tests | 197 | ✅ Pass |
| **Total** | **325** | **✅ Pass** |
| Production build | — | ✅ Succeeds |

**Key test files:**
- `tests/api/purchase-invoices.test.ts` — batch/expiry creation, rollback, GST, validation
- `tests/api/supplier-payments.test.ts` — OVERDUE status, concurrent payments, partial/full payment
- `tests/api/inventory-adjustments.test.ts` — increase/decrease, batch selector, SALE feature flag
- `tests/api/batches-page.test.ts` — 8 tests for batch API filters, search, receipt details
- `tests/api/products.test.ts` — GST validation, batch supplier names
- `tests/api/session-and-dashboard.test.ts` — dashboard expiry/inventory fields
- `tests/api/pms-production-journey.test.ts` — 11 full end-to-end journeys
- `tests/api/database-invariants.test.ts` — stock/batch/receipt consistency
- `tests/api/concurrency.test.ts` — concurrent payments, FEFO, same-batch purchases
- `tests/api/transaction-rollback.test.ts` — rollback on failures
- `tests/api/migration-backfill.test.ts` — OPENING batch backfill
- `tests/ui/products-page.test.tsx` — UI component tests
- `tests/ui/inventory-adjustments-page.test.tsx` — UI component tests

---

## 6. Conclusion

**All mandatory plan requirements for Purchase & Inventory are implemented and verified:**

1. ✅ All 8 sidebar links valid (including new Batches page)
2. ✅ All forms have correct fields, validation, and restrictions
3. ✅ All tables display required columns with correct data
4. ✅ Dashboard shows all required expiry/inventory widgets
5. ✅ Batch/expiry tracking end-to-end: purchase → batch → receipt → stock → FEFO → expiry
6. ✅ Payment concurrency, OVERDUE status, supplier ledger formula
7. ✅ GST validation, feature flags, atomic guards
8. ✅ 325 tests pass, production build succeeds

**No mandatory work remains.** The PMS UI fully matches the approved `PMS_BUGFIX_PLAN.md`.
