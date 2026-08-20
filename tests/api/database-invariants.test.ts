import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { POST as AdjustmentPost } from '@/app/api/inventory-adjustments/route'
import { POST as ConsumePost } from '@/app/api/inventory/consume/route'
import { receiveStock, adjustStock, consumeStock } from '@/lib/inventory-service'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.productSequence.deleteMany()
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Database Invariant Tests', () => {
  it('Product.currentStock equals sum of ProductBatch.quantity after purchase', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Invariant Product',
        code: 'PRD-INV-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-INV-1' },
            { productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'BATCH-INV-2' },
          ],
        }),
      })
    )

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    const batchQtySum = batches.reduce((sum, b) => sum + Number(b.quantity), 0)
    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(batchQtySum)
  })

  it('ProductBatch.quantity equals sum of BatchReceipt.remainingQuantity after operations', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Receipt Invariant Product',
        code: 'PRD-INV-002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-INV' }],
        }),
      })
    )

    await receiveStock({
      productId: product.id,
      quantity: 100,
      batchNumber: 'BATCH-INV-2',
      supplierId: supplier.id,
      purchaseInvoiceId: null,
      purchaseRate: 10,
    })

    let batch = await prisma.productBatch.findFirst({ where: { productId: product.id } })
    let receipts = await prisma.batchReceipt.findMany({ where: { batchId: batch!.id } })
    let receiptSum = receipts.reduce((sum, r) => sum + Number(r.remainingQuantity), 0)
    expect(Number(batch!.quantity)).toBe(receiptSum)

    await adjustStock({
      productId: product.id,
      type: 'ADJUSTMENT_OUT',
      quantity: 30,
      batchId: batch!.id,
    })

    batch = await prisma.productBatch.findFirst({ where: { productId: product.id } })
    receipts = await prisma.batchReceipt.findMany({ where: { batchId: batch!.id } })
    receiptSum = receipts.reduce((sum, r) => sum + Number(r.remainingQuantity), 0)
    expect(Number(batch!.quantity)).toBe(receiptSum)
  })

  it('no negative quantities after concurrent operations', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'No Negative Product',
        code: 'PRD-INV-003',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-INV',
        expiryDate: null,
        quantity: 100,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch.id,
        supplierId: supplier.id,
        sourceType: 'OPENING',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 10,
      },
    })

    const reqA = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 80,
        batchId: batch.id,
      }),
    })

    const reqB = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 80,
        batchId: batch.id,
      }),
    })

    const [resA, resB] = await Promise.all([AdjustmentPost(reqA), AdjustmentPost(reqB)])

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    const batchAfter = await prisma.productBatch.findUnique({ where: { id: batch.id } })
    const receiptAfter = await prisma.batchReceipt.findFirst({ where: { batchId: batch.id } })

    expect(Number(productAfter?.currentStock)).toBeGreaterThanOrEqual(0)
    expect(Number(batchAfter?.quantity)).toBeGreaterThanOrEqual(0)
    expect(Number(receiptAfter?.remainingQuantity)).toBeGreaterThanOrEqual(0)
  })

  it('expired batch is rejected by consumeStock API', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Expired Batch Product',
        code: 'PRD-INV-004',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-EXPIRED',
        expiryDate: new Date('2020-01-01'),
        quantity: 100,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch.id,
        supplierId: supplier.id,
        sourceType: 'PURCHASE',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 10,
      },
    })

    const req = new Request('http://localhost/api/inventory/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        quantity: 10,
      }),
    })
    const res = await ConsumePost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('No available stock')
  })

  it('same batch number with same expiry reuses batch', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Same Batch Product',
        code: 'PRD-INV-005',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const expiryDate = '2026-12-31'
    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'SAME-BATCH', expiryDate }],
        }),
      })
    )

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'SAME-BATCH', expiryDate }],
        }),
      })
    )

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(1)
    expect(Number(batches[0].quantity)).toBe(80)

    const receipts = await prisma.batchReceipt.findMany({ where: { batchId: batches[0].id } })
    expect(receipts).toHaveLength(2)
  })

  it('same batch number with different expiry is rejected', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Diff Expiry Product',
        code: 'PRD-INV-006',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'DIFF-EXP', expiryDate: '2026-12-31' }],
        }),
      })
    )

    const res = await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'DIFF-EXP', expiryDate: '2027-06-30' }],
        }),
      })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('different expiry date')
  })
})
