# PMS Real-World User Flow & Workflow Guide

## Audience
Pharmacy/store staff, nurses, and admins using the PMS module inside the New You Center for Weight Management system.

## Personas
- **Pharmacy Staff** — primary user; manages products, purchases, batches, adjustments, and stock history.
- **Admin / Accounts** — records supplier payments and reviews dashboard/billing impact.
- **Doctor / Clinician** — does not use PMS directly; clinical workflows remain isolated.

---

## 1. High-Level Navigation Map

```
Dashboard (/)
 ├── Purchase & Inventory
 │    ├── Suppliers (/suppliers)
 │    ├── Products (/products)
 │    ├── Categories (/product-categories)
 │    ├── Purchase Invoices (/purchase-invoices)
 │    ├── Supplier Payments (/supplier-payments)
 │    ├── Inventory Adjustment (/inventory-adjustments)
 │    ├── Stock History (/inventory-transactions)
 │    └── Batches (/batches)
 ├── Clinical
 │    ├── Patients (/patients)
 │    ├── Visits (/visits)
 │    └── Billing (/billing)
 └── Operations
      └── Follow-ups (/follow-ups)
```

**Rule:** Clinical pages never touch PMS inventory APIs. PMS pages never touch patient/visit/prescription APIs.

---

## 2. Daily Workflows

### 2.1 Morning Opening / Review
**Goal:** Identify expiring stock, low stock, and pending payments before the day starts.

**Steps:**
1. Open **Dashboard** (`/`)
2. Check:
   - **Expiring Soon Count** — batches expiring within 30 days
   - **Expired Stock Value** — stock already expired and needing disposal
   - **Low Stock Items** — products below minimum stock
   - **Pending Payments** — supplier invoices still unpaid or overdue
3. If needed, open **Batches** (`/batches`) and filter by **Expiring Soon** or **Expired** to see exact batches and suppliers.

---

### 2.2 Creating a Supplier (First-Time Setup)
**Goal:** Register a new medicine supplier before purchasing.

**Path:** `/suppliers`

**Steps:**
1. Click **Create Supplier**
2. Fill:
   - **Supplier Name** (required)
   - Contact Person, Phone, Email, Address, GST Number
   - **Opening Balance** — previous ledger balance carried forward
   - Status: **ACTIVE**
3. Click **Create Supplier**
4. Supplier appears in the list and can be selected in Purchase Invoices and Supplier Payments.

**Validation:**
- Supplier name is required.
- Opening balance accepts any number; defaults to 0.
- Deactivating a supplier sets status to INACTIVE but preserves history.

---

### 2.3 Creating a Product Category
**Goal:** Group medicines/products for filtering and reporting.

**Path:** `/product-categories`

**Steps:**
1. Click **Create Category**
2. Fill:
   - **Category Name** (required) — e.g., "Antibiotics", "Vitamins", "Equipment"
   - Description
   - Status: Active
3. Click **Create Category**

---

### 2.4 Creating a Product
**Goal:** Add a new medicine/consumable to inventory.

**Path:** `/products`

**Steps:**
1. Click **Create Product**
2. Fill:
   - **Product Name** (required)
   - **Product Code** — auto-generated as `PRD-YYYYMMDD-NNNN`; cannot be edited on update
   - SKU
   - Category
   - Unit — e.g., `pcs`, `strip`, `box`
   - **Purchase Price**
   - **Selling Price**
   - **GST %** — must be between 0 and 100
   - **Minimum Stock** / **Maximum Stock**
   - **Current Stock** — only on create; after that, stock changes only via purchases/adjustments
   - Image URL (optional)
   - Active
3. Click **Create Product**

**Validation:**
- GST % rejected if > 100 or < 0.
- Product Code is auto-generated and immutable after creation.
- Current Stock is write-once; subsequent changes happen through batch-aware operations.

---

