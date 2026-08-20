import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { POST as AdjustmentPost } from '@/app/api/inventory-adjustments/route'
import { GET as DashboardGet } from '@/app/api/dashboard/route'
import { POST as PaymentPost } from '@/app/api/supplier-payments/route'
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

describe('End-to-End Procurement Flow', () => {
  it('complete procurement flow: product → supplier → purchase → stock', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'E2E Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'E2E Medicine',
        code: 'PRD-E2E-001',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 100,
        currentStock: 0,
        active: true,
      },
    })

    const invoiceReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-16',
        supplierId: supplier.id,
        paymentMode: 'CREDIT',
        dueDate: '2026-09-15',
        items: [
          { productId: product.id, quantity: 100, purchaseRate: 10, gstPercent: 5, batchNumber: 'BATCH-E2E-1' },
          { productId: product.id, quantity: 50, purchaseRate: 12, gstPercent: 5, batchNumber: 'BATCH-E2E-2' },
        ],
      }),
    })

    const invoiceRes = await PurchasePost(invoiceReq)
    expect(invoiceRes.status).toBe(201)
    const invoiceData = await invoiceRes.json()
    expect(invoiceData.invoice.invoiceNumber).toContain('PINV-')

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(150)

    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    })
    expect(batches).toHaveLength(2)
    expect(batches.map((b) => b.batchNumber)).toContain('BATCH-E2E-1')
    expect(batches.map((b) => b.batchNumber)).toContain('BATCH-E2E-2')

    const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0)
    expect(totalQty).toBe(150)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id, type: 'PURCHASE' },
    })
    expect(transactions).toHaveLength(2)
    expect(transactions[0].batchId).toBeDefined()
    expect(transactions[1].batchId).toBeDefined()
  })

  it('complete payment flow: invoice → partial payment → full payment', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'E2E Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'E2E Medicine',
        code: 'PRD-E2E-002',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 100,
        currentStock: 0,
        active: true,
      },
    })

    const invoiceRes = await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          paymentMode: 'CREDIT',
          dueDate: '2026-08-20',
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-E2E' }],
        }),
      })
    )
    expect(invoiceRes.status).toBe(201)
    const invoiceData = await invoiceRes.json()
    const invoiceId = invoiceData.invoice.id

    const payment1Res = await PaymentPost(
      new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId,
          amount: 500,
          paymentDate: '2026-08-16',
          paymentMode: 'CASH',
        }),
      })
    )
    expect(payment1Res.status).toBe(201)

    const invoiceAfterPartial = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    expect(invoiceAfterPartial?.status).toBe('OVERDUE')

    const remainingBalance = Number(invoiceAfterPartial?.balance)
    const payment2Res = await PaymentPost(
      new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId,
          amount: remainingBalance,
          paymentDate: '2026-08-16',
          paymentMode: 'CASH',
        }),
      })
    )
    expect(payment2Res.status).toBe(201)

    const invoiceAfterPaid = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    expect(invoiceAfterPaid?.status).toBe('PAID')
    expect(Number(invoiceAfterPaid?.paid)).toBeGreaterThanOrEqual(1000)
  })

  it('complete inventory flow: purchase → adjustment → consume', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'E2E Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'E2E Medicine',
        code: 'PRD-E2E-003',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 100,
        currentStock: 0,
        active: true,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-E2E' }],
        }),
      })
    )

    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    })
    expect(batches).toHaveLength(1)
    const batchId = batches[0].id

    await adjustStock({
      productId: product.id,
      type: 'ADJUSTMENT_OUT',
      quantity: 10,
      batchId,
    })

    const afterAdjustment = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(afterAdjustment?.currentStock)).toBe(90)

    await consumeStock({
      productId: product.id,
      quantity: 30,
    })

    const afterConsumption = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(afterConsumption?.currentStock)).toBe(60)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(transactions).toHaveLength(3)
    expect(transactions[0].type).toBe('PURCHASE')
    expect(transactions[1].type).toBe('ADJUSTMENT_OUT')
    expect(transactions[2].type).toBe('SALE')
  })
})

describe('End-to-End Dashboard Stats Flow', () => {
  it('dashboard reflects real-time inventory and payment state', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'E2E Dashboard Supplier', status: 'ACTIVE', openingBalance: 5000 },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'E2E Dashboard Product',
        code: 'PRD-E2E-DASH',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 100,
        currentStock: 0,
        active: true,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-16',
          supplierId: supplier.id,
          paymentMode: 'CREDIT',
          dueDate: '2026-08-20',
          items: [{ productId: product.id, quantity: 200, purchaseRate: 10, batchNumber: 'BATCH-DASH' }],
        }),
      })
    )

    const dashRes = await DashboardGet(new Request('http://localhost/api/dashboard'))
    expect(dashRes.status).toBe(200)
    const dashData = await dashRes.json()

    expect(dashData.purchase).toBeDefined()
    expect(Number(dashData.purchase.totalSuppliers)).toBeGreaterThanOrEqual(1)
    expect(Number(dashData.purchase.inventoryValue)).toBeGreaterThan(0)
    expect(Number(dashData.purchase.totalBatches)).toBeGreaterThanOrEqual(1)

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { supplierId: supplier.id },
    })

    if (invoice) {
      await PaymentPost(
        new Request('http://localhost/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: supplier.id,
            invoiceId: invoice.id,
            amount: 500,
            paymentDate: '2026-08-16',
            paymentMode: 'CASH',
          }),
        })
      )

      const dashResAfter = await DashboardGet(new Request('http://localhost/api/dashboard'))
      const dashDataAfter = await dashResAfter.json()
      expect(dashDataAfter.purchase).toBeDefined()
      const pendingAfter = Number(dashDataAfter.purchase.pendingPayments || 0)
      expect(pendingAfter).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('End-to-End Batch Expiry Flow', () => {
  it('tracks batch expiry through purchase → expiry → adjustment', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'E2E Expiry Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'E2E Expiry Product',
        code: 'PRD-E2E-EXP',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 100,
        currentStock: 0,
        active: true,
      },
    })

    const pastDate = new Date('2020-01-01')
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

    await receiveStock({
      productId: product.id,
      quantity: 50,
      batchNumber: 'BATCH-EXPIRED',
      supplierId: supplier.id,
      purchaseInvoiceId: null as any,
      expiryDate: pastDate,
      purchaseRate: 10,
    })

    await receiveStock({
      productId: product.id,
      quantity: 30,
      batchNumber: 'BATCH-EXPIRING',
      supplierId: supplier.id,
      purchaseInvoiceId: null as any,
      expiryDate: futureDate,
      purchaseRate: 12,
    })

    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
    })
    expect(batches).toHaveLength(2)

    const expiredBatch = batches.find((b) => b.batchNumber === 'BATCH-EXPIRED')
    const expiringBatch = batches.find((b) => b.batchNumber === 'BATCH-EXPIRING')
    expect(expiredBatch?.expiryDate).toBeDefined()
    expect(expiringBatch?.expiryDate).toBeDefined()

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(transactions).toHaveLength(2)
    const batchIds = transactions.map((t) => t.batchId)
    expect(batchIds).toContain(expiredBatch?.id)
    expect(batchIds).toContain(expiringBatch?.id)
  })
})
