# Purchase Management System (PMS) — Simplified Implementation Plan

## Goal

Add a **minimal, safe Purchase Management + Inventory Adjustment module** to the existing clinic dashboard.

**Rules:**
- Only NEW tables are added
- Zero changes to existing models (`Patient`, `Invoice`, `Prescription`, etc.)
- Stock tracked on `Product.currentStock` + `InventoryTransaction` for audit trail
- No complex business logic (GRN, batches, returns, stock movements)
- Follows existing code patterns exactly

---

## What We Are Building

A practical purchase system with 7 pages:

```
Suppliers → Products → Purchase Invoices → Stock increases automatically
                                        → Payment history tracked
                                        → Supplier ledger visible
                                        → Inventory Adjustment for manual corrections
                                        → Inventory History (audit trail)
```

No GRN, no PO, no batches, no returns. Just: **Buy products → stock increases → payments tracked → manual adjustments when needed.**

Features:
- Product Code auto-generated (`PRD-YYYYMMDD-001`) alongside SKU
- Min/Max stock levels for better inventory control
- Stock Value calculated on the fly (`Current Stock × Purchase Price`)
- Dashboard shows Today's Purchase, Monthly Purchase, Inventory Value, Low Stock, Pending Payments, Products, Suppliers

---

## Prisma Schema Changes

Add these models to `prisma/schema.prisma`:

```prisma
// --- Enums ---
enum TransactionType {
  PURCHASE
  SALE
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  RETURN_OUT
  EXPIRED
  DAMAGED
  LOST
}

enum PaymentMode {
  CASH
  BANK
  UPI
  CREDIT
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}

enum SupplierStatus {
  ACTIVE
  INACTIVE
}

enum ReferenceType {
  PURCHASE_INVOICE
  SALE_INVOICE
  ADJUSTMENT
  PRESCRIPTION
  RETURN
}

// --- Product Category ---
model ProductCategory {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  products    Product[]

  @@map("product_categories")
}

// --- Supplier ---
model Supplier {
  id              String        @id @default(uuid())
  supplierName    String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  gstNumber       String?
  openingBalance  Decimal       @default(0)
  status          SupplierStatus @default(ACTIVE)
  createdAt       DateTime      @default(now())

  purchaseInvoices  PurchaseInvoice[]
  payments          SupplierPayment[]

  @@map("suppliers")
}

// --- Product ---
model Product {
  id            String   @id @default(uuid())
  name          String
  code          String   @unique
  sku           String?  @unique
  categoryId    String?
  unit          String   @default("pcs")
  purchasePrice Decimal
  sellingPrice  Decimal
  gstPercent    Decimal  @default(0)
  minimumStock  Int      @default(10)
  maximumStock  Int      @default(200)
  currentStock  Decimal  @default(0)
  imageUrl      String?
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  category        ProductCategory?       @relation(fields: [categoryId], references: [id])
  invoiceItems    PurchaseInvoiceItem[]
  transactions    InventoryTransaction[]

  @@map("products")
}

// --- Purchase Invoice ---
model PurchaseInvoice {
  id            String         @id @default(uuid())
  invoiceNumber String         @unique
  invoiceDate   DateTime
  supplierId    String
  paymentMode   PaymentMode?
  dueDate       DateTime?
  notes         String?
  subtotal      Decimal
  tax           Decimal
  grandTotal    Decimal
  paid          Decimal        @default(0)
  balance       Decimal
  status        PaymentStatus  @default(PENDING)
  createdAt     DateTime       @default(now())

  supplier       Supplier           @relation(fields: [supplierId], references: [id])
  items          PurchaseInvoiceItem[]
  payments       SupplierPayment[]

  @@map("purchase_invoices")
}

model PurchaseInvoiceItem {
  id           String @id @default(uuid())
  invoiceId    String
  productId    String
  quantity     Decimal
  purchaseRate Decimal
  amount       Decimal

  invoice PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product Product        @relation(fields: [productId], references: [id])

  @@map("purchase_invoice_items")
}

// --- Supplier Payment ---
model SupplierPayment {
  id            String         @id @default(uuid())
  paymentNumber String         @unique
  supplierId    String
  invoiceId     String?
  amount        Decimal
  paymentDate   DateTime
  paymentMode   PaymentMode?
  reference     String?
  notes         String?
  createdAt     DateTime       @default(now())

  supplier   Supplier        @relation(fields: [supplierId], references: [id])
  invoice    PurchaseInvoice? @relation(fields: [invoiceId], references: [id])

  @@map("supplier_payments")
}

// --- Inventory Transaction (Stock Audit Trail) ---
model InventoryTransaction {
  id           String            @id @default(uuid())
  productId    String
  type         TransactionType
  quantity     Decimal
  referenceType ReferenceType?
  referenceId  String?
  notes        String?
  createdAt    DateTime          @default(now())

  product Product @relation(fields: [productId], references: [id])

  @@map("inventory_transactions")
  @@index([productId, type])
  @@index([referenceType, referenceId])
}

// --- Generic Sequence ---
model Sequence {
  id         String   @id
  name       String   @unique
  lastNumber Int      @default(0)
  updatedAt  DateTime @default(now())

  @@map("sequences")
}
```

