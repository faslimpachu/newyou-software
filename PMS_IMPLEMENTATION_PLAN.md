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
  id              String   @id @default(uuid())
  supplierName    String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  gstNumber       String?
  openingBalance  Float    @default(0)
  status          String   @default("active")
  createdAt       DateTime @default(now())

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
  purchasePrice Float
  sellingPrice  Float
  gstPercent    Float    @default(0)
  reorderLevel  Int      @default(10)
  currentStock  Float    @default(0)
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
  id            String   @id @default(uuid())
  invoiceNumber String   @unique
  invoiceDate   String
  supplierId    String
  paymentMode   String?
  dueDate       String?
  notes         String?
  subtotal      Float
  tax           Float
  grandTotal    Float
  paid          Float    @default(0)
  balance       Float
  createdAt     DateTime @default(now())

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
  quantity     Float
  purchaseRate Float
  amount       Float

  invoice PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product Product        @relation(fields: [productId], references: [id])

  @@map("purchase_invoice_items")
}

// --- Supplier Payment ---
model SupplierPayment {
  id            String   @id @default(uuid())
  paymentNumber String   @unique
  supplierId    String
  invoiceId     String?
  amount        Float
  paymentDate   String
  paymentMode   String?
  reference     String?
  notes         String?
  createdAt     DateTime @default(now())

  supplier   Supplier        @relation(fields: [supplierId], references: [id])
  invoice    PurchaseInvoice? @relation(fields: [invoiceId], references: [id])

  @@map("supplier_payments")
}

// --- Inventory Transaction (Stock Audit Trail) ---
model InventoryTransaction {
  id           String   @id @default(uuid())
  productId    String
  type         String   // purchase | sale | adjustment_in | adjustment_out | expired | damaged | lost | return_out
  quantity     Float
  referenceId  String?  // ID of related record
  notes        String?
  createdAt    DateTime @default(now())

  product Product        @relation(fields: [productId], references: [id])
  invoice PurchaseInvoice? @relation(fields: [referenceId], references: [id])

  @@map("inventory_transactions")
}

