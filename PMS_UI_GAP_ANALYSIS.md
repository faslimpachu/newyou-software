# PMS UI Gap Analysis — `PMS_BUGFIX_PLAN.md`

## Summary

The backend APIs, database schema, services, and automated tests are largely complete and aligned with the plan. However, several **user-facing UI pages and dashboard widgets** required by the plan are **missing or incomplete**. This document records exactly what is implemented, what is missing, and where the gaps are.

---

## 1. Sidebar Navigation

**Current sidebar** (`components/dashboard/sidebar-nav.tsx:61-71`) — **Purchase & Inventory** group:

| # | Label | Route | Page Exists | API Exists | Status |
|---|-------|-------|-------------|------------|--------|
| 1 | Suppliers | `/suppliers` | ✅ | ✅ | OK |
| 2 | Products | `/products` | ✅ | ✅ | OK |
| 3 | Categories | `/product-categories` | ✅ | ✅ | OK |
| 4 | Purchase Invoices | `/purchase-invoices` | ✅ | ✅ | OK |
| 5 | Supplier Payments | `/supplier-payments` | ✅ | ✅ | OK |
| 6 | Inventory Adjustment | `/inventory-adjustments` | ✅ | ✅ | OK |
| 7 | Stock History | `/inventory-transactions` | ✅ | ✅ | OK |

**Verdict:** All 7 sidebar links are valid and resolve to existing pages. No broken links.

---

## 2. Page-by-Page Implementation Status

### 2.1 Suppliers (`/suppliers`) ✅
- List, create, edit, deactivate suppliers
- **Supplier ledger** is implemented inline: clicking the **Eye** icon opens a ledger panel showing:
  - Total Purchases
  - Total Payments
  - Outstanding Balance
  - Last Purchase Date
  - Recent Purchases table
  - Recent Payments table
- Opening balance is editable in the form
- **Matches plan requirement:** `outstandingBalance = openingBalance + totalPurchases - totalPayments`

### 2.2 Products (`/products`) ⚠️ Partially Complete
- List, create, edit, deactivate products
- GST validation (0–100) on create and update ✅
- Current stock protection (cannot update directly) ✅
- **Batch table is embedded at bottom of page** ✅
- **Missing:** The batch table does **NOT** show the **Supplier** column. The plan requires:
  > Columns: Batch Number, Supplier, Qty, Avg Cost, Expiry, Status
- Current columns: Product, Batch Number, Qty, Avg Cost, Expiry, Status
- **Gap:** No Supplier column in the batch table

### 2.3 Categories (`/product-categories`) ✅
- List, create, edit, deactivate categories
- Matches plan

### 2.4 Purchase Invoices (`/purchase-invoices`) ⚠️ Incomplete
- List invoices, create new invoice, view invoice detail ✅
- Invoice detail shows: Payment Mode, Due Date, Status, Notes, Items table, Subtotal, Tax, Grand Total, Paid, Balance ✅
- **CRITICAL MISSING:** The invoice creation form does **NOT** include:
  - **Batch Number** field per item
  - **Expiry Date** field per item
- The plan explicitly requires:
  > "Staff enters: Batch Number + Expiry Date"
  > "Each item must have batchNumber (required)"
  > "expiryDate is required for medicine/consumable products"
- The **backend API** (`POST /api/purchase-invoices`) validates `batchNumber` and creates batches via `receiveStock()`, but the **frontend form** does not collect these fields
- **Impact:** Users cannot create purchase invoices with batch/expiry tracking through the UI. The feature exists only at the API/test level.

### 2.5 Supplier Payments (`/supplier-payments`) ✅
- List payments, record new payment ✅
- Validates amount > 0, amount <= balance, supplier/invoice match ✅
- Atomic concurrency guard ✅
- OVERDUE status computed ✅
- Matches plan

### 2.6 Inventory Adjustment (`/inventory-adjustments`) ✅
- List adjustments, create new adjustment ✅
- Product selector with current stock display ✅
- Increase/Decrease operation toggle ✅
- Reason dropdown: ADJUSTMENT_IN, ADJUSTMENT_OUT, SALE, EXPIRED, DAMAGED, LOST, RETURN_OUT ✅
- **"Purchase Correction" is NOT present** ✅
- Batch selector (required for all operations) ✅
- Unit cost input (required for increase, optional for decrease) ✅
- Supplier selector for increases ✅
- Notes field ✅
- Validation messages ✅
- Matches plan

### 2.7 Stock History (`/inventory-transactions`) ✅
- List transactions with filters (product, type, date range) ✅
- Shows product name, type badge, quantity with sign, reference, notes, date ✅
- Empty state, loading state ✅
- Matches plan

---

## 3. Dashboard (`/`) — MISSING EXPIRY WIDGETS

**Current stat cards** (`components/dashboard/stat-cards.tsx`):
1. Today's Registrations
2. Today's Visits
3. Total Patients
4. Nutrition Patients
5. Ayurcare Patients
6. Revenue Today
7. Cash Collected
8. Follow-up Today
9. Total Suppliers
10. Low Stock Items
11. Pending Payments

**What the API already returns** (`GET /api/dashboard`) but the UI does **NOT** display:
| Field | API Returns | UI Shows | Gap |
|-------|-------------|----------|-----|
| `inventoryValue` | ✅ | ❌ | Missing stat card |
| `expiredStockValue` | ✅ | ❌ | Missing stat card |
| `expiringSoonCount` | ✅ | ❌ | Missing stat card |
| `expiringSoonValue` | ✅ | ❌ | Missing stat card |
| `totalBatches` | ✅ | ❌ | Missing stat card |

