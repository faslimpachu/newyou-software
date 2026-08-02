# Purchase & Inventory — Critical Bug Fixes

## Scope

Fix 5 high-priority bugs in the Purchase & Inventory module:

1. Race condition in inventory stock checks
2. Overpayment not prevented in supplier payments
3. Orphan supplier payments when invoice does not exist
4. Decimal precision loss via JavaScript `Number()` conversions
5. Missing positive-value validations on financial inputs

No feature additions. No schema changes. No UI changes unless necessary for validation feedback.

---

## Files to Change

| File | Change Type |
|------|------------|
| `lib/api-helpers.ts` | Add `ValidationError` class |
| `app/api/inventory-adjustments/route.ts` | Fix race condition + quantity validation |
| `app/api/supplier-payments/route.ts` | Prevent overpayment + prevent orphan payment + amount validation + supplier match validation |
| `app/api/purchase-invoices/route.ts` | Decimal precision + input validation + product existence validation |
| `app/api/products/route.ts` | Decimal precision cleanup |
| `app/api/products/[id]/route.ts` | Decimal precision cleanup |
| `app/api/suppliers/[id]/route.ts` | Decimal precision cleanup |
| `app/api/dashboard/route.ts` | Decimal precision cleanup |
| `app/api/inventory-transactions/route.ts` | Decimal precision cleanup |

---

## Shared Error Class

**File:** `lib/api-helpers.ts`

Add a shared `ValidationError` class that all routes can use. This avoids defining the same class in every route file and keeps error mapping consistent.

```ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

Import it in each affected route:

```ts
import { ValidationError } from '@/lib/api-helpers'
```

In each route's outer catch block, map it to 400:

```ts
} catch (e: unknown) {
  if (e instanceof ValidationError) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  console.error('Route error', e)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

## Fix 1: Race Condition in Inventory Adjustment

**File:** `app/api/inventory-adjustments/route.ts`

**Current problem:**
```ts
const product = await prisma.product.findUnique({ where: { id: productId } })
// ... gap ...
if (isDecrease && Number(product.currentStock) < qty) {
  return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
}
// ... gap ...
await tx.product.update({ ... })
```

Stock check happens outside the transaction. Two concurrent requests can both pass the check before either updates stock, resulting in negative stock.

**Fix:**
Use a conditional `updateMany` so the stock check and decrement happen in a single atomic SQL statement. This eliminates the lost-update race condition on MySQL without requiring schema changes.

```ts
const adjustment = await prisma.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) {
    throw new ValidationError('Product not found')
  }

  const qty = new Prisma.Decimal(quantity)
  if (qty.lessThanOrEqualTo(0)) {
    throw new ValidationError('Quantity must be greater than zero')
  }

  const isDecrease = decreaseTypes.includes(type)

  if (isDecrease) {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        currentStock: { gte: qty },
      },
      data: { currentStock: { decrement: qty.toNumber() } },
    })

    if (result.count === 0) {
      throw new ValidationError('Insufficient stock')
    }
  } else {
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: { increment: qty.toNumber() } },
    })
  }

  return tx.inventoryTransaction.create({ ... })
})
```

### Transaction Safety Note

Current deployment: MySQL.

Prisma `$transaction` guarantees atomicity, but plain `findUnique` + `update` sequences are still vulnerable to lost-update races under concurrent writes. For inventory decrement operations, prefer a conditional `UPDATE ... WHERE currentStock >= qty` via `updateMany`, which lets MySQL enforce the stock constraint atomically. The `affectedRows` count tells you whether the decrement succeeded.

If future concurrency increases significantly, optimistic locking using a `version` column can still be added later.

---

## Fix 2: Prevent Overpayment

**File:** `app/api/supplier-payments/route.ts`

**Current problem:**
```ts
const newPaid = Number(invoice.paid) + Number(amount)
const newBalance = Number(invoice.grandTotal) - newPaid
// No check — newBalance can be negative
```

**Fix:**
After fetching the invoice inside the transaction, validate before updating:

```ts
const amount = new Prisma.Decimal(body.amount)
if (amount.greaterThan(invoice.balance)) {
  throw new ValidationError(`Payment amount exceeds outstanding balance of ${invoice.balance}`)
}
```

Reject with 400. Do not allow overpayment in Phase 1. Support advance payments as a separate feature later.

Also reject `amount <= 0`:

```ts
if (amount.lessThanOrEqualTo(0)) {
  throw new ValidationError('Payment amount must be greater than zero')
}
```

---

## Fix 3: Prevent Orphan Payments + Supplier Mismatch

**File:** `app/api/supplier-payments/route.ts`

### 3a. Orphan Payment

**Current problem:**
Payment is created first. Invoice is looked up second. If invoice doesn't exist, payment is already persisted with no related invoice update. The payment becomes orphaned.

**Fix:**
Restructure so the invoice lookup and validation happen first, inside the transaction, before any create:

```ts
const payment = await prisma.$transaction(async (tx) => {
  if (invoiceId) {
    const invoice = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      throw new ValidationError('Purchase invoice not found')
    }

    const amount = new Prisma.Decimal(body.amount)
    if (amount.greaterThan(invoice.balance)) {
      throw new ValidationError(`Payment amount exceeds outstanding balance of ${invoice.balance}`)
    }

    if (invoice.supplierId !== supplierId) {
      throw new ValidationError('Payment supplier does not match the invoice supplier')
    }

    const newPaid = new Prisma.Decimal(invoice.paid).plus(amount)
    const newBalance = new Prisma.Decimal(invoice.grandTotal).minus(newPaid)
    let status = 'PENDING'
    if (newBalance.lessThanOrEqualTo(0)) {
      status = 'PAID'
    } else if (newPaid.greaterThan(0)) {
      status = 'PARTIAL'
    }

    const createdPayment = await tx.supplierPayment.create({ ... })

    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        paid: newPaid.toNumber(),
        balance: newBalance.toNumber(),
        status: status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
      },
    })

    return createdPayment
  }

  // No invoiceId — just create the payment
  return tx.supplierPayment.create({ ... })
})
```

When `invoiceId` is not provided, create the payment without touching any invoice. When `invoiceId` is provided, validate the invoice exists first, then create both records atomically.

### 3b. Supplier Mismatch

Before applying the payment to the invoice, verify the payment's `supplierId` matches the invoice's `supplierId`:

```ts
if (invoice.supplierId !== supplierId) {
  throw new ValidationError('Payment supplier does not match the invoice supplier')
}
```

This prevents accidentally attaching a payment from Supplier A to Supplier B's invoice, which would corrupt both supplier ledgers.

---

## Fix 4: Decimal Precision

**Current problem:**
All API routes convert Prisma `Decimal` values to JavaScript `number` via `Number(value || 0)` before returning JSON. This is acceptable for JSON serialization, but the problem is that arithmetic operations and comparisons are done on raw JS numbers throughout the business logic.

**Affected files:**
- `app/api/purchase-invoices/route.ts`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/suppliers/[id]/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/inventory-transactions/route.ts`

**Fix approach:**
Use Prisma's built-in `Decimal` arithmetic operations. When a raw number is needed for JSON response, convert at the serialization boundary only. Do not add `decimal.js` as a dependency.

Import Prisma's Decimal class:
```ts
import { Prisma } from '@prisma/client'
```

Use `Prisma.Decimal` for arithmetic and comparisons.

### Pattern: Use Decimal arithmetic in calculations

**Purchase Invoices (`app/api/purchase-invoices/route.ts`):**

Current:
```ts
const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.purchaseRate), 0)
const tax = subtotal * 0.12
const grandTotal = subtotal + tax
```

Fix:
```ts
const subtotal = items.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.quantity).times(item.purchaseRate)), new Prisma.Decimal(0))
const tax = new Prisma.Decimal(subtotal).times(0.12)
const grandTotal = new Prisma.Decimal(subtotal).plus(tax)
```

### Pattern: Compare Decimals, not Numbers

**Supplier Payments (`app/api/supplier-payments/route.ts`):**

Current:
```ts
if (Number(amount) > Number(invoice.balance)) {
```

Fix:
```ts
if (new Prisma.Decimal(amount).greaterThan(invoice.balance)) {
```

### Pattern: Convert to Number only at JSON boundary

Keep `toNumber()` helper for the response mapping only. Do not use it inside business logic calculations.

```ts
function toNumber(value: unknown): number {
  return Number(value || 0)
}

// Use only in response mapping, not in calculations
return NextResponse.json({
  invoice: {
    ...fullInvoice,
    subtotal: toNumber(fullInvoice.subtotal),   // boundary
    // ...
  }
})
```

### Pattern: Dashboard aggregations

**Dashboard (`app/api/dashboard/route.ts`):**

Current:
```ts
const lowStockItems = lowStockProducts.filter((p) => Number(p.currentStock) < p.minimumStock).length
```

Fix:
```ts
const lowStockItems = lowStockProducts.filter((p) => new Prisma.Decimal(p.currentStock).lessThan(p.minimumStock)).length
```

---

## Fix 5: Input Validation

**Files:**
- `app/api/purchase-invoices/route.ts`
- `app/api/supplier-payments/route.ts`
- `app/api/inventory-adjustments/route.ts`

Add positive-value checks and existence checks to prevent bad data from entering the database.

### Purchase Invoice (`app/api/purchase-invoices/route.ts`)

Validate each item before entering the transaction. Use a single `findMany` to validate all products at once instead of N individual queries:

```ts
const productIds = items.map(item => item.productId)
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
})

