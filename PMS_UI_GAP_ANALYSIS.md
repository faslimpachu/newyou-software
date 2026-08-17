# PMS UI Gap Analysis — `PMS_BUGFIX_PLAN.md`

## Summary

The backend APIs, database schema, services, automated tests, and required UI pages are now **fully aligned** with the approved plan. All mandatory gaps identified in the initial audit have been closed. Only optional enhancements remain, which were explicitly deemed out-of-scope for Phase 1.

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

### 2.2 Products (`/products`) ✅
- List, create, edit, deactivate products
- GST validation (0–100) on create and update ✅
- Current stock protection (cannot update directly) ✅
- **Batch table is embedded at bottom of page** ✅
- **Supplier column added** ✅
- Batch table now shows: Product, Batch Number, **Supplier**, Qty, Avg Cost, Expiry, Status
- Matches plan requirement §6.3.4, §8.7

### 2.3 Categories (`/product-categories`) ✅
- List, create, edit, deactivate categories
- Matches plan

### 2.4 Purchase Invoices (`/purchase-invoices`) ✅
- List invoices, create new invoice, view invoice detail ✅
- **Batch Number** input per item ✅
- **Expiry Date** input per item ✅
- Invoice detail shows: Payment Mode, Due Date, Status, Notes, Items table with Batch Number + Expiry Date, Subtotal, Tax, Grand Total, Paid, Balance ✅
- Backend validates `batchNumber` and creates batches via `receiveStock()` ✅
- **Matches plan requirement §6.1, §8.1:** "Staff enters: Batch Number + Expiry Date"

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

## 3. Dashboard (`/`) ✅ Aligned

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
12. **Inventory Value** ✅
13. **Expired Stock Value** ✅
14. **Expiring Soon Count** ✅
15. **Expiring Soon Value** ✅
16. **Total Batches** ✅

**Plan requirement (Section 6.3.3):**
> Dashboard widgets:
> - Expired Stock Value ✅
> - Expiring Soon Count ✅
> - Expiring Soon Value ✅

**Plan requirement (Section 8.6):**
> - Inventory Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate ✅
> - Expired Stock Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate for expired batches ✅
> - Expiring Soon Count counts batches where expiryDate >= today AND < today + 30 days ✅
> - Expiring Soon Value sums BatchReceipt.remainingQuantity × BatchReceipt.purchaseRate for expiring soon batches ✅
> - Total Batches counts product_batches where quantity > 0 ✅

**Type alignment:** `DashboardPurchaseStats` interface updated to include all required fields:
```ts
{ totalSuppliers, lowStockItems, todayPurchase, monthlyPurchase, pendingPayments, inventoryValue, expiredStockValue, expiringSoonCount, expiringSoonValue, totalBatches }
```

---

## 4. Missing Pages / Routes

| Feature | API Exists | Page Exists | Sidebar Link | Plan Requires |
|---------|-----------|-------------|--------------|---------------|
| Batches management/filtering | ✅ `GET /api/batches` | ❌ No `/batches` page | ❌ | **Optional** — batch data already visible in Products page batch table |
| Expiry alerts / expiring medicines view | ❌ No dedicated API | ❌ No page | ❌ | **Optional** — expiry data already visible in dashboard stat cards + batch table |

**Plan reference (Section 6.3.3):**
> Dashboard widgets: Expired Stock Value, Expiring Soon Count, Expiring Soon Value — **implemented**

**Plan reference (Section 8.7):**
> `GET /api/batches` lists all batches with filtering by product, supplier, expiry status — **API exists; batch data consumed by Products page**

---

## 5. UI Feature Gaps Summary

| Gap | Severity | Status | Resolution |
|-----|----------|--------|------------|
| Purchase invoice form missing batch number + expiry date fields | HIGH | ✅ **FIXED** | Batch Number + Expiry Date inputs added per item; sent in POST body |
| Dashboard missing expiry stat cards | HIGH | ✅ **FIXED** | 5 new stat cards added: Inventory Value, Expired Stock Value, Expiring Soon Count, Expiring Soon Value, Total Batches |
| Dashboard missing inventory value + total batches cards | MEDIUM | ✅ **FIXED** | Included in new stat cards |
| Products page batch table missing Supplier column | MEDIUM | ✅ **FIXED** | Supplier column added, showing comma-separated supplier names from BatchReceipt data |
| `DashboardPurchaseStats` type missing new fields | MEDIUM | ✅ **FIXED** | Interface updated to include all dashboard purchase fields |
| No dedicated `/batches` page with filters | LOW | Optional | Not required by plan; batch data accessible via Products page + `/api/batches` API |
| No dedicated expiry alerts page | LOW | Optional | Not required by plan; expiry data accessible via dashboard + batch table |

---

## 6. What IS Complete

| Feature | Status |
|---------|--------|
| Sidebar navigation (all 7 links valid) | ✅ |
| Suppliers list + inline ledger view | ✅ |
| Products list + batch table with Supplier column | ✅ |
| Product GST validation (0–100) | ✅ |
| Product currentStock protection | ✅ |
| Categories CRUD | ✅ |
| Purchase invoices with batch/expiry per item | ✅ |
| Supplier payments + OVERDUE status | ✅ |
| Inventory adjustments with batch selector + feature flag | ✅ |
| Stock history with filters | ✅ |
| Dashboard with expiry/inventory widgets | ✅ |
| Backend batch/expiry tracking (ProductBatch, BatchReceipt, FEFO) | ✅ |
| Atomic payment concurrency guard | ✅ |
| Receipt-layer FIFO allocation | ✅ |
| Database invariants enforced | ✅ |
| PMS isolation from clinical tables | ✅ |
| All automated tests pass (189 API + 128 unit/UI) | ✅ |
| Production build succeeds | ✅ |

---

## 7. Remaining Optional Enhancements (Not Required by Plan)

These were explicitly assessed as **not mandatory** for Phase 1:

1. **Dedicated `/batches` page** — A standalone batch management page with filter tabs (All / Expired / Expiring Soon / OK / No Expiry). Current batch visibility via Products page is sufficient per the approved business flow.
2. **Dedicated expiry alerts page** — A separate page listing only expiring medicines. Current dashboard widgets + batch table already provide this information.

If needed later, these can be added without any backend changes.

---

## 8. Conclusion

**Backend:** Fully aligned with `PMS_BUGFIX_PLAN.md`. All services, APIs, database schema, business rules, atomic guards, FEFO logic, expiry tracking, payment concurrency, OVERDUE status, supplier ledger formula, and test coverage are implemented and passing.

**Frontend/UI:** **Fully aligned.** All mandatory plan requirements are implemented:
1. ✅ Purchase Invoice form collects Batch Number + Expiry Date per item
2. ✅ Dashboard displays expiry/inventory stat cards
3. ✅ Products page batch table shows Supplier column

**Test results:**
- 128 unit/UI tests pass
- 189 API/integration tests pass
- `npm run build` succeeds cleanly

**No further mandatory work remains.** The PMS UI now matches the approved plan.