---

## Database Migration

```bash
npx prisma migrate dev --name add-purchase-management
npx prisma generate
```

Verify in Prisma Studio:
```bash
npx prisma studio
```

---

## Seed Data

### Seed: Sequences

```ts
const sequences = [
  { id: 'PURCHASE_INVOICE', name: 'Purchase Invoice' },
  { id: 'SUPPLIER_PAYMENT', name: 'Supplier Payment' },
  { id: 'SALE_INVOICE', name: 'Sale Invoice' },
  { id: 'PRODUCT', name: 'Product' },
]

for (const seq of sequences) {
  await prisma.sequence.upsert({
    where: { id: seq.id },
    update: {},
    create: { id: seq.id, name: seq.name, lastNumber: 0 },
  })
}
```

### Seed: Product Categories

```ts
const categories = [
  'Medicines',
  'Supplements',
  'Herbal Products',
  'Equipment',
  'Consumables',
  'Other',
]

for (const name of categories) {
  await prisma.productCategory.upsert({
    where: { name },
    update: {},
    create: { name, description: name },
  })
}
```

---

## Numbering Format

| Document | Sequence Key | Format |
|----------|--------------|--------|
| Purchase Invoice | `PURCHASE_INVOICE` | `PINV-YYYYMMDD-001` |
| Supplier Payment | `SUPPLIER_PAYMENT` | `PPAY-YYYYMMDD-001` |
| Sale Invoice | `SALE_INVOICE` | `SINV-YYYYMMDD-001` |
| Product | `PRODUCT` | `PRD-YYYYMMDD-001` |

Example: `PINV-20260802-0001`

Product Code Example: `PRD-20260802-0001`

---

## API Routes

### 1. Sequences (Internal Helper)

**File:** `app/api/internal/sequences/route.ts` (or use a lib helper)

Helper function to generate next number:
```ts
async function getNextSequence(name: string): Promise<string> {
  const seq = await prisma.sequence.update({
    where: { id: name },
    data: { lastNumber: { increment: 1 } },
  })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const num = String(seq.lastNumber).padStart(4, '0')
  return `${name.slice(0, 4).toUpperCase()}-${date}-${num}`
}
```

---

### 2. Product Categories

**File:** `app/api/product-categories/route.ts`

```
GET    /api/product-categories          - list all categories
POST   /api/product-categories          - create category
PATCH  /api/product-categories/[id]     - update category
DELETE /api/product-categories/[id]     - deactivate category
```

---

### 3. Suppliers

**File:** `app/api/suppliers/route.ts`

```
GET    /api/suppliers                   - list all suppliers (search, filter)
POST   /api/suppliers                   - create supplier
GET    /api/suppliers/[id]              - get one supplier + ledger
PATCH  /api/suppliers/[id]              - update supplier
DELETE /api/suppliers/[id]              - deactivate supplier
GET    /api/suppliers/[id]/payments     - payment history
GET    /api/suppliers/[id]/purchases    - purchase history
```