**Plan requirement (Section 6.3.3):**
> Dashboard widgets:
> - Expired Stock Value
> - Expiring Soon Count
> - Expiring Soon Value

**Plan requirement (Section 8.6):**
> - Inventory Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate
> - Expired Stock Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate for expired batches
> - Expiring Soon Count counts batches where expiryDate >= today AND < today + 30 days
> - Expiring Soon Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate for expiring soon batches
> - Total Batches counts product_batches where quantity > 0

**Type mismatch:** `use-dashboard-data.ts` `DashboardPurchaseStats` interface only has:
```ts
{ totalSuppliers, lowStockItems, todayPurchase, monthlyPurchase, pendingPayments }
```
It does **not** include `inventoryValue`, `expiredStockValue`, `expiringSoonCount`, `expiringSoonValue`, or `totalBatches`.

---

## 4. Missing Pages / Routes

| Feature | API Exists | Page Exists | Sidebar Link | Plan Requires |
|---------|-----------|-------------|--------------|---------------|
| Batches management/filtering | ✅ `GET /api/batches` | ❌ No `/batches` page | ❌ | Implied by batch table requirement |
| Expiry alerts / expiring medicines view | ❌ No dedicated API | ❌ No page | ❌ | Explicitly required in plan |

**Plan reference (Section 6.3.3):**
> Dashboard widgets: Expired Stock Value, Expiring Soon Count, Expiring Soon Value

**Plan reference (Section 8.7):**
> `GET /api/batches` lists all batches with filtering by product, supplier, expiry status

---

## 5. UI Feature Gaps Summary

| Gap | Severity | Plan Section | Description |
|-----|----------|--------------|-------------|
| Purchase invoice form missing batch number + expiry date fields | **HIGH** | 2.11.6, 6.1, 8.1 | Users cannot enter batch/expiry data through the UI |
| Dashboard missing expiry stat cards | **HIGH** | 2.11.8, 6.3.3, 8.6 | Expired stock value, expiring soon count/value not shown |
| Dashboard missing inventory value + total batches cards | **MEDIUM** | 2.11.9, 8.6 | Inventory value and total batches computed by API but not displayed |
| Products page batch table missing Supplier column | **MEDIUM** | 6.3.4, 8.7 | Batch table does not show which supplier supplied each batch |
| `DashboardPurchaseStats` type missing new fields | **MEDIUM** | 2.11.8, 2.11.9 | TypeScript interface not updated to include expiry/inventory fields |
| No dedicated `/batches` page with filters | **LOW** | 8.7 | Batch API supports filtering but no UI page exists |
| No dedicated expiry alerts page | **LOW** | 2.11.8 | No standalone view for expiring medicines |

---

## 6. What IS Complete

| Feature | Status |
|---------|--------|
| Sidebar navigation (all 7 links valid) | ✅ |
| Suppliers list + inline ledger view | ✅ |
| Products list + batch table (without supplier column) | ⚠️ |
| Product GST validation (0–100) | ✅ |
| Product currentStock protection | ✅ |
| Categories CRUD | ✅ |
| Purchase invoices list + detail view | ✅ |
| Supplier payments + OVERDUE status | ✅ |
| Inventory adjustments with batch selector + feature flag | ✅ |
| Stock history with filters | ✅ |
| Backend batch/expiry tracking (ProductBatch, BatchReceipt, FEFO) | ✅ |
| Atomic payment concurrency guard | ✅ |
| Receipt-layer FIFO allocation | ✅ |
| Database invariants enforced | ✅ |
| PMS isolation from clinical tables | ✅ |
| All automated tests pass (187 API + 128 unit/UI) | ✅ |
| Production build succeeds | ✅ |

---

## 7. Recommended Fixes

To fully satisfy the plan's UI requirements, the following should be implemented:

1. **Purchase Invoice Form** (`app/purchase-invoices/page.tsx`):
   - Add **Batch Number** input per item (required)
   - Add **Expiry Date** input per item (required for medicines)
   - Send `batchNumber` and `expiryDate` in the POST body

2. **Dashboard Stat Cards** (`components/dashboard/stat-cards.tsx` + `use-dashboard-data.ts`):
   - Add `inventoryValue`, `expiredStockValue`, `expiringSoonCount`, `expiringSoonValue`, `totalBatches` to `DashboardPurchaseStats` interface
   - Render 5 new stat cards with appropriate icons and colors
   - Update API fetch to include these fields

3. **Products Page Batch Table** (`app/products/page.tsx` `BatchTable`):
   - Add **Supplier** column showing supplier names for each batch
   - Fetch supplier data via `/api/batches` which already includes `receipts.supplier`

4. **Optional: Dedicated Batches Page**:
   - Create `app/batches/page.tsx` with filter tabs: All / Expired / Expiring Soon / OK / No Expiry
   - Add sidebar link: `{ label: 'Batches', icon: Package, href: '/batches' }`

---

## 8. Conclusion

**Backend:** Fully aligned with `PMS_BUGFIX_PLAN.md`. All services, APIs, database schema, business rules, atomic guards, FEFO logic, expiry tracking, payment concurrency, OVERDUE status, supplier ledger formula, and test coverage are implemented and passing.

**Frontend/UI:** **Partially aligned.** The core pages exist and functional, but three significant UI gaps remain:
1. **Purchase invoice creation form lacks batch number and expiry date inputs** — this is the most critical gap because it blocks the primary user journey described in the plan
2. **Dashboard does not display expiry/inventory stat cards** that the API already computes
3. **Products page batch table lacks Supplier column** required by the plan

These gaps do **not** affect backend correctness or test results, but they prevent staff from using the full batch/expiry tracking functionality through the UI as designed in the plan.