### 2.5 Creating a Purchase Invoice (Main Purchase Flow)
**Goal:** Record a new stock purchase from a supplier with batch numbers and expiry dates.

**Path:** `/purchase-invoices`

**Steps:**
1. Click **New Purchase Invoice**
2. Fill **Invoice Header:**
   - **Invoice Date** — defaults to today
   - **Supplier** (required) — select from active suppliers
   - **Payment Mode** — Cash / Bank / UPI / Credit
   - **Due Date** — optional
   - Notes
3. Fill **Items table:**
   - **Product** — select medicine/product
   - **Quantity** — must be > 0
   - **Purchase Rate** — must be > 0
   - **Batch Number** — e.g., `PCM001`
   - **Expiry Date** — required for medicines/consumables; can be left empty for non-perishables
4. Click **Add Item** for multiple products
5. Review totals:
   - Subtotal = Σ(qty × rate)
   - Tax = Σ(lineAmount × product GST%)
   - Grand Total = Subtotal + Tax
6. Click **Create Purchase Invoice**

**What happens in the backend:**
- Invoice saved with status `PENDING`
- For each item:
  - `PurchaseInvoiceItem` created with `batchNumber` and `expiryDate`
  - `receiveStock()` creates or updates `ProductBatch`
  - If same `productId + batchNumber` with same expiry exists → batch quantity increases and new `BatchReceipt` is created
  - If same `productId + batchNumber` with different expiry → rejected with error
  - `Product.currentStock` increases
  - `InventoryTransaction` created with type `PURCHASE` and `batchId`
- All in one atomic transaction

**Validation:**
- Quantity > 0 and Purchase Rate > 0 required per item
- GST % must be 0–100 per product
- Batch Number required
- Product must exist
- Duplicate batch + different expiry is rejected

**Viewing the invoice:**
- Click the **Eye** icon on the invoice row
- See: Payment Mode, Due Date, Status, Notes
- Items table shows: Product, Quantity, Purchase Rate, **Batch Number**, **Expiry Date**, Amount
- Financial summary: Subtotal, Tax, Grand Total, Paid, Balance

---

### 2.6 Recording a Supplier Payment
**Goal:** Record full or partial payment against a purchase invoice.

**Path:** `/supplier-payments`

**Steps:**
1. Click **Record Payment**
2. Fill:
   - **Supplier** (required)
   - **Invoice** (optional) — shows only unpaid/partially paid invoices for the selected supplier with outstanding balance
   - **Amount** — must be > 0 and ≤ outstanding balance
   - **Payment Date** — defaults to today
   - **Payment Mode** — Cash / Bank / UPI / Credit
   - Reference (optional)
   - Notes (optional)
3. Click **Record Payment**

**What happens:**
- Atomic `updateMany` guard ensures amount does not exceed balance
- `SupplierPayment` created
- Invoice `paid` increases, `balance` decreases
- Status recomputed:
  - `balance <= 0` → `PAID`
  - `balance > 0 && dueDate < today` → `OVERDUE`
  - `paid > 0 && balance > 0` → `PARTIAL`
  - otherwise → `PENDING`
- Dashboard pending payments update

**Validation:**
- Amount must be > 0
- Amount cannot exceed invoice balance
- Invoice must belong to selected supplier
- Concurrent payments are safe: second payment fails if balance insufficient

---

### 2.7 Creating an Inventory Adjustment
**Goal:** Manually correct stock after physical count, write off expired/damaged stock, or record returns.

**Path:** `/inventory-adjustments`

**Steps:**
1. Click **New Adjustment**
2. Fill:
   - **Product** (required) — shows current stock
   - **Operation** (required):
     - **Increase** → ADJUSTMENT_IN
     - **Decrease** → ADJUSTMENT_OUT / SALE / EXPIRED / DAMAGED / LOST / RETURN_OUT
   - **Quantity** (required) — must be > 0
   - **Batch** (required) — dropdown shows batches with quantities and expiry dates for the selected product
   - **Unit Cost** (required for Increase, hidden for Decrease)
   - **Supplier** (required for Increase)
   - Notes (optional)