**Supplier Ledger fields (in GET /api/suppliers/[id]):**
```json
{
  "supplier": { ... },
  "totalPurchases": 324000,
  "totalPayments": 279000,
  "outstandingBalance": 45000,
  "lastPurchaseDate": "2026-07-12T00:00:00.000Z",
  "recentPurchases": [...],
  "recentPayments": [...]
}
```

---

### 4. Products

**File:** `app/api/products/route.ts`

```
GET    /api/products                    - list all products (search, filter by category)
POST   /api/products                    - create product (auto-generates code)
GET    /api/products/[id]               - get one product
PATCH  /api/products/[id]               - update product
DELETE /api/products/[id]               - deactivate product
GET    /api/products/low-stock          - products below minimumStock
```

**Logic on creation (POST):**
1. Auto-generate product code from `Sequence` (key: `PRODUCT`) → `PRD-YYYYMMDD-001`
2. Create `Product` record with generated code

---

### 5. Purchase Invoices

**File:** `app/api/purchase-invoices/route.ts`

```
GET    /api/purchase-invoices           - list all purchase invoices
POST   /api/purchase-invoices           - create purchase invoice
GET    /api/purchase-invoices/[id]      - get one purchase invoice
```

**Logic on creation:**
1. Auto-generate invoice number from `Sequence` (key: `PURCHASE_INVOICE`)
2. Wrap the following in `prisma.$transaction(async (tx) => { ... })`:
   - Create `PurchaseInvoice` record
   - Create `PurchaseInvoiceItem` records
   - **Update `Product.currentStock` for each item** (add quantity)
   - **Create `InventoryTransaction` record** for each item:
     - `type`: `PURCHASE`
     - `referenceType`: `PURCHASE_INVOICE`
     - `referenceId`: the new invoice ID
3. Return the created invoice with items

**Transaction Safety:** All steps must succeed together. If any step fails, the entire transaction rolls back, preventing partial updates like an invoice without stock changes.

---

### 6. Supplier Payments

**File:** `app/api/supplier-payments/route.ts`

```
GET    /api/supplier-payments           - list all payments
POST   /api/supplier-payments           - record payment
GET    /api/supplier-payments/[id]      - get one payment
```

**Logic on creation:**
1. Auto-generate payment number from `Sequence` (key: `SUPPLIER_PAYMENT`)
2. Wrap the following in `prisma.$transaction(async (tx) => { ... })`:
   - Create `SupplierPayment` record
   - Update `PurchaseInvoice.paid` (add amount) and `PurchaseInvoice.balance` (subtract amount)
   - Update `PurchaseInvoice.status` based on new balance:
     - If `balance <= 0` → `PAID`
     - If `paid > 0 && balance > 0` → `PARTIAL`
     - Else → `PENDING`
3. Return the created payment

**Transaction Safety:** Ensures the payment record and invoice balance/status stay in sync.

---

### 7. Inventory Adjustments

**File:** `app/api/inventory-adjustments/route.ts`

```
POST   /api/inventory-adjustments      - create adjustment (increase/decrease stock)
```

**Logic on creation (POST):**
1. Validate `productId`, `type`, `quantity`
2. Wrap the following in `prisma.$transaction(async (tx) => { ... })`:
   - Look up product
   - If type is increase (`PURCHASE`, `ADJUSTMENT_IN`):
     - `Product.currentStock += quantity`
   - If type is decrease (`SALE`, `ADJUSTMENT_OUT`, `EXPIRED`, `DAMAGED`, `LOST`, `RETURN_OUT`):
     - Check `currentStock >= quantity`
     - If not, return 400 error "Insufficient stock"
     - `Product.currentStock -= quantity`
   - Create `InventoryTransaction` record internally with:
     - `type`: the adjustment type
     - `quantity`: positive for increase, negative for decrease
     - `referenceType`: `ADJUSTMENT`
     - `notes`: user-provided reason
3. Return the created transaction with product info

**Transaction Safety:** Ensures stock update and transaction record are always created together.

---

### 8. Inventory Transactions (Read-Only)

**File:** `app/api/inventory-transactions/route.ts`

```
GET    /api/inventory-transactions      - list transactions (filter by product, type, date range)
GET    /api/inventory-transactions/[id] - get one transaction
```

**Note:** `POST /api/inventory-transactions` is replaced by `POST /api/inventory-adjustments` above. Inventory Transactions are read-only audit records.

