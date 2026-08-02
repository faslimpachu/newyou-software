# Inventory Adjustment — Implementation Plan

## Goal

Add an **Inventory Adjustment** module that lets staff increase or decrease stock manually, with full audit trail. This is the simplest way to keep inventory accurate without redesigning the existing billing system.

---

## Why This Approach

Current system state:
- Patient Management ✅
- Purchase Management ✅
- Inventory ✅
- Product-based billing ❌ (existing invoices store item names as text, not linked to Product)

Because existing `Invoice` items are not linked to `Product`, automatic stock deduction on sale is **not possible without redesigning billing**.

**Inventory Adjustment** solves this practically:
- Staff can record stock changes for any reason
- Full audit trail via `InventoryTransaction`
- No changes to existing `Patient`, `Invoice`, `Prescription` models
- Future-proof: when billing is integrated, manual "Sale" adjustments can be replaced by automatic transactions

---

## What We Are Building

A single new page + API:

```
Products → [Adjust Stock] dialog → Inventory Transaction created
                                        ↓
                                Stock increases or decreases
                                        ↓
                                Inventory History shows all changes
```

---

## Database Changes

**No schema changes needed.** We already have:
- `Product.currentStock` — the stock number
- `InventoryTransaction` — the audit trail with `type` and `referenceType`

We just need to use them.

---

## Adjustment Types

| Type | Direction | Use Case |
|------|-----------|----------|
| `PURCHASE` | Increase | Already handled by Purchase Invoice |
| `SALE` | Decrease | Manual sale record (until billing is integrated) |
| `ADJUSTMENT_IN` | Increase | Correction, found stock, opening stock |
| `ADJUSTMENT_OUT` | Decrease | Damage, expired, lost, manual correction |
| `RETURN_OUT` | Decrease | Return to supplier (future) |
| `EXPIRED` | Decrease | Expired stock |
| `DAMAGED` | Decrease | Damaged stock |
| `LOST` | Decrease | Lost stock |

For the adjustment dialog, we'll simplify to:

**Operation:** Increase / Decrease

**Reason:** Sale, Damage, Expired, Lost, Manual Correction, Opening Stock, Purchase Correction

---

## API Route

### POST /api/inventory-transactions

**File:** `app/api/inventory-transactions/route.ts` (extend existing)

**Request body:**
```json
{
  "productId": "uuid",
  "type": "ADJUSTMENT_IN",
  "quantity": 10,
  "referenceType": "ADJUSTMENT",
  "referenceId": null,
  "notes": "Opening stock entry"
}
```

**Logic:**
1. Validate `productId`, `type`, `quantity`
2. If `type` is increase type (`PURCHASE`, `ADJUSTMENT_IN`):
   - `Product.currentStock += quantity`
3. If `type` is decrease type (`SALE`, `ADJUSTMENT_OUT`, `EXPIRED`, `DAMAGED`, `LOST`, `RETURN_OUT`):
   - `Product.currentStock -= quantity`
   - Check: if result < 0, return error "Insufficient stock"
