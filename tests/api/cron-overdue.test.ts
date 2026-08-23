import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET as CronGet } from '@/app/api/cron/update-overdue-invoices/route'
import { POST as PaymentPost } from '@/app/api/supplier-payments/route'
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
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Cron Update Overdue Invoices', () => {
  it('GET returns success with zero updates when no invoices are overdue', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-001',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
        dueDate: new Date('2099-12-31'),
      },
    })

    const req = new Request('http://localhost/api/cron/update-overdue-invoices', { method: 'GET' })
    const res = await CronGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(0)
  })

  it('GET updates PENDING invoices with past dueDate to OVERDUE', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-002',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
        dueDate: new Date('2026-08-10'),
      },
    })

    const req = new Request('http://localhost/api/cron/update-overdue-invoices', { method: 'GET' })
    const res = await CronGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(1)

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PINV-CRON-002' },
    })
    expect(invoice?.status).toBe('OVERDUE')
  })

  it('GET updates PARTIAL invoices with past dueDate to OVERDUE', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-003',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 50,
        balance: 62,
        status: 'PARTIAL',
        dueDate: new Date('2026-08-10'),
      },
    })

    const req = new Request('http://localhost/api/cron/update-overdue-invoices', { method: 'GET' })
    const res = await CronGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(1)

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PINV-CRON-003' },
    })
    expect(invoice?.status).toBe('OVERDUE')
  })

  it('GET does not update PAID invoices', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-004',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 112,
        balance: 0,
        status: 'PAID',
        dueDate: new Date('2026-08-10'),
      },
    })

    const req = new Request('http://localhost/api/cron/update-overdue-invoices', { method: 'GET' })
    const res = await CronGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(0)

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PINV-CRON-004' },
    })
    expect(invoice?.status).toBe('PAID')
  })

  it('GET updates multiple overdue invoices in one call', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-005',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
        dueDate: new Date('2026-08-10'),
      },
    })
    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CRON-006',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 200,
        tax: 24,
        grandTotal: 224,
        paid: 50,
        balance: 174,
        status: 'PARTIAL',
        dueDate: new Date('2026-08-10'),
      },
    })

    const req = new Request('http://localhost/api/cron/update-overdue-invoices', { method: 'GET' })
    const res = await CronGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(2)

    const inv1 = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PINV-CRON-005' },
    })
    const inv2 = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PINV-CRON-006' },
    })
    expect(inv1?.status).toBe('OVERDUE')
    expect(inv2?.status).toBe('OVERDUE')
  })
})

describe('Supplier Payments Concurrency', () => {
  it('two concurrent payments on same invoice: second fails with overpayment error', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Concurrent Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CONC-001',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    await prisma.sequence.upsert({
      where: { id: 'SUPPLIER_PAYMENT' },
      create: { id: 'SUPPLIER_PAYMENT', name: 'Supplier Payment', lastNumber: 1 },
      update: {},
    })

    const paymentBody = {
      supplierId: supplier.id,
      invoiceId: invoice.id,
      amount: 112,
      paymentDate: '2026-08-01',
      paymentMode: 'CASH',
    }

    const results = await Promise.all([
      PaymentPost(
        new Request('http://localhost/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentBody),
        })
      ),
      PaymentPost(
        new Request('http://localhost/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentBody),
        })
      ),
    ])

    const statuses = results.map((r) => r.status)
    const hasOneSuccess = statuses.some((s) => s === 201)
    const hasOneFailure = statuses.some((s) => s === 400)
    expect(hasOneSuccess).toBe(true)
    expect(hasOneFailure).toBe(true)

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoice.id },
    })
    expect(Number(updatedInvoice?.paid)).toBeLessThanOrEqual(112)
    expect(Number(updatedInvoice?.balance)).toBeGreaterThanOrEqual(0)
  })

  it('two partial concurrent payments on same invoice do not overpay', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Partial Concurrent Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-CONC-002',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 200,
        paid: 0,
        balance: 200,
        status: 'PENDING',
      },
    })

    await prisma.sequence.upsert({
      where: { id: 'SUPPLIER_PAYMENT' },
      create: { id: 'SUPPLIER_PAYMENT', name: 'Supplier Payment', lastNumber: 1 },
      update: {},
    })

    const paymentABody = {
      supplierId: supplier.id,
      invoiceId: invoice.id,
      amount: 120,
      paymentDate: '2026-08-01',
      paymentMode: 'CASH',
    }
    const paymentBBody = {
      supplierId: supplier.id,
      invoiceId: invoice.id,
      amount: 120,
      paymentDate: '2026-08-01',
      paymentMode: 'CASH',
    }

    const results = await Promise.all([
      PaymentPost(
        new Request('http://localhost/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentABody),
        })
      ),
      PaymentPost(
        new Request('http://localhost/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentBBody),
        })
      ),
    ])

    const successes = results.filter((r) => r.status === 201)
    expect(successes.length).toBeGreaterThanOrEqual(1)

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoice.id },
    })
    expect(Number(updatedInvoice?.paid)).toBeLessThanOrEqual(200)
    expect(Number(updatedInvoice?.balance)).toBeGreaterThanOrEqual(0)
  })
})