---

### 8. Dashboard (Extend existing)

**File:** `app/api/dashboard/route.ts`

Add to the response:
```json
{
  "purchase": {
    "todayPurchase": 25450,
    "monthlyPurchase": 675000,
    "inventoryValue": 182430,
    "lowStockItems": 14,
    "pendingPayments": 120000,
    "totalProducts": 156,
    "totalSuppliers": 38
  }
}
```

**Calculations:**
- `todayPurchase` = sum of `grandTotal` for purchase invoices where `invoiceDate` is today
- `monthlyPurchase` = sum of `grandTotal` for purchase invoices in current month
- `inventoryValue` = sum of (`currentStock` × `purchasePrice`) for all active products
- `lowStockItems` = count of products where `currentStock` < `minimumStock`
- `pendingPayments` = sum of `balance` for all purchase invoices where `balance > 0`
- `totalProducts` = count of active products
- `totalSuppliers` = count of active suppliers

---

## UI Pages

### Page 1: Suppliers

**File:** `app/suppliers/page.tsx`

**Features:**
- Table: Supplier Name, Contact Person, Phone, Email, GST Number, Opening Balance, Status
- Create/Edit dialog with all fields
- Click supplier to view **Supplier Ledger**:
  - Total Purchases
  - Total Payments
  - Outstanding Balance
  - Last Purchase Date
  - Recent Purchase History
  - Recent Payment History
- Delete = deactivate (soft delete)
- Active/Inactive badge

**Pattern:** Same as `app/admin/users/page.tsx` — Card + Table + Dialog form

---

### Page 2: Products

**File:** `app/products/page.tsx`

**Features:**
- Table: Product Name, Code, SKU, Category, Purchase Price, Selling Price, Current Stock, Min Stock, Max Stock, Status
- Stock status badges: 🟢 Healthy, 🟡 Low Stock, 🔵 Overstock, 🔴 Out of Stock
- Create/Edit dialog with all fields
- Search by name/code/SKU
- Filter by category
- Low stock alert section
- Image preview if imageUrl exists
- **Adjust Stock button** on each row — opens dialog to increase/decrease stock with reason

**Pattern:** Same as suppliers page

---

### Page 3: Product Categories

**File:** `app/product-categories/page.tsx`

**Features:**
- Simple list of categories
- Create/Edit/Deactivate
- Used as dropdown in Products page

**Pattern:** Simple table with CRUD

---

### Page 4: Purchase Invoices

**File:** `app/purchase-invoices/page.tsx`

**Features:**
- List of purchase invoices
- Create dialog with:
  - **Header:** Invoice Number (auto), Date, Supplier (dropdown), Payment Mode, Due Date, Notes
  - **Items table:** Product (dropdown), Quantity, Purchase Rate, Amount (auto-calculated)
  - **Summary:** Subtotal, Tax, Grand Total
- On save: stock auto-updates, transactions logged
- View invoice details with items
- Record payment button (opens payment dialog)

**Pattern:** Similar to existing billing page but simpler

---

### Page 5: Supplier Payments

**File:** `app/supplier-payments/page.tsx`

**Features:**
- List of all payments
- Record payment dialog:
  - Select Supplier
  - Select Invoice (shows outstanding balance)
  - Amount, Payment Date, Payment Mode, Reference, Notes
- Auto-updates invoice balance

**Pattern:** Simple form with table

---

### Page 6: Inventory Adjustment

**File:** `app/inventory-adjustments/page.tsx`

**Features:**
- List of all adjustments
- Create adjustment dialog:
  - Select Product
  - Current Stock (read-only)
  - Operation: Radio buttons — Increase / Decrease
  - Reason: Dropdown — Sale, Damage, Expired, Lost, Manual Correction, Opening Stock, Purchase Correction
  - Quantity: Number input
  - Notes: Text input
- On save: stock updates, transaction created
- Validation: cannot decrease below zero

**Pattern:** Same as other CRUD pages with a form dialog

### Page 7: Inventory Transactions

**File:** `app/inventory-transactions/page.tsx`

**Features:**
- List of all stock transactions
- Filter by product, type, date range
- Shows: Product, Type, Quantity, Date, Reference, Notes