3. Click **Create Adjustment**

**What happens for Increase:**
- New `BatchReceipt` created or existing receipt updated with `remainingQuantity += qty` and `purchaseRate = unitCost`
- `ProductBatch.quantity` increases
- `Product.currentStock` increases
- `InventoryTransaction` created with type `ADJUSTMENT_IN`

**What happens for Decrease:**
- Atomic check: batch quantity >= requested quantity
- Reduction allocated across `BatchReceipt` records in **FIFO order by createdAt**
- Each receipt reduced atomically with `updateMany WHERE remainingQuantity >= qty`
- `ProductBatch.quantity` decreases
- `Product.currentStock` decreases
- `InventoryTransaction` created with selected type

**Validation:**
- Batch must belong to selected product
- Quantity > 0
- For decreases: batch must have sufficient stock
- "Purchase Correction" is NOT available
- Manual SALE controlled by `ALLOW_MANUAL_SALE_ADJUSTMENT` feature flag

---

### 2.8 Reviewing Stock History
**Goal:** Trace every stock movement with batch-level detail.

**Path:** `/inventory-transactions`

**Steps:**
1. Use filters to narrow results:
   - **Product** — select specific product
   - **Type** — Purchase / Sale / Adjustment In / Adjustment Out / Return / Expired / Damaged / Lost
   - **Start Date** / **End Date**
   - Click **Clear Filters** to reset
2. Review table:
   - Product name + SKU
   - Type badge with color
   - Quantity with sign (+ for increases, - for decreases)
   - Reference
   - Notes
   - Date/time

**Note:** Every purchase, adjustment, and consumption creates a transaction record with `batchId` when applicable.

---

### 2.9 Monitoring Batches and Expiry
**Goal:** See all batches at a glance, filter by expiry status, and take action.

**Path:** `/batches`

**Steps:**
1. Browse **All Batches** table by default
2. Use **filter tabs**:
   - **All** — every batch
   - **Expired** — batches past expiry date
   - **Expiring Soon** — batches expiring within 30 days
   - **OK** — batches with expiry > 30 days
   - **No Expiry** — batches without expiry date
3. Use **search** to find by batch number, product name, or supplier
4. Review columns:
   - Product + SKU
   - Batch Number
   - Supplier (comma-separated if multiple)
   - Qty
   - Avg Cost (weighted average from receipt layers)
   - Expiry Date
   - Status badge

**Action triggers:**
- **Expired** batches → create EXPIRED adjustment to write off
- **Expiring Soon** batches → plan to consume first via FEFO
- **No Expiry** batches → safe for long-term storage

---

### 2.10 Writing Off Expired Stock
**Goal:** Remove expired batches from sellable stock.

**Path:** `/inventory-adjustments`

**Steps:**
1. Click **New Adjustment**
2. Select the expired product
3. Operation: **Decrease**
4. Type: **EXPIRED**
5. Select the expired batch
6. Enter quantity matching batch quantity
7. Add notes: "Write off expired batch"
8. Click **Create Adjustment**

**Result:**
- Batch quantity → 0
- `Product.currentStock` decreases
- `BatchReceipt.remainingQuantity` reduced to 0 via FIFO
- `InventoryTransaction` created with type `EXPIRED`
- Expired batch no longer appears in FEFO consumption

---

### 2.11 Full Supplier Ledger Review
**Goal:** See complete financial relationship with a supplier.

**Path:** `/suppliers`

**Steps:**
1. Find the supplier in the list
2. Click the **Eye** icon
3. Review inline ledger panel:
   - Total Purchases
   - Total Payments
   - Outstanding Balance = `openingBalance + totalPurchases - totalPayments`
   - Last Purchase Date
   - Recent Purchases table
   - Recent Payments table

