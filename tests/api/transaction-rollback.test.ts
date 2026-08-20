import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { POST as AdjustmentPost } from '@/app/api/inventory-adjustments/route'
import { consumeStock } from '@/lib/inventory-service'

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

describe('Transaction Rollback Tests', () => {
  it('purchase invoice rollback: no orphaned batches or transactions on failure', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-ROLL-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [
          { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-ROLL' },
          { productId: 'non-existent-product-id', quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-ROLL2' },
        ],
      }),
    })

    const res = await PurchasePost(req)
    expect(res.status).toBe(400)

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(0)

    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    })
    expect(batches).toHaveLength(0)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
    })
    expect(transactions).toHaveLength(0)

    const invoices = await prisma.purchaseInvoice.findMany()
    expect(invoices).toHaveLength(0)
  })

  it('consumeStock rollback: no partial consumption on failure', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-ROLL-002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 200,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const batch1 = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-ROLL-A',
        expiryDate: new Date('2026-12-31'),
        quantity: 100,
      },
    })

    const batch2 = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-ROLL-B',
        expiryDate: new Date('2027-06-30'),
        quantity: 100,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch1.id,
        supplierId: supplier.id,
        sourceType: 'PURCHASE',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 10,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch2.id,
        supplierId: supplier.id,
        sourceType: 'PURCHASE',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 12,
      },
    })

    await expect(
      consumeStock({
        productId: 'non-existent-product-id',
        quantity: 50,
      })
    ).rejects.toThrow('Product not found')

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(200)

    const batch1After = await prisma.productBatch.findUnique({ where: { id: batch1.id } })
    const batch2After = await prisma.productBatch.findUnique({ where: { id: batch2.id } })
    expect(Number(batch1After?.quantity)).toBe(100)
    expect(Number(batch2After?.quantity)).toBe(100)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
    })
    expect(transactions).toHaveLength(0)
  })

  it('adjustment rollback: no stock change when transaction creation fails', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-ROLL-003',
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
        batchNumber: 'BATCH-ROLL',
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

    const req = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 150,
        batchId: batch.id,
      }),
    })

    const res = await AdjustmentPost(req)
    expect(res.status).toBe(400)

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(100)

    const batchAfter = await prisma.productBatch.findUnique({ where: { id: batch.id } })
    expect(Number(batchAfter?.quantity)).toBe(100)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
    })
    expect(transactions).toHaveLength(0)
  })
})