**Pattern:** Read-only table with filters

---

### Page 8: Dashboard Update

**File:** `app/page.tsx`

Add stat cards:
- Today's Purchase
- Monthly Purchase
- Inventory Value
- Low Stock Items
- Pending Supplier Payments
- Total Products
- Total Suppliers

---

## Navigation Update

**File:** `components/dashboard/sidebar-nav.tsx`

Add new nav group:

```tsx
{
  heading: 'Purchase & Inventory',
  items: [
    { label: 'Suppliers', icon: Truck, href: '/suppliers' },
    { label: 'Products', icon: Package, href: '/products' },
    { label: 'Categories', icon: FolderOpen, href: '/product-categories' },
    { label: 'Purchase Invoices', icon: ReceiptText, href: '/purchase-invoices' },
    { label: 'Supplier Payments', icon: Wallet, href: '/supplier-payments' },
    { label: 'Inventory Adjustment', icon: SlidersHorizontal, href: '/inventory-adjustments' },
    { label: 'Inventory History', icon: History, href: '/inventory-transactions' },
  ],
}
```

---

## Implementation Order

### Step 1: Schema (Day 1)
1. Add 9 new models to `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name add-purchase-management`
3. Update `prisma/seed.ts` to include `Sequence` + `ProductCategory` seeds
4. Run seed: `npm run db:seed`

### Step 2: API Routes (Day 1-2)
5. Create sequence helper
6. Create `app/api/product-categories/route.ts`
7. Create `app/api/suppliers/route.ts`
8. Create `app/api/suppliers/[id]/route.ts`
9. Create `app/api/products/route.ts`
10. Create `app/api/products/[id]/route.ts`
11. Create `app/api/purchase-invoices/route.ts`
12. Create `app/api/purchase-invoices/[id]/route.ts`
13. Create `app/api/supplier-payments/route.ts`
14. Create `app/api/inventory-adjustments/route.ts`
15. Create `app/api/inventory-transactions/route.ts`
16. Extend `app/api/dashboard/route.ts` with purchase stats

### Step 3: UI Pages (Day 2-3)
16. Create `app/product-categories/page.tsx`
17. Create `app/suppliers/page.tsx`
18. Create `app/products/page.tsx`
19. Create `app/purchase-invoices/page.tsx`
20. Create `app/supplier-payments/page.tsx`
21. Create `app/inventory-adjustments/page.tsx`
22. Create `app/inventory-transactions/page.tsx`
23. Update `components/dashboard/sidebar-nav.tsx`
24. Update `app/page.tsx` with new stat cards

### Step 4: Testing (Day 3)
25. Test category CRUD
26. Test supplier CRUD + ledger
27. Test product CRUD + low stock + product code generation + min/max stock
28. Test purchase invoice creation + stock update
29. Test supplier payment + balance update
30. Test inventory adjustment (increase/decrease) via POST /api/inventory-adjustments
31. Test inventory transactions (read-only)
32. Test dashboard widgets (today/monthly purchase, inventory value, low stock, pending payments, products, suppliers)
33. Verify existing features still work

---

## New Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 9 models + 5 enums |
| `prisma/seed.ts` | Add Sequence + ProductCategory seeds |
| `app/api/product-categories/route.ts` | New |
| `app/api/suppliers/route.ts` | New |
| `app/api/suppliers/[id]/route.ts` | New |
| `app/api/products/route.ts` | New |
| `app/api/products/[id]/route.ts` | New |
| `app/api/purchase-invoices/route.ts` | New |
| `app/api/purchase-invoices/[id]/route.ts` | New |
| `app/api/supplier-payments/route.ts` | New |
| `app/api/inventory-adjustments/route.ts` | New |
| `app/api/inventory-transactions/route.ts` | New |
| `app/product-categories/page.tsx` | New |
| `app/suppliers/page.tsx` | New |
| `app/products/page.tsx` | New |
| `app/purchase-invoices/page.tsx` | New |
| `app/supplier-payments/page.tsx` | New |
| `app/inventory-adjustments/page.tsx` | New |
| `app/inventory-transactions/page.tsx` | New |
| `components/dashboard/sidebar-nav.tsx` | Update |
| `app/page.tsx` | Update |
| `app/api/dashboard/route.ts` | Update |