---

## 3. Real-World Scenario: Monday Morning Stock Entry

**Context:** A new shipment of medicines arrived over the weekend. Staff must enter it into the system.

### Step 1: Verify supplier exists
- Go to **Suppliers** (`/suppliers`)
- If "Medico Pharma" is not in the list → **Create Supplier**

### Step 2: Verify products exist
- Go to **Products** (`/products`)
- If "Amoxicillin 250mg" is not in the list → **Create Product**
  - GST % = 12
  - Minimum Stock = 20
  - Maximum Stock = 200

### Step 3: Create purchase invoice
- Go to **Purchase Invoices** (`/purchase-invoices`)
- Click **New Purchase Invoice**
- Header:
  - Date: today
  - Supplier: Medico Pharma
  - Payment Mode: Credit
  - Due Date: 30 days from today
- Items:
  - Product: Amoxicillin 250mg
  - Quantity: 100
  - Purchase Rate: ₹10
  - Batch Number: `AMX-2026-08`
  - Expiry Date: `2027-03-31`
- Click **Create Purchase Invoice**

### Step 4: Verify stock updated
- Go to **Products** (`/products`)
- Find Amoxicillin 250mg
- Stock should show +100
- Scroll to **All Batches** table:
  - Batch `AMX-2026-08` appears with Qty = 100, Supplier = Medico Pharma, Expiry = 31-Mar-2027, Status = OK

### Step 5: Check dashboard
- Go to **Dashboard** (`/`)
- **Total Suppliers** updated
- **Inventory Value** increased by 100 × ₹10 = ₹1,000
- **Total Batches** increased by 1
- **Pending Payments** shows the new invoice balance

### Step 6: Batch monitoring
- Go to **Batches** (`/batches`)
- Filter by **Expiring Soon** — verify nothing alarming
- Search for `AMX-2026-08` — confirm batch details

---

## 4. Real-World Scenario: Physical Stock Correction

**Context:** End-of-month physical count shows discrepancies.

### Step 1: Identify discrepancies
- Compare physical count with system stock in **Products** (`/products`)
- Note product name and actual quantity

### Step 2: Create adjustment
- Go to **Inventory Adjustment** (`/inventory-adjustments`)
- Click **New Adjustment**
- Select product
- If physical count > system: **Operation = Increase**, reason = `ADJUSTMENT_IN`
- If physical count < system: **Operation = Decrease**, reason = `ADJUSTMENT_OUT` or `DAMAGED`/`LOST`
- Select the correct batch
- Enter quantity difference
- For increase: enter Unit Cost and select Supplier
- Add notes explaining the correction
- Click **Create Adjustment**

### Step 3: Verify
- Refresh **Products** page — stock updated
- Refresh **Stock History** — new transaction visible with batch info
- Refresh **Dashboard** — inventory value and batch counts updated

---

## 5. Real-World Scenario: Expired Medicine Write-Off

**Context:** Batch of Paracetamol expired last week.

### Step 1: Identify expired batch
- Go to **Batches** (`/batches`)
- Filter by **Expired**
- Note batch number, product, quantity

### Step 2: Write off
- Go to **Inventory Adjustment** (`/inventory-adjustments`)
- Click **New Adjustment**
- Product: Paracetamol 500mg
- Operation: Decrease
- Type: EXPIRED
- Batch: select expired batch
- Quantity: match batch quantity
- Notes: "Expired on 15-Aug-2026 — write off"
- Click **Create Adjustment**

### Step 3: Verify
- Batch quantity → 0 in **Batches**
- Product stock decreased in **Products**
- EXPIRED transaction visible in **Stock History**
- **Expired Stock Value** on Dashboard reduced

---

## 6. Real-World Scenario: Supplier Payment

**Context:** Paying Medico Pharma for last month's invoices.