const foundIds = new Set(products.map(p => p.id))
const missingIds = productIds.filter(id => !foundIds.has(id))
if (missingIds.length > 0) {
  throw new ValidationError(`Products not found: ${missingIds.join(', ')}`)
}
```

Then validate each item's numeric values using `Prisma.Decimal`:

```ts
for (const item of items) {
  const quantity = new Prisma.Decimal(item.quantity)
  const purchaseRate = new Prisma.Decimal(item.purchaseRate)

  if (quantity.lessThanOrEqualTo(0)) {
    throw new ValidationError('Quantity must be greater than zero')
  }
  if (purchaseRate.lessThanOrEqualTo(0)) {
    throw new ValidationError('Purchase rate must be greater than zero')
  }

  const amount = quantity.times(purchaseRate)
  // ...
}
```

Validate supplier exists before starting the transaction, and validate products using a single query:

```ts
const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
if (!supplier) {
  throw new ValidationError('Supplier not found')
}
```

Also reject empty `items` array before entering the transaction. The current check `items.length === 0` is correct; keep it.

**Duplicate product rule:**
Make this configurable via environment variable so the clinic can change behavior without code changes.

```ts
const enforceUniqueProducts = process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS === 'true'
if (enforceUniqueProducts) {
  const productIds = items.map(item => item.productId)
  const uniqueProductIds = new Set(productIds)
  if (uniqueProductIds.size !== productIds.length) {
    return NextResponse.json({ error: 'Duplicate products are not allowed in the same invoice' }, { status: 400 })
  }
}
```

If `enforceUniqueProducts` is `false` or unset, allow duplicate product lines. If `true`, reject them. A future settings table can replace the env var.

### Supplier Payment (`app/api/supplier-payments/route.ts`)

```ts
const amount = new Prisma.Decimal(body.amount)
if (amount.lessThanOrEqualTo(0)) {
  throw new ValidationError('Payment amount must be greater than zero')
}
```

### Inventory Adjustment (`app/api/inventory-adjustments/route.ts`)

```ts
const qty = new Prisma.Decimal(quantity)
if (qty.lessThanOrEqualTo(0)) {
  throw new ValidationError('Quantity must be greater than zero')
}
```

---

## Business Rules

These rules are enforced by the fixes in this plan. Future developers should treat them as invariants.

| Rule | Enforcement Location |
|------|---------------------|
| Payment cannot exceed invoice balance | `supplier-payments/route.ts` |
| Payment supplier must match invoice supplier | `supplier-payments/route.ts` |
| Quantity must be > 0 | `purchase-invoices/route.ts`, `inventory-adjustments/route.ts` |
| Purchase rate must be > 0 | `purchase-invoices/route.ts` |
| Payment amount must be > 0 | `supplier-payments/route.ts` |
| Inventory cannot become negative | `inventory-adjustments/route.ts` |
| Supplier must exist before invoice creation | `purchase-invoices/route.ts` |
| Product must exist before invoice creation | `purchase-invoices/route.ts` |
| Product must exist before adjustment | `inventory-adjustments/route.ts` |
| Duplicate product lines: configurable via `ENFORCE_UNIQUE_PURCHASE_PRODUCTS` | `purchase-invoices/route.ts` |
| Decimal values remain Decimal until JSON serialization | All purchase & inventory routes |

---

## Decimal Usage Guideline

Use `Prisma.Decimal` as the default type for all monetary and quantity values inside business logic. Only convert to `Number` when serializing to JSON.

```ts
import { Prisma } from '@prisma/client'

