import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/suppliers/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/suppliers/[id]/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
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

  it('POST creates a supplier with valid data', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'ABC Pharma',
        contactPerson: 'John Doe',
        phone: '9876543210',
        email: 'abc@example.com',
        gstNumber: 'GSTIN1234567890',
        openingBalance: 5000,
        status: 'ACTIVE',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.supplierName).toBe('ABC Pharma')
    expect(data.supplier.phone).toBe('9876543210')
    expect(data.supplier.email).toBe('abc@example.com')
    expect(data.supplier.gstNumber).toBe('GSTIN1234567890')
    expect(data.supplier.openingBalance).toBe(5000)
  })

  it('POST rejects missing supplier name', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Supplier name is required')
  })

  it('POST rejects blank supplier name', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName: '   ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Supplier name is required')
  })

  it('POST rejects invalid phone number', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Test Supplier',
        phone: '1234567890',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Enter a valid 10-digit Indian mobile number')
  })

  it('POST rejects invalid email format', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Test Supplier',
        email: 'not-an-email',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Enter a valid email address')
  })

  it('POST rejects invalid GST number format', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Test Supplier',
        gstNumber: 'GST123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('GST number must be 15 alphanumeric characters (e.g., GSTIN1234567890)')
  })

  it('POST accepts valid 15-char GST number', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'GST Supplier',
        gstNumber: 'GSTIN1234567890',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.gstNumber).toBe('GSTIN1234567890')
  })

  it('POST normalizes GST to uppercase', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'GST Supplier',
        gstNumber: 'gstin1234567890',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.gstNumber).toBe('GSTIN1234567890')
  })

  it('POST defaults opening balance to 0 when missing', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName: 'Default Balance Supplier' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.openingBalance).toBe(0)
  })

  it('POST accepts decimal opening balance', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Decimal Balance Supplier',
        openingBalance: 1500.75,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.supplier.openingBalance).toBe(1500.75)
  })

  it('POST rejects negative opening balance', async () => {
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Negative Balance Supplier',
        openingBalance: -100,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Opening balance cannot be negative')
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

  it('PATCH updates opening balance', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Balance Update', status: 'ACTIVE', openingBalance: 1000 },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openingBalance: 2500.50 }),
    })
    const res = await PATCH(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.supplier.openingBalance).toBe(2500.50)
  })

  it('PATCH rejects negative opening balance', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openingBalance: -500 }),
    })
    const res = await PATCH(req, { params: { id: supplier.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Opening balance cannot be negative')
  })

  it('PATCH rejects invalid phone number', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '1234567890' }),
    })
    const res = await PATCH(req, { params: { id: supplier.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Enter a valid 10-digit Indian mobile number')
  })

  it('PATCH rejects blank supplier name', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName: '   ' }),
    })
    const res = await PATCH(req, { params: { id: supplier.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Supplier name is required')
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