**Total: 12 new files, 3 updated files**

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Generic `Sequence` table** | One table for all numbering needs. Add new sequence types without schema changes. |
| **`DateTime` for dates** | Prisma handles date filtering natively. Easier queries. |
| **`Decimal` for money** | No floating-point rounding errors. Critical for financial accuracy. |
| **Enums for types/statuses** | Type safety at DB level. No invalid values like "purchase", "Purchase", "PURCHASE". |
| **Product Code (`PRD-YYYYMMDD-001`)** | Auto-generated unique code for easy lookup and future barcode support. |
| **`minimumStock` / `maximumStock`** | Better than single reorder level. Enables Healthy/Low/Overstock badges and smarter reorder alerts. |
| **Calculated Stock Value** | Not stored. Computed as `currentStock × purchasePrice`. Avoids sync issues. |
| **`POST /api/inventory-adjustments`** | Business-action endpoint. Internally creates `InventoryTransaction`. Cleaner separation. |
| **Database Transactions** | Purchase Invoice creation, Supplier Payment, and Inventory Adjustment all use `prisma.$transaction` to ensure atomicity. Prevents partial updates. |
| **Generic `InventoryTransaction`** | `referenceType` + `referenceId` pattern. No Prisma relation — pure audit log. Works for purchases, sales, adjustments, returns, prescriptions. Future-proof. |
| **Separate `SupplierPayment`** | Multiple payments per invoice. No overwriting invoice data. Payments do NOT create inventory transactions. |
| **`Product.currentStock`** | Simple number. Fast reads. Transactions provide audit trail. |

**Optimistic Concurrency (Optional):** For a single clinic with few concurrent users, Prisma `$transaction` is sufficient. If concurrent stock adjustments become frequent, consider adding a `version` field to `Product` for optimistic locking later.

---

## Enum Definitions

```prisma
enum TransactionType {
  PURCHASE           // Stock added from purchase
  SALE               // Stock reduced from sale
  ADJUSTMENT_IN      // Manual stock increase
  ADJUSTMENT_OUT     // Manual stock decrease
  RETURN_OUT         // Stock returned to supplier
  EXPIRED            // Stock expired
  DAMAGED            // Stock damaged
  LOST               // Stock lost
}

enum PaymentMode {
  CASH
  BANK
  UPI
  CREDIT
}

enum PaymentStatus {
  PENDING    // No payment made
  PARTIAL    // Some payment made
  PAID       // Fully paid
  OVERDUE    // Past due date with balance
}

enum SupplierStatus {
  ACTIVE
  INACTIVE
}

enum ReferenceType {
  PURCHASE_INVOICE
  SALE_INVOICE
  ADJUSTMENT
  PRESCRIPTION
  RETURN
}
```

---

## InventoryTransaction Reference Types

```prisma
referenceType ReferenceType?  // PURCHASE_INVOICE | SALE_INVOICE | PRESCRIPTION | ADJUSTMENT | RETURN
referenceId  String?   // ID of the related record
```

**Important:** `InventoryTransaction` has NO Prisma relation to any other table. It is a pure audit log, just like a financial ledger. `referenceType` uses the `ReferenceType` enum for type safety, while `referenceId` stores the related record ID as a string.

This allows the same table to track:
- Purchase → `PURCHASE_INVOICE` + purchaseInvoiceId
- Sale → `SALE_INVOICE` + saleInvoiceId
- Adjustment → `ADJUSTMENT` + adjustmentId
- Return → `RETURN` + returnId

**Supplier payments do NOT create inventory transactions.** Payments affect money only, not stock.

---

## Why This Approach Is Safe

| Concern | Why It's Safe |
|---------|---------------|
| Breaking existing features | No existing models or routes are modified |
| Data migration risk | Only new tables are added; existing data untouched |
| Complex business logic | Stock update is a simple `UPDATE products SET currentStock = currentStock + ?` |
| Integration bugs | No integration with existing Invoice/Prescription yet |
| Rollback | Drop the 9 new tables if needed; everything else stays intact |
| Payment tracking | Separate `SupplierPayment` table — no overwriting of invoice data |
| Date handling | `DateTime` uses native DB date types — no parsing issues |
| Financial accuracy | `Decimal` prevents rounding errors in money calculations |
| Type safety | Enums prevent invalid values in DB |