// Request body values
const quantity = new Prisma.Decimal(item.quantity)
const purchaseRate = new Prisma.Decimal(item.purchaseRate)

// Arithmetic
const subtotal = quantity.times(purchaseRate)
const tax = subtotal.times(0.12)
const grandTotal = subtotal.plus(tax)

// Comparisons
if (new Prisma.Decimal(product.currentStock).lessThan(quantity)) { ... }
if (new Prisma.Decimal(amount).greaterThan(invoice.balance)) { ... }

// JSON serialization boundary
return NextResponse.json({
  ...fullInvoice,
  subtotal: toNumber(fullInvoice.subtotal),
})
```

When Prisma returns a `Decimal` from the database, use its methods directly: `.plus()`, `.minus()`, `.times()`, `.div()`, `.greaterThan()`, `.lessThan()`, `.lessThanOrEqualTo()`, `.greaterThanOrEqualTo()`, `.toNumber()`.

Avoid JS comparison operators (`<=`, `>=`, `<`, `>`) on `Prisma.Decimal` instances. Use the Decimal methods instead.

Avoid `Number()` inside:
- Arithmetic chains
- Transaction logic
- Validation checks that compare monetary values

---

## Migration Order

| Step | Action |
|------|--------|
| 1 | Add `ValidationError` class to `lib/api-helpers.ts` |
| 2 | Fix race condition in `inventory-adjustments/route.ts` using `updateMany` with `gte` condition |
| 3 | Fix overpayment + orphan payment + supplier mismatch in `supplier-payments/route.ts` |
| 4 | Fix Decimal precision in `purchase-invoices/route.ts` |
| 5 | Fix Decimal precision in `products/route.ts` and `products/[id]/route.ts` |
| 6 | Fix Decimal precision in `suppliers/[id]/route.ts` |
| 7 | Fix Decimal precision in `dashboard/route.ts` |
| 8 | Fix Decimal precision in `inventory-transactions/route.ts` |
| 9 | Add positive-value and existence validation to all three affected routes |
| 10 | Run existing tests to verify no regressions |

---

## Verification

```bash
npm test
```

Tests to watch:
- `tests/api/purchase-invoices.test.ts` — verify invoice creation still works
- `tests/api/inventory-adjustments.test.ts` — verify stock update still works
- `tests/api/inventory-transactions.test.ts` — verify transaction listing still works

---

## Out of Scope

- No schema changes
- No new endpoints
- No new UI components
- No batch/expiry tracking
- No sale invoice integration
- No return invoice workflow
