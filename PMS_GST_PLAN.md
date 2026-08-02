# Purchase Invoice GST — Implementation Plan

## Goal

Replace hardcoded `tax = subtotal * 0.12` with GST calculation using existing `Product.gstPercent`. No new fields. No schema changes. No line-item UI changes.

---

## Current Problem

**File:** `app/api/purchase-invoices/route.ts`

```ts
const tax = subtotal.times(0.12)  // Wrong: assumes 12% for everything
```

Every product has `gstPercent` on `Product`, but it is never used. The system applies 12% universally regardless of product type.

---

## Decision: Use Existing `Product.gstPercent`

The `Product` model already contains:

```prisma
gstPercent Decimal @default(0)
```

This field exists for exactly this purpose. Do not add a new `gstRate` field to `PurchaseInvoice`. That would create two sources of truth and cause confusion.

Instead, calculate GST per invoice line using each product's `gstPercent`, then sum for the invoice total.

---

## Accounting Invariant

The values `subtotal`, `tax`, and `grandTotal` stored on `PurchaseInvoice` are **accounting values**. They must **never** be recalculated from `Product.gstPercent` after invoice creation. Once a purchase invoice is created, its tax values are immutable. Future developers must not introduce logic that reads the current product GST and regenerates invoice totals. The values `subtotal`, `tax`, and `grandTotal` stored on `PurchaseInvoice` are the source of truth for historical reporting. Product GST values are used only during invoice creation.

---

## Calculation Logic

For each invoice item:

```
lineAmount = quantity × purchaseRate
lineTax    = lineAmount × (product.gstPercent / 100)
invoiceTax = sum of all lineTax values
grandTotal = subtotal + invoiceTax
```

### Example

| Product | Qty | Rate | gstPercent | Amount | Tax |
|---------|-----|------|------------|--------|-----|
| Paracetamol | 10 | 8 | 5% | 80 | 4 |
| Amoxicillin | 5 | 25 | 5% | 125 | 6.25 |
| Vitamin D3 | 2 | 80 | 12% | 160 | 19.20 |
| Digital BP Monitor | 1 | 1200 | 18% | 1200 | 216 |

```
subtotal  = 1565
tax       = 4 + 6.25 + 19.20 + 216 = 245.45
grandTotal = 1810.45
```

---

## Files to Change

| File | Change |
|------|--------|
| `app/api/purchase-invoices/route.ts` | Replace hardcoded `0.12` with per-line GST calculation using `Prisma.Decimal` |
| `tests/api/purchase-invoices.test.ts` | Add tests for mixed GST rates, zero GST, fractional GST, and verify `gstPercent` is read from product |

---

## Implementation

**File:** `app/api/purchase-invoices/route.ts`

### 1. Update product pre-validation query

Current:

```ts
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
})

const foundIds = new Set(products.map(p => p.id))
const missingIds = productIds.filter((id: string) => !foundIds.has(id))
if (missingIds.length > 0) {
  throw new ValidationError(`Products not found: ${missingIds.join(', ')}`)
}
```

Replace with:

```ts
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id: true, gstPercent: true },
})

const foundIds = new Set(products.map(p => p.id))
const missingIds = productIds.filter((id: string) => !foundIds.has(id))
if (missingIds.length > 0) {
  throw new ValidationError(`Products not found: ${missingIds.join(', ')}`)
}

const productMap = new Map<string, Prisma.Decimal>(
  products.map(product => [
    product.id,
    product.gstPercent ?? new Prisma.Decimal(0),
  ])
)
```

### 2. Validate GST percent range using the same fetched collection

```ts
for (const product of products) {
  const gstPercent = product.gstPercent ?? new Prisma.Decimal(0)
  if (gstPercent.lessThan(0) || gstPercent.greaterThan(100)) {
    throw new ValidationError(`Invalid GST percent for product: ${gstPercent}`)
  }
}
```

### 3. Replace hardcoded tax calculation

Current:

```ts
const subtotal = items.reduce((sum: Prisma.Decimal, item: { quantity: number; purchaseRate: number }) => sum.plus(new Prisma.Decimal(item.quantity).times(item.purchaseRate)), new Prisma.Decimal(0))
const tax = new Prisma.Decimal(subtotal).times(0.12)
const grandTotal = new Prisma.Decimal(subtotal).plus(tax)
const balance = new Prisma.Decimal(grandTotal)
```

Replace with:

