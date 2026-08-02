# Purchase Management System (PMS) — Implementation Plan

## Executive Summary

The existing system is a **Next.js 16 + Prisma + MySQL** clinic management app with:
- Patient Management (Registration, Visits, OP Sheets, Prescriptions, Nutrition, Ayurcare)
- Billing (Invoices, Invoice Items)
- Expenses tracking
- Admin user management with role-based auth

This plan adds a **Purchase Management & Inventory module** that integrates directly with the existing billing system, so products purchased flow into inventory and are available in patient prescriptions/billing.

---

## Phase 0 — Prisma Schema Additions

Add these models to `prisma/schema.prisma`. Use existing conventions: `@id @default(uuid())`, `createdAt`, `@@map()`.

```prisma
// --- Product Master ---
model Product {
  id            String   @id @default(uuid())
  name          String
  sku           String?  @unique
  barcode       String?
  category      String?
  brand         String?
  manufacturer  String?
  unit          String?  @default("pcs")
  purchasePrice Float
  sellingPrice  Float
  gstPercent    Float    @default(0)
  hsnCode       String?
  reorderLevel  Int      @default(10)
  minStock      Int      @default(5)
  batchEnabled  Boolean  @default(false)
  expiryEnabled Boolean  @default(false)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  purchaseOrderItems PurchaseOrderItem[]
  grnItems           GRNItem[]
  invoiceItems       PurchaseInvoiceItem[]
  returnItems        PurchaseReturnItem[]
  batches            Batch[]
  inventory          Inventory?
  stockMovements     StockMovement[]

  @@map("products")
}

// --- Suppliers ---
model Supplier {
  id               String   @id @default(uuid())
  supplierName     String
  companyName      String?
  gstNumber        String?
  contactPerson    String?
  phone            String?
  email            String?
  address          String?
  state            String?
  openingBalance   Float    @default(0)
  status           String   @default("active")
  createdAt        DateTime @default(now())

  purchaseOrders    PurchaseOrder[]
  grns              GRN[]
  purchaseInvoices  PurchaseInvoice[]
  returns           PurchaseReturn[]
  payments          SupplierPayment[]
  purchaseHistory   PurchaseHistory[]

  @@map("suppliers")
}

// --- Purchase Orders ---
model PurchaseOrder {
  id              String   @id @default(uuid())
  poNumber        String   @unique
  date            String
  supplierId      String
  expectedDelivery String?
  notes           String?
  status          String   @default("draft") // draft | ordered | partially_received | completed | cancelled
  createdAt       DateTime @default(now())

  supplier        Supplier           @relation(fields: [supplierId], references: [id])
  items           PurchaseOrderItem[]
  grns            GRN[]

  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id            String @id @default(uuid())
  poId          String
  productId     String
  quantity      Float
  unit          String?
  purchasePrice Float
  gstPercent    Float  @default(0)
  discount      Float  @default(0)

  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  product       Product        @relation(fields: [productId], references: [id])

  @@map("purchase_order_items")
}

// --- Goods Received Note (GRN) ---
model GRN {
  id           String   @id @default(uuid())
  grnNumber    String   @unique
  poId         String?
  supplierId   String
  receivedDate String
  notes        String?
  createdAt    DateTime @default(now())

  purchaseOrder PurchaseOrder? @relation(fields: [poId], references: [id])
  supplier      Supplier        @relation(fields: [supplierId], references: [id])
  items         GRNItem[]

  @@map("grns")
}

model GRNItem {
  id              String @id @default(uuid())
  grnId           String
  productId       String
  batchNumber     String?
  mfgDate         String?
  expiryDate      String?
  receivedQty     Float
  purchasePrice   Float
  gstPercent      Float  @default(0)

  grn     GRN     @relation(fields: [grnId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("grn_items")
}

// --- Purchase Invoice ---
model PurchaseInvoice {
  id            String   @id @default(uuid())
  invoiceNumber String   @unique
  invoiceDate   String
  supplierId    String
  paymentMode   String?  // cash | bank | upi | credit
  dueDate       String?
  notes         String?
  createdAt     DateTime @default(now())

  supplier       Supplier           @relation(fields: [supplierId], references: [id])
  items          PurchaseInvoiceItem[]
  payments       SupplierPayment[]
  purchaseReturn PurchaseReturn?

  @@map("purchase_invoices")
}

model PurchaseInvoiceItem {
  id            String @id @default(uuid())
  invoiceId     String
  productId     String
  quantity      Float
  purchaseRate  Float
  gstPercent    Float  @default(0)
  discount      Float  @default(0)
  amount        Float

  invoice PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product Product        @relation(fields: [productId], references: [id])

  @@map("purchase_invoice_items")
}

// --- Inventory ---
model Inventory {
  id            String   @id @default(uuid())
  productId     String   @unique
  availableQty  Float    @default(0)
  reservedQty   Float    @default(0)
  lastUpdated   DateTime @default(now())

  product       Product        @relation(fields: [productId], references: [id])
  stockMovements StockMovement[]

  @@map("inventory")
}

// --- Batches ---
model Batch {
  id           String   @id @default(uuid())
  productId    String
  batchNumber  String
  mfgDate      String?
  expiryDate   String?
  receivedQty  Float
  remainingQty Float
  createdAt    DateTime @default(now())

  product Product        @relation(fields: [productId], references: [id])
  movements StockMovement[]

  @@map("batches")
  @@unique([productId, batchNumber])
}

// --- Stock Movements ---
model StockMovement {
  id           String   @id @default(uuid())
  productId    String
  batchId      String?
  type         String   // purchase_in | sale_out | adjustment_in | adjustment_out | return_out | expired | damaged | lost
  quantity     Float
  referenceType String? // PurchaseInvoice | Invoice | Adjustment | Return
  referenceId  String?
  notes        String?
  createdAt    DateTime @default(now())

  product Product  @relation(fields: [productId], references: [id])
  batch   Batch?   @relation(fields: [batchId], references: [id])

  @@map("stock_movements")
}

// --- Purchase Returns ---
model PurchaseReturn {
  id            String   @id @default(uuid())
  returnNumber  String   @unique
  supplierId    String
  invoiceId     String?
  reason        String?
  createdAt     DateTime @default(now())

  supplier      Supplier           @relation(fields: [supplierId], references: [id])
  invoice       PurchaseInvoice?   @relation(fields: [invoiceId], references: [id])
  items         PurchaseReturnItem[]

  @@map("purchase_returns")
}

model PurchaseReturnItem {
  id          String @id @default(uuid())
  returnId    String
  productId   String
  quantity    Float
  reason      String?

  purchaseReturn PurchaseReturn @relation(fields: [returnId], references: [id], onDelete: Cascade])
  product        Product        @relation(fields: [productId], references: [id])

  @@map("purchase_return_items")
}

// --- Supplier Payments ---
model SupplierPayment {
  id            String   @id @default(uuid())
  paymentNumber String   @unique
  supplierId    String
  invoiceId     String?
  amount        Float
  paymentDate   String
  paymentMode   String?
  notes         String?
  createdAt     DateTime @default(now())

  supplier   Supplier        @relation(fields: [supplierId], references: [id])
  invoice    PurchaseInvoice? @relation(fields: [invoiceId], references: [id])

  @@map("supplier_payments")
}

// --- Purchase History (denormalized snapshot for quick supplier history) ---
model PurchaseHistory {
  id            String   @id @default(uuid())
  supplierId    String
  productId     String?
  poId          String?
  invoiceId     String?
  grnId         String?
  totalAmount   Float
  purchaseDate  String
  createdAt     DateTime @default(now())

  supplier Supplier  @relation(fields: [supplierId], references: [id])
  product  Product?  @relation(fields: [productId], references: [id])

  @@map("purchase_history")
}

// --- Stock Adjustment ---
model StockAdjustment {
  id          String   @id @default(uuid())
  productId   String
  batchId     String?
  reason      String   // damaged | expired | lost | correction
  quantity    Float
  type        String   // in | out
  notes       String?
  createdAt   DateTime @default(now())

  product Product @relation(fields: [productId], references: [id])
  batch   Batch?  @relation(fields: [batchId], references: [id])

  @@map("stock_adjustments")
}
```

