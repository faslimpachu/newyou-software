# Purchase Management System (PMS) — Simplified Implementation Plan

## Goal

Add a **minimal, safe Purchase Management module** to the existing clinic dashboard.

**Rules:**
- Only NEW tables are added
- Zero changes to existing models (`Patient`, `Invoice`, `Prescription`, etc.)
- Stock tracked on `Product.currentStock` + `InventoryTransaction` for audit trail
- No complex business logic (GRN, batches, returns, stock movements)
- Follows existing code patterns exactly

---

## What We Are Building

A practical purchase system with 4 pages:

```
Suppliers → Products → Purchase Invoices → Stock increases automatically
                                       → Payment history tracked
                                       → Supplier ledger visible
```

No GRN, no PO, no batches, no returns. Just: **Buy products → stock increases → payments tracked.**

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
  sku           String?  @unique
  categoryId    String?
  unit          String   @default("pcs")
  purchasePrice Decimal
  sellingPrice  Decimal
  gstPercent    Decimal  @default(0)
  reorderLevel  Int      @default(10)
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
  transactions   InventoryTransaction[]

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
  referenceType String?          // PURCHASE_INVOICE | SUPPLIER_PAYMENT | PURCHASE_RETURN | ADJUSTMENT | SALE_INVOICE | PRESCRIPTION
  referenceId  String?
  notes        String?
  createdAt    DateTime          @default(now())

  product        Product        @relation(fields: [productId], references: [id])
  purchaseInvoice PurchaseInvoice? @relation(fields: [referenceId], references: [id])

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

