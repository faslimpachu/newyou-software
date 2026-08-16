import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/supplier-payments/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.supplier.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Supplier Payments API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/supplier-payments', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(0)
  })

  it('POST records a supplier payment', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-001',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
        reference: 'CHEQUE-001',
        notes: 'Partial payment',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.payment.amount).toBe(50)
    expect(data.payment.paymentNumber).toContain('PPAY-')
    expect(data.payment.notes).toBe('Partial payment')

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoice.id } })
    expect(Number(updatedInvoice?.paid)).toBe(50)
    expect(Number(updatedInvoice?.balance)).toBe(62)
    expect(updatedInvoice?.status).toBe('PARTIAL')
  })

  it('POST marks invoice as PAID when fully paid', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-002',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 112,
        paymentDate: '2026-08-02',
        paymentMode: 'BANK',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoice.id } })
    expect(Number(updatedInvoice?.paid)).toBe(112)
    expect(Number(updatedInvoice?.balance)).toBe(0)
    expect(updatedInvoice?.status).toBe('PAID')
  })

  it('POST rejects overpayment exceeding balance', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-003',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 150,
        paymentDate: '2026-08-02',
        paymentMode: 'BANK',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('exceeds outstanding balance')
  })

  it('POST rejects payment amount <= 0', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        amount: 0,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Payment amount must be greater than zero')
  })

  it('POST rejects supplier mismatch', async () => {
    const supplierA = await prisma.supplier.create({
      data: { supplierName: 'Supplier A', status: 'ACTIVE' },
    })
    const supplierB = await prisma.supplier.create({
      data: { supplierName: 'Supplier B', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-004',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplierA.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplierB.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Payment supplier does not match the invoice supplier')
  })

  it('POST rejects orphan payment for non-existent invoice', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: 'non-existent-invoice-id',
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Purchase invoice not found')
  })

  it('POST creates payment without invoice', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        amount: 100,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
        notes: 'Advance payment',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.payment.amount).toBe(100)
    expect(data.payment.notes).toBe('Advance payment')
  })
})