### Step 1: Check outstanding
- Go to **Dashboard** — see **Pending Payments** total
- Go to **Suppliers** → find Medico Pharma → click Eye → see outstanding balance

### Step 2: Record payment
- Go to **Supplier Payments** (`/supplier-payments`)
- Click **Record Payment**
- Supplier: Medico Pharma
- Invoice: select specific invoice
- Amount: enter payment amount
- Payment Date: today
- Payment Mode: Bank
- Notes: "August payment"
- Click **Record Payment**

### Step 3: Verify
- Invoice status updates to `PAID` or `PARTIAL`
- **Pending Payments** on Dashboard decreases
- Supplier ledger shows new payment

---

## 7. Real-World Scenario: FEFO Consumption (Pharmacy Issuance)

**Context:** Issuing medicines to patients (future PMS Product Billing module).

### Current state:
- `consumeStock()` API exists but no manual UI page yet
- Staff can see FEFO order in **Batches** page
- When PMS Product Billing module is added, it will call `consumeStock()` automatically

### Manual workaround (if needed before billing module):
- Use **Inventory Adjustment** with type `SALE` or `ADJUSTMENT_OUT`
- Select the earliest-expiring batch manually
- Backend will allocate to oldest `BatchReceipt` within that batch

---

## 8. Data Flow Diagrams

### 8.1 Purchase Flow
```
Staff
  ↓
Purchase Invoice Form (/purchase-invoices)
  ↓
POST /api/purchase-invoices
  ↓
receiveStock() [lib/inventory-service.ts]
  ↓
┌─────────────────────────────────────┐
│ ProductBatch create/update           │
│ BatchReceipt create                  │
│ Product.currentStock += qty          │
│ InventoryTransaction (PURCHASE)      │
└─────────────────────────────────────┘
  ↓
Dashboard updates
Batches page shows new batch
Products page batch table updates
```

### 8.2 Payment Flow
```
Staff
  ↓
Supplier Payment Form (/supplier-payments)
  ↓
POST /api/supplier-payments
  ↓
Atomic updateMany guard: WHERE id = invoiceId AND balance >= amount
  ↓
SupplierPayment created
PurchaseInvoice.paid += amount
PurchaseInvoice.balance -= amount
Status recomputed: PENDING / PARTIAL / PAID / OVERDUE
  ↓
Dashboard pending payments update
Supplier ledger updates
```

### 8.3 Adjustment Flow
```
Staff
  ↓
Inventory Adjustment Form (/inventory-adjustments)
  ↓
POST /api/inventory-adjustments
  ↓
adjustStock() [lib/inventory-service.ts]
  ↓
Increase:
  Create/update BatchReceipt (remainingQuantity += qty, purchaseRate = unitCost)
  ProductBatch.quantity += qty
  Product.currentStock += qty

Decrease:
  Atomic updateMany WHERE batchId = X AND quantity >= qty
  Allocate to BatchReceipt FIFO by createdAt
  ProductBatch.quantity -= qty
  Product.currentStock -= qty
  ↓
InventoryTransaction created
Stock History updates
Products page refreshes
```

### 8.4 FEFO Consumption Flow
```
Future PMS Product Billing Module
  ↓
POST /api/inventory/consume
  ↓
consumeStock() [lib/inventory-service.ts]
  ↓
Query active batches: quantity > 0 AND (expiryDate IS NULL OR expiryDate >= today)
Sort by expiryDate ASC, createdAt ASC
  ↓
For each batch needed:
  Consume from BatchReceipt FIFO by createdAt
  Update BatchReceipt.remainingQuantity
  Update ProductBatch.quantity
  ↓
Update Product.currentStock
Create InventoryTransaction per batch (type = SALE)
  ↓
Return transactions[]
```

---

## 9. Restricted Actions and Rules