---

## Phase 1 — Database Migration

```bash
npx prisma migrate dev --name add-purchase-management-system
npx prisma generate
```

Verify in Prisma Studio:
```bash
npx prisma studio
```

---

## Phase 2 — API Routes

### 2.1 Products

```
GET    /api/products                - list (search, filter, paginate)
POST   /api/products                - create
GET    /api/products/[id]           - get one
PATCH  /api/products/[id]           - update
DELETE /api/products/[id]           - deactivate
GET    /api/products/low-stock      - low stock alerts
GET    /api/products/expiring       - expiry alerts
```

**File**: `app/api/products/route.ts`

### 2.2 Suppliers

```
GET    /api/suppliers               - list (search, filter)
POST   /api/suppliers               - create
GET    /api/suppliers/[id]          - get one + purchase history
PATCH  /api/suppliers/[id]          - update
DELETE /api/suppliers/[id]          - deactivate
GET    /api/suppliers/[id]/history  - purchase history
GET    /api/suppliers/[id]/payments - payment history
```

### 2.3 Purchase Orders

```
GET    /api/purchase-orders         - list (filter by status, supplier, date)
POST   /api/purchase-orders         - create (auto-generate PO number)
GET    /api/purchase-orders/[id]    - get one
PATCH  /api/purchase-orders/[id]    - update (status transitions)
```

