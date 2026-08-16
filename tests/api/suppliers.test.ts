import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/suppliers/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/suppliers/[id]/route'
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

describe('Suppliers API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/suppliers', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suppliers).toHaveLength(0)
  })

  it('POST creates a supplier', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'ABC Pharma',
        contactPerson: 'John Doe',
        phone: '9876543210',
        email: 'abc@example.com',
        gstNumber: 'GST123',
        openingBalance: 5000,
        status: 'ACTIVE',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.supplierName).toBe('ABC Pharma')
    expect(data.supplier.openingBalance).toBe(5000)
  })

  it('GET returns suppliers with ledger', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'XYZ Pharma', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, { method: 'GET' })
    const res = await GETById(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.supplier.supplierName).toBe('XYZ Pharma')
    expect(data.ledger.totalPurchases).toBe(0)
    expect(data.ledger.outstandingBalance).toBeGreaterThanOrEqual(0)
  })

  it('GET ledger calculates outstandingBalance = openingBalance + purchases - payments', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Ledger Supplier', status: 'ACTIVE', openingBalance: 1000 },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-LEDGER-001',
        invoiceDate: new Date('2026-08-01'),
        supplierId: supplier.id,
        subtotal: 5000,
        tax: 500,
        grandTotal: 5500,
        paid: 0,
        balance: 5500,
        status: 'PENDING',
      },
    })
    await prisma.supplierPayment.create({
      data: {
        paymentNumber: 'PPAY-LEDGER-001',
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 2000,
        paymentDate: new Date('2026-08-05'),
        paymentMode: 'CASH',
      },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, { method: 'GET' })
    const res = await GETById(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ledger.totalPurchases).toBe(5500)
    expect(data.ledger.totalPayments).toBe(2000)
    expect(data.ledger.outstandingBalance).toBe(1000 + 5500 - 2000)
  })

  it('GET returns 404 for non-existent supplier', async () => {
    const req = new Request('http://localhost/api/suppliers/nonexistent', { method: 'GET' })
    const res = await GETById(req, { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })

  it('PATCH updates a supplier', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Old Name', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName: 'New Name', status: 'INACTIVE' }),
    })
    const res = await PATCH(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.supplier.supplierName).toBe('New Name')
  })

  it('DELETE deactivates a supplier', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'To Delete', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)

    const deleted = await prisma.supplier.findUnique({ where: { id: supplier.id } })
    expect(deleted?.status).toBe('INACTIVE')
  })
})