```ts
const totals = items.reduce(
  (acc, item) => {
    const lineAmount = new Prisma.Decimal(item.quantity).times(item.purchaseRate)
    const gst = productMap.get(item.productId) ?? new Prisma.Decimal(0)
    return {
      subtotal: acc.subtotal.plus(lineAmount),
      tax: acc.tax.plus(lineAmount.times(gst).div(100)),
    }
  },
  {
    subtotal: new Prisma.Decimal(0),
    tax: new Prisma.Decimal(0),
  }
)

const subtotal = totals.subtotal
const tax = totals.tax
const grandTotal = subtotal.plus(tax)
const balance = grandTotal
```

This computes each line amount once and accumulates both subtotal and tax in a single pass.

---

## Key Points

- `productMap` is built from the single pre-validation query — no second DB call
- `productMap.get(item.productId)` returns the product's `gstPercent` as a `Prisma.Decimal`
- `?? new Prisma.Decimal(0)` fallback if product GST is null
- All arithmetic stays in `Prisma.Decimal`. Convert to `Number` only at JSON boundary.
- GST validation uses `Prisma.Decimal` comparison methods: `.lessThan(0)`, `.greaterThan(100)`
- Both `subtotal` and `tax` use `reduce` for consistent style

---

## Tests to Add

**File:** `tests/api/purchase-invoices.test.ts`

1. **Mixed GST rates** — Create products with different `gstPercent` values (5%, 12%, 18%), create invoice, verify `tax` and `grandTotal` are calculated correctly per line.

2. **Zero GST product** — Product with `gstPercent: 0`, verify no tax added for that line.

3. **GST Percent preserved on product** — After invoice creation, verify `Product.gstPercent` is unchanged.

4. **Default GST 0** — Product with no explicit `gstPercent`, verify tax is 0 for that line.

5. **All 5% GST** — All products at 5%, verify tax equals `subtotal * 0.05`.

6. **All 18% GST** — All products at 18%, verify tax equals `subtotal * 0.18`.

7. **Fractional GST rate** — Product with `gstPercent: 12.5`, verify Decimal arithmetic handles fractional rates correctly (e.g., amount 100 × 12.5% = 12.50 tax).

8. **Empty items array** — Submit purchase invoice with `items: []`, expect 400 status with message `Purchase invoice must contain at least one item`.

---

## What Does NOT Change

| Item | Status |
|------|--------|
| `Product.gstPercent` | Used for GST calculation — no change |
| `PurchaseInvoiceItem` | No new fields added |
| `PurchaseInvoice` | No new fields added |
| `Product.sellingPrice` | Remains manual |
| `Product.purchasePrice` | Auto-updates from latest `purchaseRate` |
| UI form | No GST field added to invoice form — calculation is automatic |

---

## Backlog: Product GST Validation

Invalid GST should never reach Purchase Invoice. The same GST percent range check (`0 ≤ gstPercent ≤ 100`) should be added to:

- `POST /api/products`
- `PUT /api/products/:id`

This prevents values like `gstPercent: 150` from being saved to the database. Not part of Phase 1; track separately.

---

## Future Enhancement (Not Phase 1)

**Problem:** If a product's `gstPercent` is updated after invoice creation, historical invoices would show the new rate if recalculated.

**Solution:** Add `gstPercentApplied` to `PurchaseInvoiceItem` to preserve the GST rate at the time of purchase:

```prisma
model PurchaseInvoiceItem {
  id              String  @id @default(uuid())
  invoiceId       String
  productId       String
  quantity        Decimal
  purchaseRate    Decimal
  amount          Decimal
  gstPercentApplied Decimal @default(0)  // Future: stores gstPercent at time of invoice
}
```

`gstPercentApplied` should be populated from `Product.gstPercent` at invoice creation time and must never be updated afterwards.

This is not required for Phase 1. Current invoices store only the calculated `tax` total on the invoice, which is sufficient as long as invoices are not recalculated from product data after creation.

---

## Migration Order

| Step | Action |
|------|--------|
| 1 | Update product pre-validation query to include `gstPercent` and build `productMap` |
| 2 | Validate GST percent range using the same fetched products collection with `Prisma.Decimal` comparisons |
| 3 | Replace hardcoded `0.12` tax calculation with per-line GST `reduce` using `productMap` |
| 4 | Ensure all Decimal arithmetic uses `Prisma.Decimal` methods |
| 5 | Add tests for mixed GST, zero GST, single-rate GST, fractional GST, and product preservation |
| 6 | Run full test suite and build |

---

## Verification

```bash
npm test
npm run build
```