### 2.4 Goods Received (GRN)

```
GET    /api/grn                     - list
POST   /api/grn                     - create (auto GRN number)
GET    /api/grn/[id]                - get one
```

**Logic**: On GRN creation → create Batch records, update Inventory.availableQty, create StockMovement entries.

### 2.5 Purchase Invoices

```
GET    /api/purchase-invoices       - list
POST   /api/purchase-invoices       - create
GET    /api/purchase-invoices/[id]  - get one
```

### 2.6 Supplier Payments

```
GET    /api/supplier-payments       - list
POST   /api/supplier-payments       - create
```

### 2.7 Purchase Returns

```
GET    /api/purchase-returns        - list
POST   /api/purchase-returns        - create
GET    /api/purchase-returns/[id]   - get one
```

### 2.8 Stock Movements

```
GET    /api/stock-movements         - list (filter by product, type, date)
POST   /api/stock-movements         - create (adjustment)
```

### 2.9 Reports

```
GET    /api/reports/purchase        - purchase report with filters
GET    /api/reports/stock           - stock report
GET    /api/reports/expiry          - expiry report
GET    /api/reports/profit          - profit report
```

### 2.10 Dashboard

Extend `app/api/dashboard/route.ts` to include:
```json
{
  "purchase": {
    "todayPurchase": 25450,
    "monthlyPurchase": 675000,
    "pendingPayments": 120000,
    "lowStockItems": 14,
    "expiringProducts": 9,
    "totalSuppliers": 38
  }
}
```

---

## Phase 3 — UI Pages

Follow existing patterns:
- **Client components** with `'use client'` directive
- **DashboardShell** wrapper for all authenticated pages
- **shadcn/ui** components: Card, Table, Button, Input, Label, Select, Dialog, Badge, Skeleton
- **lucide-react** for icons
- **Fetch** API for data loading (no external data layer)
- **React Hook Form + Zod** for forms

### 3.1 Navigation (sidebar-nav.tsx)

Add new nav group:

```tsx
{
  heading: 'Purchase & Inventory',
  items: [
    { label: 'Products', icon: Package, href: '/products' },
    { label: 'Suppliers', icon: Truck, href: '/suppliers' },
    { label: 'Purchase Orders', icon: FileText, href: '/purchase-orders' },
    { label: 'Goods Received', icon: PackageCheck, href: '/grn' },
    { label: 'Purchase Invoices', icon: ReceiptText, href: '/purchase-invoices' },
    { label: 'Purchase Returns', icon: RotateCcw, href: '/purchase-returns' },
    { label: 'Inventory', icon: Warehouse, href: '/inventory' },
    { label: 'Stock Adjustments', icon: SlidersHorizontal, href: '/stock-adjustments' },
  ],
}
```

### 3.2 Products Page

**Route**: `app/products/page.tsx`

Features:
- Search by name, SKU, barcode
- Filter by category, status
- Table: Product, Category, Batch, Expiry, Purchase Price, Selling Price, Available Stock, Min Stock, Supplier, Status
- Badges: 🟢 Healthy, 🟡 Low Stock, 🔴 Out of Stock, 🟠 Expiring Soon
- Create/Edit dialog with all product fields
- View product details

### 3.3 Suppliers Page

**Route**: `app/suppliers/page.tsx`

Features:
- Table with all supplier fields
- Create/Edit dialog
- View supplier profile (details + purchase history + payment history)
- Outstanding balance display
- Active/Inactive status toggle

### 3.4 Purchase Orders Page

**Route**: `app/purchase-orders/page.tsx`

Features:
- PO list with status badges
- Create PO dialog with:
  - Header: PO Number (auto), Date, Supplier (dropdown), Expected Delivery, Notes
  - Items table: Product, Quantity, Unit, Purchase Price, GST %, Discount
  - Auto-calculate subtotals
- Status transitions: Draft → Ordered → Partially Received → Completed → Cancelled
- Link to GRN creation

### 3.5 GRN Page

**Route**: `app/grn/page.tsx`

Features:
- GRN list
- Create GRN dialog with:
  - Header: GRN Number (auto), Linked PO (optional), Supplier, Received Date
  - Items: Product, Batch Number, Mfg Date, Expiry Date, Received Quantity
  - Auto-update inventory on save
