import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/purchase-invoices/route'
import { GET as GETById } from '@/app/api/purchase-invoices/[id]/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Purchase Invoices API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/purchase-invoices', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoices).toHaveLength(0)
  })

  it('POST creates a purchase invoice and updates stock', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
      },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        paymentMode: 'CASH',
        items: [{ productId: product.id, quantity: 50, purchaseRate: 10 }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice).toBeDefined()
    expect(data.invoice.invoiceNumber).toContain('PINV-')

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(50)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id, type: 'PURCHASE' },
    })
    expect(transactions).toHaveLength(1)
    expect(Number(transactions[0].quantity)).toBe(50)
  })

  it('GET returns invoices with items', async () => {
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

    const req = new Request('http://localhost/api/purchase-invoices', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoices).toHaveLength(1)
    expect(data.invoices[0].invoiceNumber).toBe('PINV-TEST-001')
  })

  it('GET by ID returns invoice with supplier and items', async () => {
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

    const req = new Request(`http://localhost/api/purchase-invoices/${invoice.id}`, { method: 'GET' })
    const res = await GETById(req, { params: { id: invoice.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoice.invoiceNumber).toBe('PINV-TEST-002')
    expect(data.invoice.supplier.supplierName).toBe('Test Supplier')
  })
})