4. Create `InventoryTransaction` record
5. Return the created transaction

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "productId": "uuid",
    "type": "ADJUSTMENT_IN",
    "quantity": 10,
    "referenceType": "ADJUSTMENT",
    "notes": "Opening stock entry",
    "createdAt": "2026-08-02T00:00:00.000Z",
    "product": { "id": "uuid", "name": "Paracetamol", "sku": "MED001", "unit": "strip" }
  }
}
```

---

## UI Changes

### 1. Products Page — Add "Adjust Stock" Button

**File:** `app/products/page.tsx`

Add a button beside each product in the table:

```
Paracetamol 500mg | MED001 | Medicines | Stock: 100 | [Edit] [Adjust Stock]
```

**Adjust Stock Dialog:**
```
┌─────────────────────────────────────┐
│ Adjust Stock - Paracetamol 500mg    │
├─────────────────────────────────────┤
│ Current Stock: 100                  │
│                                     │
│ Operation:                          │
│ ○ Increase   ● Decrease             │
│                                     │
│ Reason:                             │
│ [Sale ▼]                            │
│                                     │
│ Quantity:                           │
│ [10]                                │
│                                     │
│ Notes:                              │
│ [Sold to walk-in customer]          │
│                                     │
│           [Cancel]  [Save]          │
└─────────────────────────────────────┘
```

**Fields:**
- Product (pre-filled, read-only)
- Current Stock (pre-filled, read-only)
- Operation: Radio buttons — Increase / Decrease
- Reason: Dropdown — Sale, Damage, Expired, Lost, Manual Correction, Opening Stock, Purchase Correction
- Quantity: Number input
- Notes: Text input

**On Save:**
1. POST to `/api/inventory-transactions`
2. Refresh products list
3. Show success toast

### 2. Inventory Transactions Page — Already Exists

The `/inventory-transactions` page already shows all stock movements with filters. No changes needed.

---

## Implementation Steps

### Step 1: Update API Route (15 min)

**File:** `app/api/inventory-transactions/route.ts`

Change from `GET` only to `GET` + `POST`:

```ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, type, quantity, referenceType, referenceId, notes } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: 'productId, type, and quantity are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const qty = Number(quantity);
    const isIncrease = ['PURCHASE', 'ADJUSTMENT_IN'].includes(type);

    return await prisma.$transaction(async (tx) => {
      if (isIncrease) {
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: { increment: qty } },
        });
      } else {
        const currentStock = Number(product.currentStock);
        if (currentStock < qty) {
          return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
        }
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: { decrement: qty } },
        });
      }

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantity: isIncrease ? qty : -qty,
          referenceType: referenceType || 'ADJUSTMENT',
          referenceId: referenceId || null,
          notes: notes?.trim() || null,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      });

      return NextResponse.json({ transaction }, { status: 201 });
    });
  } catch (e) {
    console.error('InventoryTransactions POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 2: Add Adjust Stock Dialog to Products Page (20 min)

**File:** `app/products/page.tsx`

Add:
- `adjustingProduct` state
- `showAdjustDialog` state
- `adjustForm` state
- `handleAdjustStock` function
- Dialog component

### Step 3: Test (10 min)

Test cases:
- Increase stock: currentStock 100 → 110, transaction created
- Decrease stock: currentStock 100 → 90, transaction created
- Decrease below zero: returns 400 error
- Invalid product: returns 404 error
- Inventory history shows the transaction

### Step 4: Update Tests (15 min)

Add POST tests to `tests/api/inventory-transactions.test.ts`:
- POST creates adjustment and updates stock
- POST returns 400 for insufficient stock
- POST returns 404 for invalid product

---

## Files to Modify

| File | Action |
|------|--------|
| `app/api/inventory-transactions/route.ts` | Add POST handler |
| `app/products/page.tsx` | Add Adjust Stock dialog |
| `tests/api/inventory-transactions.test.ts` | Add POST tests |

**Total: 3 files modified, 0 new files**

---

## What Happens When You Click "Adjust Stock"

1. Dialog opens with product name, current stock, operation radio buttons, reason dropdown, quantity input, notes
2. Staff selects Increase/Decrease, enters quantity, picks reason
3. On Save:
   - API validates product exists
   - If decrease: checks sufficient stock
   - Updates `Product.currentStock`
   - Creates `InventoryTransaction`
   - Returns success
4. Products table refreshes with new stock
5. `/inventory-transactions` page shows the entry

---

## Future Integration Path

When you're ready to integrate with billing:

1. Modify `InvoiceItem` to include optional `productId`
2. When invoice is created with product items:
   - Create `InventoryTransaction` with `type: SALE`
   - Decrease `Product.currentStock`
3. The manual "Sale" adjustment becomes automatic
4. No data migration needed — `InventoryTransaction` already supports `SALE` type

---

## Success Criteria

- [ ] `/api/inventory-transactions` POST creates adjustment
- [ ] Product stock increases on `ADJUSTMENT_IN`
- [ ] Product stock decreases on `ADJUSTMENT_OUT`, `SALE`, `DAMAGED`, `EXPIRED`, `LOST`
- [ ] Cannot decrease below zero
- [ ] Inventory transaction created with correct type and quantity
- [ ] Products page shows updated stock after adjustment
- [ ] Inventory History page shows the adjustment
- [ ] Tests pass
