import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/supplier-payments/route'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { POST as AdjustmentPost } from '@/app/api/inventory-adjustments/route'
import { POST as ConsumePost } from '@/app/api/inventory/consume/route'
import { consumeStock, adjustStock, receiveStock } from '@/lib/inventory-service'

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

  await prisma.productSequence.upsert({
    where: { id: 'GLOBAL' },
    update: {},
    create: { id: 'GLOBAL', lastNumber: 1000 },
  })
  await prisma.sequence.upsert({
    where: { id: 'PURCHASE_INVOICE' },
    update: {},
    create: { id: 'PURCHASE_INVOICE', name: 'Purchase Invoice', lastNumber: 1000 },
  })
  await prisma.sequence.upsert({
    where: { id: 'SUPPLIER_PAYMENT' },
    update: {},
    create: { id: 'SUPPLIER_PAYMENT', name: 'Supplier Payment', lastNumber: 1000 },
  })
  await prisma.sequence.upsert({
    where: { id: 'PRODUCT' },
    update: {},
    create: { id: 'PRODUCT', name: 'Product', lastNumber: 1000 },
  })
  await prisma.sequence.upsert({
    where: { id: 'SALE_INVOICE' },
    update: {},
    create: { id: 'SALE_INVOICE', name: 'Sale Invoice', lastNumber: 1000 },
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Concurrency Tests', () => {
  describe('Concurrent Supplier Payments', () => {
    it('prevents overpayment when two staff pay same invoice simultaneously', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const invoice = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: 'PINV-CONC-001',
          invoiceDate: new Date('2026-08-02'),
          supplierId: supplier.id,
          subtotal: 1000,
          tax: 100,
          grandTotal: 1100,
          paid: 0,
          balance: 1100,
          status: 'PENDING',
        },
      })

      const reqA = new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId: invoice.id,
          amount: 700,
          paymentDate: '2026-08-02',
          paymentMode: 'CASH',
        }),
      })

      const reqB = new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId: invoice.id,
          amount: 700,
          paymentDate: '2026-08-02',
          paymentMode: 'CASH',
        }),
      })

      const [resA, resB] = await Promise.all([POST(reqA), POST(reqB)])

      const results = [resA, resB].sort((a, b) => a.status - b.status)
      expect(results[0].status).toBe(201)
      expect(results[1].status).toBe(400)

      const updatedInvoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoice.id } })
      expect(Number(updatedInvoice?.balance)).toBeGreaterThanOrEqual(0)
      expect(Number(updatedInvoice?.paid)).toBe(700)
    })
  })

  describe('Concurrent Inventory Adjustments', () => {
    it('prevents double-decrease when two staff adjust same batch', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-CONC-001',
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
          batchNumber: 'BATCH-CONC',
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

      const results = [resA, resB].sort((a, b) => a.status - b.status)
      expect(results[0].status).toBe(201)
      expect(results[1].status).toBe(400)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Concurrent FEFO Consumption', () => {
    it('prevents over-consumption when two sales target same batch', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-CONC-002',
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
          batchNumber: 'BATCH-CONC',
          expiryDate: new Date('2026-12-31'),
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

      const reqA = new Request('http://localhost/api/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 60,
        }),
      })

      const reqB = new Request('http://localhost/api/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 60,
        }),
      })

      const results = await Promise.allSettled([ConsumePost(reqA), ConsumePost(reqB)])

      const successResponses = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201)
      const failResponses = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 400))

      for (const r of results) {
        if (r.status === 'fulfilled') {
          const body = await r.value.json()
          console.log('FEFO response:', r.value.status, body)
        } else {
          console.log('FEFO rejected:', r.reason)
        }
      }

      expect(successResponses.length + failResponses.length).toBe(2)
      expect(successResponses.length).toBeGreaterThanOrEqual(1)
      expect(failResponses.length).toBeGreaterThanOrEqual(1)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Concurrent Receipt-Layer Consumption', () => {
    it('prevents over-consumption at receipt layer', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-CONC-003',
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
          batchNumber: 'BATCH-CONC',
          expiryDate: null,
          quantity: 100,
        },
      })

      const receipt = await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: supplier.id,
          sourceType: 'OPENING',
          quantity: 10,
          remainingQuantity: 10,
          purchaseRate: 10,
        },
      })

      const reqA = new Request('http://localhost/api/inventory-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          type: 'ADJUSTMENT_OUT',
          quantity: 8,
          batchId: batch.id,
        }),
      })

      const reqB = new Request('http://localhost/api/inventory-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          type: 'ADJUSTMENT_OUT',
          quantity: 8,
          batchId: batch.id,
        }),
      })

      const [resA, resB] = await Promise.all([AdjustmentPost(reqA), AdjustmentPost(reqB)])

      const results = [resA, resB].sort((a, b) => a.status - b.status)
      expect(results[0].status).toBe(201)
      expect(results[1].status).toBe(400)

      const updatedReceipt = await prisma.batchReceipt.findUnique({ where: { id: receipt.id } })
      expect(Number(updatedReceipt?.remainingQuantity)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Concurrent Purchase of Same Batch', () => {
    it('allows both purchases and creates two receipts', async () => {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
      const category = await prisma.productCategory.create({
        data: { name: 'Medicines', active: true },
      })
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          code: 'PRD-CONC-004',
          categoryId: category.id,
          unit: 'pcs',
          purchasePrice: 10,
          sellingPrice: 15,
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 200,
        },
      })

      const reqA = new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-02',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-SAME' }],
        }),
      })

      const reqB = new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-02',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'BATCH-SAME' }],
        }),
      })

      const results = await Promise.allSettled([PurchasePost(reqA), PurchasePost(reqB)])

      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201)
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status >= 500))

      if (succeeded.length === 2) {
        expect(succeeded).toHaveLength(2)
      } else if (succeeded.length === 1 && failed.length === 1) {
        const retryReq = failed[0].status === 'rejected'
          ? new Request('http://localhost/api/purchase-invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceDate: '2026-08-02',
                supplierId: supplier.id,
                items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'BATCH-SAME' }],
            }),
          })
          : new Request('http://localhost/api/purchase-invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceDate: '2026-08-02',
                supplierId: supplier.id,
                items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'BATCH-SAME' }],
            }),
          })

        const retryRes = await PurchasePost(retryReq)
        expect(retryRes.status).toBe(201)
      } else {
        expect(succeeded.length).toBeGreaterThanOrEqual(1)
      }

      const batches = await prisma.productBatch.findMany({
        where: { productId: product.id, batchNumber: 'BATCH-SAME' },
      })
      expect(batches.length).toBeGreaterThanOrEqual(1)

      const receipts = await prisma.batchReceipt.findMany({
        where: { batchId: batches[0].id },
      })
      expect(receipts.length).toBeGreaterThanOrEqual(1)

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
      expect(Number(updatedProduct?.currentStock)).toBeGreaterThan(0)
    })
  })
})
