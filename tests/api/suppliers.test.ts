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