// --- Auto-number Sequence ---
model PurchaseSequence {
  id         String   @id @default("GLOBAL")
  lastNumber Int      @default(0)
  updatedAt  DateTime @default(now())

  @@map("purchase_sequences")
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

### Seed: PurchaseSequence

```ts
await prisma.purchaseSequence.upsert({
  where: { id: 'GLOBAL' },
  update: {},
  create: { id: 'GLOBAL', lastNumber: 0 },
})
```

### Seed: ProductCategories (Optional but Recommended)

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

| Document | Format |
|----------|--------|
| Purchase Invoice | `PINV-YYYYMMDD-001` |
| Supplier Payment | `PPAY-YYYYMMDD-001` |

Example: `PINV-20260802-0001`

---

## API Routes

### 1. Product Categories

**File:** `app/api/product-categories/route.ts`

```
GET    /api/product-categories          - list all categories
POST   /api/product-categories          - create category (admin only)
PATCH  /api/product-categories/[id]     - update category
DELETE /api/product-categories/[id]     - deactivate category
```

---

### 2. Suppliers

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
  "lastPurchaseDate": "2026-07-12",
  "recentPurchases": [...],
  "recentPayments": [...]
}
```

---

### 3. Products

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

### 4. Purchase Invoices

**File:** `app/api/purchase-invoices/route.ts`

```
GET    /api/purchase-invoices           - list all purchase invoices
POST   /api/purchase-invoices           - create purchase invoice
GET    /api/purchase-invoices/[id]      - get one purchase invoice
```

**Logic on creation:**
1. Auto-generate invoice number from `PurchaseSequence`
2. Create `PurchaseInvoice` record
3. Create `PurchaseInvoiceItem` records
4. **Update `Product.currentStock` for each item** (add quantity)
5. **Create `InventoryTransaction` record** for each item (type: "purchase")
6. Return the created invoice with items

---

### 5. Supplier Payments

**File:** `app/api/supplier-payments/route.ts`

```
GET    /api/supplier-payments           - list all payments
POST   /api/supplier-payments           - record payment
GET    /api/supplier-payments/[id]      - get one payment
```

**Logic on creation:**
1. Auto-generate payment number from `PurchaseSequence`
2. Create `SupplierPayment` record
3. Update `PurchaseInvoice.paid` and `PurchaseInvoice.balance`
4. Create `InventoryTransaction` record (type: "payment")

---

### 6. Inventory Transactions

**File:** `app/api/inventory-transactions/route.ts`

```
GET    /api/inventory-transactions      - list transactions (filter by product, type, date)
GET    /api/inventory-transactions/[id] - get one transaction
```

---

### 7. Dashboard (Extend existing)

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
1. Add 8 new models to `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name add-purchase-management`
3. Update `prisma/seed.ts` to include `PurchaseSequence` + `ProductCategory` seeds
4. Run seed: `npm run db:seed`

### Step 2: API Routes (Day 1-2)
5. Create `app/api/product-categories/route.ts`
6. Create `app/api/suppliers/route.ts`
7. Create `app/api/suppliers/[id]/route.ts`
8. Create `app/api/products/route.ts`
9. Create `app/api/products/[id]/route.ts`
10. Create `app/api/purchase-invoices/route.ts`
11. Create `app/api/purchase-invoices/[id]/route.ts`
12. Create `app/api/supplier-payments/route.ts`
13. Create `app/api/inventory-transactions/route.ts`
14. Extend `app/api/dashboard/route.ts` with purchase stats

### Step 3: UI Pages (Day 2-3)
15. Create `app/product-categories/page.tsx`
16. Create `app/suppliers/page.tsx`
17. Create `app/products/page.tsx`
18. Create `app/purchase-invoices/page.tsx`
19. Create `app/supplier-payments/page.tsx`
20. Create `app/inventory-transactions/page.tsx`
21. Update `components/dashboard/sidebar-nav.tsx`
22. Update `app/page.tsx` with new stat cards

### Step 4: Testing (Day 3)
23. Test category CRUD
24. Test supplier CRUD + ledger
25. Test product CRUD + low stock
26. Test purchase invoice creation + stock update
27. Test supplier payment + balance update
28. Test inventory transactions
29. Test dashboard widgets
30. Verify existing features still work

---

## New Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 8 models |
| `prisma/seed.ts` | Add PurchaseSequence + ProductCategory seeds |
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

## Key Improvements from Feedback

| Feature | Implementation |
|---------|----------------|
| **Product Category** | Separate `ProductCategory` model with seed data |
| **Supplier Ledger** | Computed in `GET /api/suppliers/[id]` — total purchases, payments, outstanding |
| **Supplier Payments** | Separate `SupplierPayment` model — tracks multiple payments per invoice |
| **Inventory Transactions** | `InventoryTransaction` model — audit trail for all stock changes |
| **Unit Options** | Free text field with common defaults (pcs, bottle, kg, litre, packet, strip, box, tablet, capsule) |
| **Product Image** | Optional `imageUrl` field on Product |
| **Supplier History** | Shown in supplier detail view (purchases, payments, last purchase date) |
| **Purchase Print** | Print button on purchase invoice detail page (uses existing print pattern) |

---

## Why This Approach Is Safe

| Concern | Why It's Safe |
|---------|---------------|
| Breaking existing features | No existing models or routes are modified |
| Data migration risk | Only new tables are added; existing data untouched |
| Complex business logic | Stock update is a simple `UPDATE products SET currentStock = currentStock + ?` |
| Integration bugs | No integration with existing Invoice/Prescription yet |
| Rollback | Drop the 8 new tables if needed; everything else stays intact |
| Payment tracking | Separate `SupplierPayment` table — no overwriting of invoice data |

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
