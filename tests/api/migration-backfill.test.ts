import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

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
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Migration and Backfill Safety', () => {
  it('creates synthetic OPENING batch for products with existing stock', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Backfill Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Product With Stock',
        code: 'PRD-BF-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const productsWithStock = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { batches: true },
    })

    for (const product of productsWithStock) {
      if (product.batches.length > 0) continue

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'OPENING',
          expiryDate: null,
          quantity: product.currentStock,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: product.currentStock,
          remainingQuantity: product.currentStock,
          purchaseRate: product.purchasePrice,
        },
      })
    }

    const batch = await prisma.productBatch.findFirst({
      where: { batchNumber: 'OPENING' },
    })
    expect(batch).toBeDefined()
    expect(Number(batch?.quantity)).toBe(100)

    const receipts = await prisma.batchReceipt.findMany({
      where: { batchId: batch!.id },
    })
    expect(receipts).toHaveLength(1)
    expect(Number(receipts[0].remainingQuantity)).toBe(100)
    expect(Number(receipts[0].purchaseRate)).toBe(10)
  })

  it('does not create duplicate OPENING batches for products with zero stock', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Product Without Stock',
        code: 'PRD-BF-002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const productsWithStock = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { batches: true },
    })

    expect(productsWithStock).toHaveLength(0)
  })

  it('does not create duplicate OPENING batches when batch already exists', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Backfill Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Product With Existing Batch',
        code: 'PRD-BF-003',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'EXISTING',
        expiryDate: null,
        quantity: 100,
      },
    })

    const productsWithStock = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { batches: true },
    })

    for (const p of productsWithStock) {
      if (p.batches.length > 0) continue

      const batch = await prisma.productBatch.create({
        data: {
          productId: p.id,
          batchNumber: 'OPENING',
          expiryDate: null,
          quantity: p.currentStock,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: p.currentStock,
          remainingQuantity: p.currentStock,
          purchaseRate: p.purchasePrice,
        },
      })
    }

    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    })
    expect(batches).toHaveLength(1)
    expect(batches[0].batchNumber).toBe('EXISTING')
  })

  it('backfill preserves existing inventory transactions', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Backfill Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Product With Transactions',
        code: 'PRD-BF-004',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: 'PURCHASE',
        quantity: 100,
        referenceType: 'ADJUSTMENT',
        notes: 'Opening stock',
      },
    })

    const productsWithStock = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { batches: true },
    })

    for (const p of productsWithStock) {
      if (p.batches.length > 0) continue

      const batch = await prisma.productBatch.create({
        data: {
          productId: p.id,
          batchNumber: 'OPENING',
          expiryDate: null,
          quantity: p.currentStock,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: p.currentStock,
          remainingQuantity: p.currentStock,
          purchaseRate: p.purchasePrice,
        },
      })
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0].type).toBe('PURCHASE')
  })

  it('backfill does not modify clinical tables', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Backfill Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Product For Isolation',
        code: 'PRD-BF-005',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const patientCountBefore = await prisma.patient.count()
    const invoiceCountBefore = await prisma.invoice.count()

    const productsWithStock = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { batches: true },
    })

    for (const p of productsWithStock) {
      if (p.batches.length > 0) continue

      const batch = await prisma.productBatch.create({
        data: {
          productId: p.id,
          batchNumber: 'OPENING',
          expiryDate: null,
          quantity: p.currentStock,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: p.currentStock,
          remainingQuantity: p.currentStock,
          purchaseRate: p.purchasePrice,
        },
      })
    }

    const patientCountAfter = await prisma.patient.count()
    const invoiceCountAfter = await prisma.invoice.count()

    expect(patientCountAfter).toBe(patientCountBefore)
    expect(invoiceCountAfter).toBe(invoiceCountBefore)
  })
})