- Batch creation logic

### 3.6 Purchase Invoices Page

**Route**: `app/purchase-invoices/page.tsx`

Features:
- Invoice list
- Create invoice dialog with:
  - Header: Invoice Number (auto), Invoice Date, Supplier, Payment Mode, Due Date
  - Items table
  - Summary: Subtotal, GST, Discount, Grand Total, Paid Amount, Balance
- Payment recording

### 3.7 Purchase Returns Page

**Route**: `app/purchase-returns/page.tsx`

Features:
- Return list
- Create return dialog:
  - Linked to Purchase Invoice
  - Products, Quantity, Reason
  - Auto-deduct stock on save

### 3.8 Inventory Page

**Route**: `app/inventory/page.tsx`

Features:
- Current stock table with all columns
- Search and barcode scan input
- Low stock alert section
- Near expiry alert section
- Click product to view stock movement history

### 3.9 Stock Adjustments Page

**Route**: `app/stock-adjustments/page.tsx`

Features:
- Adjustment list
- Create adjustment dialog:
  - Select Product (and batch if batch-enabled)
  - Reason dropdown: Damage, Expired, Lost, Manual Correction
  - Quantity, Type (In/Out)
  - Auto-create StockMovement record

### 3.10 Reports Page

**Route**: `app/reports/purchase/page.tsx`

Features:
- Purchase Report: Date filter, Supplier filter, Product filter
- Supplier Report: Outstanding, Total Purchase, Payments
- Inventory Report: Current Stock, Stock Value, Low Stock, Out of Stock
- Expiry Report: 30 Days, 60 Days, 90 Days, Expired
- Profit Report: Purchase Cost → Selling Price → Profit → Monthly Profit

### 3.11 Dashboard Widgets

Update `app/page.tsx` stat cards to include:
- Today's Purchase
- Monthly Purchase
- Pending Payments
- Low Stock Items
- Expiring Products
- Total Suppliers

---

## Phase 4 — Integration with Existing System

### 4.1 Prescription Integration

The existing `Prescription` model stores medicines as a `String` field. To integrate inventory:

**Option A (Recommended - Backward Compatible)**:
- Keep `Prescription.medicines` as string for backward compatibility
- Add a new API endpoint `/api/prescriptions/[id]/items` that parses medicines and returns structured data
- In the billing screen, show products from inventory when billing for medicines
- When creating an invoice with products, auto-create StockMovement entries

**Option B (Full Integration)**:
- Create a `PrescriptionItem` model linked to Product
- When doctor prescribes, select products from inventory
- Stock reduces on billing

### 4.2 Invoice Integration

When creating an `Invoice` with product items:
1. Check product is in stock
2. Deduct from Inventory.availableQty
3. Create StockMovement entry
4. If batch-enabled, use FEFO (First Expiry First Out) logic

### 4.3 Low Stock Warnings

- Dashboard widget showing low stock items
- In product selection dropdowns, show stock status
- Alert on billing if item is out of stock

---

## Phase 5 — Sequence Numbers

Create a sequence table for auto-generated numbers:

```prisma
model PurchaseSequence {
  id          String   @id @default("GLOBAL")
  lastNumber  Int      @default(0)
  updatedAt   DateTime @default(now())

  @@map("purchase_sequences")
}
```

Seed with:
```ts
await prisma.purchaseSequence.upsert({
  where: { id: 'GLOBAL' },
  update: {},
  create: { id: 'GLOBAL', lastNumber: 0 },
})
```

Numbering format:
- PO: `PO-YYYYMMDD-XXXX`
- GRN: `GRN-YYYYMMDD-XXXX`
- Invoice: `PINV-YYYYMMDD-XXXX`
- Return: `PRET-YYYYMMDD-XXXX`
- Payment: `PPAY-YYYYMMDD-XXXX`

---

## Phase 6 — Permission Model

Extend the existing role system. No new roles needed — all existing roles get full access to PMS.

Restrict only:
- User management → superadmin only (already done)
- Potentially: Purchase approval → admin/superadmin only (future enhancement)

Add `requireRole(['superadmin', 'admin'])` checks to:
- Supplier creation/editing
- Purchase order creation
- GRN creation
- Purchase invoice creation
- Stock adjustment

---

## Phase 7 — Implementation Order

### Week 1: Foundation
1. Add Prisma models + migration
2. Create number sequences
3. Create Products API (CRUD)
4. Create Suppliers API (CRUD)
5. Create Products page + Suppliers page
6. Update sidebar navigation