Example: `PINV-20260802-0001`

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
POST   /api/products                    - create product
GET    /api/products/[id]               - get one product
PATCH  /api/products/[id]               - update product
DELETE /api/products/[id]               - deactivate product
GET    /api/products/low-stock          - products below reorderLevel
```

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
2. Create `PurchaseInvoice` record
3. Create `PurchaseInvoiceItem` records
4. **Update `Product.currentStock` for each item** (add quantity)
5. **Create `InventoryTransaction` record** for each item:
   - `type`: `PURCHASE`
   - `referenceType`: `PURCHASE_INVOICE`
   - `referenceId`: the new invoice ID
6. Return the created invoice with items

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
2. Create `SupplierPayment` record
3. Update `PurchaseInvoice.paid` (add amount) and `PurchaseInvoice.balance` (subtract amount)
4. Update `PurchaseInvoice.status` based on new balance:
   - If `balance <= 0` → `PAID`
   - If `paid > 0 && balance > 0` → `PARTIAL`
   - Else → `PENDING`
5. **Create `InventoryTransaction` record**:
   - `type`: `PURCHASE` (or add new type like `PAYMENT` if needed)
   - `referenceType`: `SUPPLIER_PAYMENT`
   - `referenceId`: the new payment ID

---

### 7. Inventory Transactions

**File:** `app/api/inventory-transactions/route.ts`

```
GET    /api/inventory-transactions      - list transactions (filter by product, type, date range)
GET    /api/inventory-transactions/[id] - get one transaction
```

**Filters:**
- `productId` — filter by product
- `type` — filter by transaction type
- `startDate` / `endDate` — filter by date range
- `referenceType` — filter by reference type

---

### 8. Dashboard (Extend existing)

**File:** `app/api/dashboard/route.ts`

Add to the response:
```json
{
  "purchase": {
    "totalSuppliers": 38,
    "lowStockItems": 14,
    "todayPurchase": 25450,
    "monthlyPurchase": 675000,
    "pendingPayments": 120000
  }
}
```

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
- Table: Product Name, SKU, Category, Purchase Price, Selling Price, Current Stock, Reorder Level, Status
- Stock status badges: 🟢 Healthy, 🟡 Low Stock, 🔴 Out of Stock
- Create/Edit dialog with all fields
- Search by name/SKU
- Filter by category
- Low stock alert section
- Image preview if imageUrl exists

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

### Page 6: Inventory Transactions

**File:** `app/inventory-transactions/page.tsx`

**Features:**
- List of all stock transactions
- Filter by product, type, date range
- Shows: Product, Type, Quantity, Date, Reference, Notes

**Pattern:** Read-only table with filters

---

### Page 7: Dashboard Update

**File:** `app/page.tsx`

Add 3 stat cards:
- Total Suppliers
- Low Stock Items
- Pending Payments (sum of all invoice balances)

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
    { label: 'Stock History', icon: History, href: '/inventory-transactions' },
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
14. Create `app/api/inventory-transactions/route.ts`
15. Extend `app/api/dashboard/route.ts` with purchase stats

### Step 3: UI Pages (Day 2-3)
16. Create `app/product-categories/page.tsx`
17. Create `app/suppliers/page.tsx`
18. Create `app/products/page.tsx`
19. Create `app/purchase-invoices/page.tsx`
20. Create `app/supplier-payments/page.tsx`
21. Create `app/inventory-transactions/page.tsx`
22. Update `components/dashboard/sidebar-nav.tsx`
23. Update `app/page.tsx` with new stat cards

### Step 4: Testing (Day 3)
24. Test category CRUD
25. Test supplier CRUD + ledger
26. Test product CRUD + low stock
27. Test purchase invoice creation + stock update
28. Test supplier payment + balance update
29. Test inventory transactions
30. Test dashboard widgets
31. Verify existing features still work

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
| `app/api/inventory-transactions/route.ts` | New |
| `app/product-categories/page.tsx` | New |
| `app/suppliers/page.tsx` | New |
| `app/products/page.tsx` | New |
| `app/purchase-invoices/page.tsx` | New |
| `app/supplier-payments/page.tsx` | New |
| `app/inventory-transactions/page.tsx` | New |
| `components/dashboard/sidebar-nav.tsx` | Update |
| `app/page.tsx` | Update |
| `app/api/dashboard/route.ts` | Update |

**Total: 10 new files, 3 updated files**

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Generic `Sequence` table** | One table for all numbering needs. Add new sequence types without schema changes. |
| **`DateTime` for dates** | Prisma handles date filtering natively. Easier queries. |
| **`Decimal` for money** | No floating-point rounding errors. Critical for financial accuracy. |
| **Enums for types/statuses** | Type safety at DB level. No invalid values like "purchase", "Purchase", "PURCHASE". |
| **Generic `InventoryTransaction`** | `referenceType` + `referenceId` pattern. Works for purchases, sales, adjustments, returns, prescriptions. Future-proof. |
| **Separate `SupplierPayment`** | Multiple payments per invoice. No overwriting invoice data. |
| **`Product.currentStock`** | Simple number. Fast reads. Transactions provide audit trail. |

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
```

---

## InventoryTransaction Reference Types

```prisma
referenceType String?  // PURCHASE_INVOICE | SALE_INVOICE | PRESCRIPTION | ADJUSTMENT | RETURN
referenceId  String?   // ID of the related record
```

This allows the same table to track:
- Purchase → `PURCHASE_INVOICE` + purchaseInvoiceId
- Sale → `SALE_INVOICE` + saleInvoiceId
- Adjustment → `ADJUSTMENT` + adjustmentId
- Return → `RETURN` + returnId

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

## Success Criteria

- [ ] Product categories can be managed
- [ ] Suppliers can be created, edited, deactivated
- [ ] Supplier ledger shows purchases, payments, outstanding balance
- [ ] Products can be created, edited, deactivated
- [ ] Purchase invoice creates stock entries + inventory transactions
- [ ] `Product.currentStock` increases correctly
- [ ] Supplier payments can be recorded
- [ ] Invoice balance updates after payment
- [ ] Dashboard shows supplier count, low stock count, pending payments
- [ ] All existing features (patients, visits, billing) work exactly as before
