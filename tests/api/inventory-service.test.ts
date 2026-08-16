import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  receiveStock,
  adjustStock,
  consumeStock,
  getProductBatches,
  getInventoryValue,
  getExpiryStats,
} from '@/lib/inventory-service'

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
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Inventory Service', () => {
  describe('receiveStock', () => {
    it('creates a new batch and stock on first purchase', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      await receiveStock({
        productId: product.id,
        quantity: 50,
        batchNumber: 'BATCH-001',
        supplierId: supplier.id,
        purchaseInvoiceId: null as any,
        expiryDate: new Date('2026-12-31'),
        purchaseRate: 10,
      })

      const batches = await prisma.productBatch.findMany({
        where: { productId: product.id },
      })
      expect(batches).toHaveLength(1)
      expect(Number(batches[0].quantity)).toBe(50)

      const receipts = await prisma.batchReceipt.findMany({
        where: { batchId: batches[0].id },
      })
      expect(receipts).toHaveLength(1)
      expect(Number(receipts[0].remainingQuantity)).toBe(50)
      expect(Number(receipts[0].purchaseRate)).toBe(10)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBe(50)

      const transactions = await prisma.inventoryTransaction.findMany({
        where: { productId: product.id },
      })
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('PURCHASE')
      expect(Number(transactions[0].quantity)).toBe(50)
      expect(transactions[0].batchId).toBe(batches[0].id)
    })

    it('updates existing batch when same batchNumber is purchased again', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      await receiveStock({
        productId: product.id,
        quantity: 50,
        batchNumber: 'BATCH-001',
        supplierId: supplier.id,
        purchaseInvoiceId: null as any,
        expiryDate: new Date('2026-12-31'),
        purchaseRate: 10,
      })

      await receiveStock({
        productId: product.id,
        quantity: 30,
        batchNumber: 'BATCH-001',
        supplierId: supplier.id,
        purchaseInvoiceId: null as any,
        expiryDate: new Date('2026-12-31'),
        purchaseRate: 12,
      })

      const batches = await prisma.productBatch.findMany({
        where: { productId: product.id },
      })
      expect(batches).toHaveLength(1)
      expect(Number(batches[0].quantity)).toBe(80)

      const receipts = await prisma.batchReceipt.findMany({
        where: { batchId: batches[0].id },
      })
      expect(receipts).toHaveLength(2)
    })

    it('rejects different expiry for same batchNumber', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      await receiveStock({
        productId: product.id,
        quantity: 50,
        batchNumber: 'BATCH-001',
        supplierId: supplier.id,
        purchaseInvoiceId: null as any,
        expiryDate: new Date('2026-12-31'),
        purchaseRate: 10,
      })

      await expect(
        receiveStock({
          productId: product.id,
          quantity: 30,
          batchNumber: 'BATCH-001',
          supplierId: supplier.id,
          purchaseInvoiceId: null as any,
          expiryDate: new Date('2027-06-30'),
          purchaseRate: 12,
        })
      ).rejects.toThrow('Batch number BATCH-001 already exists with a different expiry date')
    })
  })

  describe('adjustStock', () => {
    it('increases stock with batchId and unitCost', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-001',
          expiryDate: null,
          quantity: 0,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: 0,
          remainingQuantity: 0,
          purchaseRate: 10,
        },
      })

      await adjustStock({
        productId: product.id,
        type: 'ADJUSTMENT_IN',
        quantity: 20,
        batchId: batch.id,
        unitCost: 15,
        supplierId: supplier.id,
      })

      const updatedBatch = await prisma.productBatch.findUnique({ where: { id: batch.id } })
      expect(Number(updatedBatch?.quantity)).toBe(20)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBe(20)

      const receipts = await prisma.batchReceipt.findMany({
        where: { batchId: batch.id },
        orderBy: { createdAt: 'asc' },
      })
      expect(receipts).toHaveLength(2)
      const adjustmentReceipt = receipts[receipts.length - 1]
      expect(Number(adjustmentReceipt.remainingQuantity)).toBe(20)
      expect(Number(adjustmentReceipt.purchaseRate)).toBe(15)
    })

    it('decreases stock with batchId and allocates FIFO', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
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
          batchNumber: 'BATCH-001',
          expiryDate: null,
          quantity: 100,
        },
      })

      const receipt1 = await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'PURCHASE',
          quantity: 100,
          remainingQuantity: 100,
          purchaseRate: 10,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'PURCHASE',
          quantity: 50,
          remainingQuantity: 50,
          purchaseRate: 12,
        },
      })

      await adjustStock({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 70,
        batchId: batch.id,
      })

      const updatedBatch = await prisma.productBatch.findUnique({ where: { id: batch.id } })
      expect(Number(updatedBatch?.quantity)).toBe(30)

      const updatedReceipt1 = await prisma.batchReceipt.findUnique({ where: { id: receipt1.id } })
      expect(Number(updatedReceipt1?.remainingQuantity)).toBe(30)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBe(30)
    })

    it('rejects decrease without sufficient stock', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-001',
          expiryDate: null,
          quantity: 50,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: 50,
          remainingQuantity: 50,
          purchaseRate: 10,
        },
      })

      await expect(
        adjustStock({
          productId: product.id,
          type: 'ADJUSTMENT_OUT',
          quantity: 100,
          batchId: batch.id,
        })
      ).rejects.toThrow('Insufficient stock in selected batch')
    })
  })

  describe('consumeStock', () => {
    it('consumes from earliest-expiring batch first (FEFO)', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
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
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2026-12-31'),
          quantity: 100,
        },
      })

      const batch2 = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-002',
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

      const transactions = await consumeStock({
        productId: product.id,
        quantity: 50,
      })

      expect(transactions).toHaveLength(1)
      expect(transactions[0].batchId).toBe(batch1.id)
      expect(Number(transactions[0].quantity)).toBe(-50)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBe(150)
    })

    it('rejects consumption of expired batches', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
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
          batchNumber: 'BATCH-001',
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

      await expect(
        consumeStock({
          productId: product.id,
          quantity: 10,
        })
      ).rejects.toThrow('No available stock')
    })
  })

  describe('getProductBatches', () => {
    it('returns batches with receipts and status', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2026-12-31'),
          quantity: 50,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'PURCHASE',
          quantity: 50,
          remainingQuantity: 50,
          purchaseRate: 10,
        },
      })

      const batches = await getProductBatches(product.id)
      expect(batches).toHaveLength(1)
      expect(batches[0].batchNumber).toBe('BATCH-001')
      expect(batches[0].status).toBe('OK')
      expect(batches[0].avgCost).toBe(10)
    })
  })

  describe('getInventoryValue', () => {
    it('calculates inventory value from batch receipts', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-001',
          expiryDate: null,
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

      const value = await getInventoryValue()
      expect(value).toBe(1000)
    })
  })

  describe('getExpiryStats', () => {
    it('calculates expired and expiring soon stats', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-20260802-0001',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const expiredBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2020-01-01'),
          quantity: 50,
        },
      })

      const expiringBatch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: 'BATCH-002',
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          quantity: 30,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: expiredBatch.id,
          supplierId: supplier.id,
          sourceType: 'PURCHASE',
          quantity: 50,
          remainingQuantity: 50,
          purchaseRate: 10,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: expiringBatch.id,
          supplierId: supplier.id,
          sourceType: 'PURCHASE',
          quantity: 30,
          remainingQuantity: 30,
          purchaseRate: 12,
        },
      })

      const stats = await getExpiryStats()
      expect(stats.expiredStockValue).toBe(500)
      expect(stats.expiringSoonCount).toBe(1)
      expect(stats.expiringSoonValue).toBe(360)
    })
  })
})