### Week 2: Purchase Flow
7. Create Purchase Orders API + page
8. Create GRN API + page
9. Create Purchase Invoices API + page
10. Create Supplier Payments API + page

### Week 3: Inventory & Returns
11. Create Inventory API + page
12. Create Batches API (implicit in GRN)
13. Create Stock Movements API
14. Create Stock Adjustments API + page
15. Create Purchase Returns API + page

### Week 4: Reports & Dashboard
16. Create Reports API + page
17. Extend Dashboard API + update widgets
18. Integration with Invoice (stock deduction)
19. Integration with Prescription (optional, Phase 2)
20. Testing and bug fixes

---

## Key Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 14 new models |
| `prisma/seed.ts` | Add PurchaseSequence seed |
| `lib/prisma.ts` | No change |
| `lib/session.ts` | No change |
| `components/dashboard/sidebar-nav.tsx` | Add Purchase & Inventory nav group |
| `app/page.tsx` | Add PMS dashboard widgets |
| `app/api/dashboard/route.ts` | Add purchase stats |
| `app/api/products/route.ts` | New |
| `app/api/products/[id]/route.ts` | New |
| `app/api/suppliers/route.ts` | New |
| `app/api/suppliers/[id]/route.ts` | New |
| `app/api/purchase-orders/route.ts` | New |
| `app/api/purchase-orders/[id]/route.ts` | New |
| `app/api/grn/route.ts` | New |
| `app/api/grn/[id]/route.ts` | New |
| `app/api/purchase-invoices/route.ts` | New |
| `app/api/purchase-invoices/[id]/route.ts` | New |
| `app/api/supplier-payments/route.ts` | New |
| `app/api/purchase-returns/route.ts` | New |
| `app/api/purchase-returns/[id]/route.ts` | New |
| `app/api/stock-movements/route.ts` | New |
| `app/api/stock-adjustments/route.ts` | New |
| `app/api/reports/purchase/route.ts` | New |
| `app/api/reports/stock/route.ts` | New |
| `app/api/reports/expiry/route.ts` | New |
| `app/api/reports/profit/route.ts` | New |
| `app/products/page.tsx` | New |
| `app/suppliers/page.tsx` | New |
| `app/purchase-orders/page.tsx` | New |
| `app/grn/page.tsx` | New |
| `app/purchase-invoices/page.tsx` | New |
| `app/purchase-returns/page.tsx` | New |
| `app/inventory/page.tsx` | New |
| `app/stock-adjustments/page.tsx` | New |
| `app/reports/purchase/page.tsx` | New |
| `app/reports/stock/page.tsx` | New |
| `app/reports/expiry/page.tsx` | New |
| `app/reports/profit/page.tsx` | New |

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Separate `Inventory` model | Avoids expensive COUNT queries on stock_movements; single source of truth for available qty |
| Separate `Batch` model | Enables FEFO expiry tracking; many batches per product |
| `PurchaseHistory` denormalized table | Fast supplier history queries without JOIN explosion |
| Auto-numbering via sequence table | Simple, no race conditions, format control |
| String fields for dates | Consistent with existing Invoice/Expense pattern |
| No new roles | Keeps auth simple; extend later if needed |
| Stock deduction on Invoice (not Prescription) | Existing prescription is text-based; billing is the transaction point |
| Batch creation on GRN | GRN is the authoritative "stock entering warehouse" event |

---

## Testing Strategy

1. **Unit tests**: Test API route handlers for CRUD operations
2. **Integration tests**: Test the full purchase flow (PO → GRN → Invoice → Stock update)
3. **Manual testing**:
   - Create product → create PO → GRN → Invoice → verify stock
   - Create stock adjustment → verify stock changes
   - Create purchase return → verify stock deduction
   - Check low stock and expiry alerts
   - Verify dashboard widgets update

---

## Rollout Strategy

1. **Stage 1**: Add schema, run migration, deploy to staging
2. **Stage 2**: Add Products + Suppliers pages (core master data)
3. **Stage 3**: Add purchase flow (PO → GRN → Invoice)
4. **Stage 4**: Add Inventory + Adjustments + Returns
5. **Stage 5**: Add Reports + Dashboard widgets
6. **Stage 6**: Integration with billing system
7. **Stage 7**: Production deployment

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Schema migration on production | Backup DB first; test migration on staging |
| Large schema change | Use `prisma migrate dev` not `db push` |
| Stock deduction errors | Add DB transaction wrapper on GRN/Invoice creation |
| Batch expiry logic complexity | Start simple (no auto-FEFO), add in Phase 2 |
| Existing Invoice integration | Backward compatible — keep existing Invoice model, add new logic |