| Action | Who | Rule |
|--------|-----|------|
| Create purchase invoice | Pharmacy Staff | Must select supplier; batch + expiry required per item |
| Edit purchase invoice | Nobody | Invoices are immutable after creation |
| Record payment | Admin / Accounts | Amount must not exceed balance; invoice must match supplier |
| Manual SALE adjustment | Pharmacy Staff | Blocked unless `ALLOW_MANUAL_SALE_ADJUSTMENT !== 'false'` |
| Write off expired stock | Pharmacy Staff | Use EXPIRED adjustment type with specific batch |
| Decrease stock without batch | Nobody | `adjustStock()` requires batchId for all decreases |
| Increase stock without batch | Nobody | `adjustStock()` requires batchId for all increases |
| Consume expired batch | Nobody | `consumeStock()` excludes batches with `expiryDate < today` |
| Access PMS APIs without auth | Nobody | All PMS APIs require valid session cookie |
| Create patient from PMS | Nobody | PMS has no foreign keys to Patient, Invoice, Prescription, Visit |
| Auto-create SALE from clinical invoice | Nobody | Clinical billing never creates PMS inventory transactions |

---

## 10. Quick Reference Table

| Task | Page | Key Fields | Result |
|------|------|------------|--------|
| Add supplier | `/suppliers` | Name, openingBalance, GST, status | Supplier available in dropdowns |
| Add category | `/product-categories` | Name, description | Product category filterable |
| Add product | `/products` | Name, code (auto), category, prices, GST%, stock | Product purchasable |
| New purchase | `/purchase-invoices` | Supplier, items with product/qty/rate/batch/expiry | Stock + batch created |
| Record payment | `/supplier-payments` | Supplier, invoice, amount, date, mode | Invoice status updates |
| Adjust stock | `/inventory-adjustments` | Product, type, qty, batch, unitCost, supplier | Stock + transaction updated |
| View history | `/inventory-transactions` | Product, type, date range | Filtered transactions |
| Monitor expiry | `/batches` | Search, status tabs | Filtered batch list |
| Write off expired | `/inventory-adjustments` | Product, EXPIRED, batch, qty | Batch zeroed, stock reduced |
| Check dashboard | `/dashboard` | — | Stats, alerts, pending payments |

---

## 11. Tips for Staff

1. **Always enter batch numbers** during purchase — this enables FEFO and traceability.
2. **Enter expiry dates** for medicines — the system uses them for expiry badges and FEFO sorting.
3. **Use the Batches page** (`/batches`) every morning to review expiring stock.
4. **Do not use "Purchase Correction"** — it is intentionally removed. If a purchase is wrong, the invoice is immutable; contact admin for a controlled reversal in a future workflow.
5. **For decreases, always select a batch** — batch-less decreases are not allowed.
6. **For increases, always enter unit cost** — this becomes the purchase rate for valuation.
7. **Check the dashboard** before creating purchase invoices to see existing pending payments and low-stock alerts.
8. **Supplier ledger** is accessible from the Suppliers page — no separate page needed.
9. **Stock History** shows every movement with batch info — use it to investigate discrepancies.
10. **Clinical and PMS are separate** — patient registration, visits, prescriptions, and clinical billing do not affect PMS stock.

---

## 12. Support and Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| "Insufficient stock" on adjustment | Selected batch quantity too low | Select correct batch or reduce quantity |
| "Payment amount exceeds balance" | Payment > invoice balance | Enter amount ≤ outstanding balance |
| "Batch number already exists with different expiry" | Same batch reused with new expiry | Use existing batch number with same expiry, or create new batch |
| "GST percent must be between 0 and 100" | Product GST out of range | Update product GST to 0–100 before purchase |
| Expired batch still showing in stock | Not yet written off | Create EXPIRED adjustment for that batch |
| Dashboard stats not updating | Browser cache / polling delay | Refresh page; stats poll every 3 seconds |
| Cannot find supplier in payment form | Supplier is INACTIVE | Reactivate supplier or use active supplier |
