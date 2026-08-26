import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/supplier-payments/route'
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
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-005',
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

  it('POST rejects payment without invoiceId', async () => {
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
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('supplierId, invoiceId, amount, and paymentDate are required')
  })

  it('POST rejects payment with empty invoiceId', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: '',
        amount: 100,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('supplierId, invoiceId, amount, and paymentDate are required')
  })

  it('POST sets OVERDUE status when dueDate is past and balance > 0', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-OVERDUE-001',
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

    const req = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-16',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoice.id } })
    expect(updatedInvoice?.status).toBe('OVERDUE')
    expect(Number(updatedInvoice?.balance)).toBeGreaterThan(0)
  })

  it('POST returns PAID when payment exactly matches remaining balance after partial payment', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-FULL-001',
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

    const partialReq = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-01',
        paymentMode: 'CASH',
      }),
    })
    await POST(partialReq)

    const fullReq = new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 62,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(fullReq)
    expect(res.status).toBe(201)

    const updatedInvoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoice.id } })
    expect(updatedInvoice?.status).toBe('PAID')
    expect(Number(updatedInvoice?.balance)).toBeLessThanOrEqual(0)
  })

  it('POST rejects negative payment amount', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-006',
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
        amount: -50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST returns payment record with supplier and invoice info', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-DETAIL-001',
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
        paymentMode: 'BANK',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.payment.supplier.supplierName).toBe('Test Supplier')
    expect(data.payment.invoice?.invoiceNumber).toBe('PINV-DETAIL-001')
    expect(data.payment.paymentNumber).toContain('PPAY-')
  })

  it('GET filters by search in payment number', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Search Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-SEARCH-001',
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

    const postRes = await POST(new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
        notes: 'SEARCHABLE-NOTE-001',
      }),
    }))
    const postData = await postRes.json()
    const paymentNumber = postData.payment.paymentNumber

    const req = new Request('http://localhost/api/supplier-payments?search=' + paymentNumber, { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(1)
    expect(data.payments[0].paymentNumber).toBe(paymentNumber)
  })

  it('GET filters by supplierId', async () => {
    const supplierA = await prisma.supplier.create({
      data: { supplierName: 'Supplier A', status: 'ACTIVE' },
    })
    const supplierB = await prisma.supplier.create({
      data: { supplierName: 'Supplier B', status: 'ACTIVE' },
    })

    const invoiceA = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-A-001',
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

    const invoiceB = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-B-001',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplierB.id,
        subtotal: 100,
        tax: 12,
        grandTotal: 112,
        paid: 0,
        balance: 112,
        status: 'PENDING',
      },
    })

    await POST(new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplierA.id,
        invoiceId: invoiceA.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    }))

    await POST(new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplierB.id,
        invoiceId: invoiceB.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    }))

    const req = new Request(`http://localhost/api/supplier-payments?supplierId=${supplierA.id}`, { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(1)
    expect(data.payments[0].supplierId).toBe(supplierA.id)
  })

  it('GET filters by search in supplier name', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Unique Search Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-SEARCH-002',
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

    await POST(new Request('http://localhost/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: '2026-08-02',
        paymentMode: 'CASH',
      }),
    }))

    const req = new Request('http://localhost/api/supplier-payments?search=Unique Search', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(1)
    expect(data.payments[0].supplier.supplierName).toBe('Unique Search Supplier')
  })

  it('GET returns empty list when search has no matches', async () => {
    const req = new Request('http://localhost/api/supplier-payments?search=NONEXISTENT', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(0)
  })

  it('GET pagination is respected with filters', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Pagination Supplier', status: 'ACTIVE' },
    })

    for (let i = 0; i < 5; i++) {
      const invoice = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: `PINV-PAGE-${String(i + 1).padStart(3, '0')}`,
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

      await POST(new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId: invoice.id,
          amount: 50,
          paymentDate: '2026-08-02',
          paymentMode: 'CASH',
        }),
      }))
    }

    const req = new Request('http://localhost/api/supplier-payments?supplierId=' + supplier.id + '&page=1&pageSize=2', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.payments).toHaveLength(2)
    expect(data.total).toBe(5)
    expect(data.totalPages).toBe(3)
  })
})
