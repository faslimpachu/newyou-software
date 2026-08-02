# Purchase Management System (PMS) — Simplified Implementation Plan

## Goal

Add a **minimal, safe Purchase Management module** to the existing clinic dashboard.

**Rules:**
- Only NEW tables are added
- Zero changes to existing models (`Patient`, `Invoice`, `Prescription`, etc.)
- Stock is tracked simply as a number on the `Product` model
- No complex business logic (GRN, batches, returns, stock movements)
- Follows existing code patterns exactly

---

## What We Are Building

A basic purchase system with 3 pages:

```
Suppliers → Products → Purchase Invoices → Stock increases automatically
```

That's it. No GRN, no PO, no returns, no batches, no stock movement logs.

---

## Prisma Schema Changes

Add these 5 models to `prisma/schema.prisma`:

```prisma
// --- Supplier ---
model Supplier {
  id             String   @id @default(uuid())
  supplierName   String
  contactPerson  String?
  phone          String?
  email          String?
  address        String?
  gstNumber      String?
  openingBalance Float    @default(0)
  status         String   @default("active")
  createdAt      DateTime @default(now())

  purchaseInvoices PurchaseInvoice[]

  @@map("suppliers")
}

// --- Product ---
model Product {
  id            String   @id @default(uuid())
  name          String
  sku           String?  @unique
  category      String?
  unit          String   @default("pcs")
  purchasePrice Float
  sellingPrice  Float
  gstPercent    Float    @default(0)
  reorderLevel  Int      @default(10)
  currentStock  Float    @default(0)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  invoiceItems PurchaseInvoiceItem[]

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

  supplier   Supplier           @relation(fields: [supplierId], references: [id])
  items      PurchaseInvoiceItem[]

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

Add to `prisma/seed.ts`:

```ts
await prisma.purchaseSequence.upsert({
  where: { id: 'GLOBAL' },
  update: {},
  create: { id: 'GLOBAL', lastNumber: 0 },
})
```

---

## Numbering Format

| Document | Format |
|----------|--------|
| Purchase Invoice | `PINV-YYYYMMDD-001` |

Example: `PINV-20260802-0001`

---

## API Routes

### 1. Suppliers

**File:** `app/api/suppliers/route.ts`

```
GET    /api/suppliers          - list all suppliers
POST   /api/suppliers          - create supplier
GET    /api/suppliers/[id]     - get one supplier
PATCH  /api/suppliers/[id]     - update supplier
DELETE /api/suppliers/[id]     - deactivate supplier
```

**Fields:** supplierName, contactPerson, phone, email, address, gstNumber, openingBalance, status

---

### 2. Products

**File:** `app/api/products/route.ts`

```
GET    /api/products           - list all products (search, filter)
POST   /api/products           - create product
GET    /api/products/[id]      - get one product
PATCH  /api/products/[id]      - update product
DELETE /api/products/[id]      - deactivate product
GET    /api/products/low-stock - products below reorderLevel
```

**Fields:** name, sku, category, unit, purchasePrice, sellingPrice, gstPercent, reorderLevel, currentStock, active

---

### 3. Purchase Invoices

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
5. Return the created invoice

**Header fields:** invoiceNumber, invoiceDate, supplierId, paymentMode, dueDate, notes, subtotal, tax, grandTotal, paid, balance

**Items:** productId, quantity, purchaseRate, amount

---

### 4. Dashboard (Extend existing)

**File:** `app/api/dashboard/route.ts`

Add to the response:
```json
{
  "purchase": {
    "totalSuppliers": 38,
    "lowStockItems": 14
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
- Low stock alert section

**Pattern:** Same as suppliers page

---

### Page 3: Purchase Invoices

**File:** `app/purchase-invoices/page.tsx`

**Features:**
- List of purchase invoices
- Create dialog with:
  - **Header:** Invoice Number (auto), Date, Supplier (dropdown), Payment Mode, Due Date, Notes
  - **Items table:** Product (dropdown), Quantity, Purchase Rate, Amount (auto-calculated)
  - **Summary:** Subtotal, Tax, Grand Total
- On save: stock auto-updates

**Pattern:** Similar to existing billing page but simpler

---

### Page 4: Dashboard Update

**File:** `app/page.tsx`

Add 2 stat cards:
- Total Suppliers
- Low Stock Items

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
    { label: 'Purchase Invoices', icon: ReceiptText, href: '/purchase-invoices' },
  ],
}
```

---

## Implementation Order

### Step 1: Schema (Day 1)
1. Add 5 new models to `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name add-purchase-management`
3. Update `prisma/seed.ts` to include `PurchaseSequence`
4. Run seed: `npm run db:seed`

### Step 2: API Routes (Day 1-2)
5. Create `app/api/suppliers/route.ts`
6. Create `app/api/suppliers/[id]/route.ts`
7. Create `app/api/products/route.ts`
8. Create `app/api/products/[id]/route.ts`
9. Create `app/api/purchase-invoices/route.ts`
10. Extend `app/api/dashboard/route.ts` with purchase stats

### Step 3: UI Pages (Day 2-3)
11. Create `app/suppliers/page.tsx`
12. Create `app/products/page.tsx`
13. Create `app/purchase-invoices/page.tsx`
14. Update `components/dashboard/sidebar-nav.tsx`
15. Update `app/page.tsx` with new stat cards

### Step 4: Testing (Day 3)
16. Test supplier CRUD
17. Test product CRUD
18. Test purchase invoice creation + stock update
19. Test dashboard widgets
20. Verify existing features still work

---

## New Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 5 models |
| `prisma/seed.ts` | Add PurchaseSequence seed |
| `app/api/suppliers/route.ts` | New |
| `app/api/suppliers/[id]/route.ts` | New |
| `app/api/products/route.ts` | New |
| `app/api/products/[id]/route.ts` | New |
| `app/api/purchase-invoices/route.ts` | New |
| `app/api/purchase-invoices/[id]/route.ts` | New |
| `app/suppliers/page.tsx` | New |
| `app/products/page.tsx` | New |
| `app/purchase-invoices/page.tsx` | New |
| `components/dashboard/sidebar-nav.tsx` | Update |
| `app/page.tsx` | Update |
| `app/api/dashboard/route.ts` | Update |

**Total: 7 new files, 3 updated files**

---

## Why This Approach Is Safe

| Concern | Why It's Safe |
|---------|---------------|
| Breaking existing features | No existing models or routes are modified |
| Data migration risk | Only new tables are added; existing data untouched |
| Complex business logic | Stock update is a simple `UPDATE products SET currentStock = currentStock + ?` |
| Integration bugs | No integration with existing Invoice/Prescription yet |
| Rollback | Drop the 5 new tables if needed; everything else stays intact |

---

## What's NOT Included (Can Add Later)

| Feature | When to Add |
|---------|-------------|
| Purchase Orders | When you need approval workflow before buying |
| Goods Received (GRN) | When you need to track partial deliveries |
| Batch & Expiry tracking | When you start storing medicines with expiry dates |
| Stock Movements log | When you need full audit trail |
| Purchase Returns | When returns become frequent |
| Integration with existing billing | Phase 2, after PMS is stable |

---

## Success Criteria

- [ ] Suppliers can be created, edited, deactivated
- [ ] Products can be created, edited, deactivated
- [ ] Purchase invoice creates stock entries
- [ ] `Product.currentStock` increases correctly
- [ ] Dashboard shows supplier count and low stock count
- [ ] All existing features (patients, visits, billing) work exactly as before