---

## What's NOT Included (Can Add Later)

| Feature | When to Add |
|---------|-------------|
| Purchase Orders | When you need approval workflow before buying |
| Goods Received (GRN) | When you need to track partial deliveries |
| Batch & Expiry tracking | When you start storing medicines with expiry dates |
| Purchase Returns | When returns become frequent |
| Integration with existing billing | Phase 2, after PMS is stable |
| Barcode scanning | When you have barcode printers |
| Multi-warehouse | When you have multiple storage locations |
| GST Reports | When you need tax filing |
| Full accounting | When you need double-entry bookkeeping |

---

## Inventory Adjustment Module

The Inventory Adjustment module lets staff manually increase or decrease stock with full audit trail.

### Adjustment Types

| Type | Direction | Use Case |
|------|-----------|----------|
| `PURCHASE` | Increase | Handled by Purchase Invoice |
| `SALE` | Decrease | Manual sale record (until billing is integrated) |
| `ADJUSTMENT_IN` | Increase | Correction, found stock, opening stock |
| `ADJUSTMENT_OUT` | Decrease | Damage, expired, lost, manual correction |
| `RETURN_OUT` | Decrease | Return to supplier (future) |
| `EXPIRED` | Decrease | Expired stock |
| `DAMAGED` | Decrease | Damaged stock |
| `LOST` | Decrease | Lost stock |

### UI: Adjust Stock Dialog (on Products page)

- Product name and current stock (read-only)
- Operation: Increase / Decrease (radio buttons)
- Reason: Sale, Damage, Expired, Lost, Manual Correction, Opening Stock, Purchase Correction
- Quantity: number input
- Notes: text input
- Save button

### API: POST /api/inventory-adjustments

- Validates product exists
- For decrease: checks sufficient stock, returns 400 if insufficient
- Updates `Product.currentStock`
- Creates `InventoryTransaction` record internally
- Returns created transaction

### Manual SALE Adjustment Transition Plan

Manual `SALE` adjustments are available in Phase 1 because the existing Patient Invoice/Billing system will never connect to PMS inventory. However, when a separate PMS Product Billing module is implemented in Phase 2, automatic `SALE` transactions will be created from that module's invoices. To prevent double-deducting stock, manual `SALE` adjustments must be disabled before the billing module activates.

**Transition steps:**
1. **Phase 1 (current):** `SALE` adjustment type is available for manual stock deduction via `adjustStock()`. Controlled by `ALLOW_MANUAL_SALE_ADJUSTMENT` environment variable (defaults to `true`).
2. **Phase 2 step 1:** Disable/remove manual `SALE` adjustment type from `inventory-adjustments/route.ts` and UI by setting `ALLOW_MANUAL_SALE_ADJUSTMENT=false`.
3. **Phase 2 step 2:** Activate automatic SALE deduction from the PMS Product Billing module via `consumeStock()`.
4. **Critical:** Manual SALE must be disabled BEFORE the PMS Product Billing module activates automatic deduction. Never allow both simultaneously.

---

## Success Criteria

- [ ] Product categories can be managed
- [ ] Suppliers can be created, edited, deactivated
- [ ] Supplier ledger shows purchases, payments, outstanding balance
- [ ] Products can be created, edited, deactivated
- [ ] Product code auto-generated on creation
- [ ] Product min/max stock levels configured
- [ ] Purchase invoice creates stock entries + inventory transactions
- [ ] `Product.currentStock` increases correctly
- [ ] Supplier payments can be recorded
- [ ] Invoice balance updates after payment
- [ ] Inventory adjustment via POST /api/inventory-adjustments increases stock correctly
- [ ] Inventory adjustment via POST /api/inventory-adjustments decreases stock correctly
- [ ] Cannot decrease stock below zero
- [ ] Dashboard shows today's purchase, monthly purchase, inventory value, low stock, pending payments, products, suppliers
- [ ] All existing features (patients, visits, billing) work exactly as before
