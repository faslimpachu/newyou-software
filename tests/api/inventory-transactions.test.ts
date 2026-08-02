import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET } from '@/app/api/inventory-transactions/route'
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

describe('Inventory Transactions API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/inventory-transactions', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.transactions).toHaveLength(0)
  })

  it('GET returns transactions with filters', async () => {
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
        currentStock: 50,
      },
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
    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: 'PURCHASE',
        quantity: 50,
        referenceType: 'PURCHASE_INVOICE',
        referenceId: invoice.id,
        notes: 'Purchase invoice PINV-TEST-001',
      },
    })

    const req = new Request('http://localhost/api/inventory-transactions', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.transactions).toHaveLength(1)
    expect(data.transactions[0].type).toBe('PURCHASE')
    expect(data.transactions[0].product.name).toBe('Test Product')
  })

  it('GET filters by productId', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 50,
      },
    })
    const product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 20,
        sellingPrice: 30,
        currentStock: 30,
      },
    })
    await prisma.inventoryTransaction.create({
      data: {
        productId: product1.id,
        type: 'PURCHASE',
        quantity: 50,
      },
    })
    await prisma.inventoryTransaction.create({
      data: {
        productId: product2.id,
        type: 'PURCHASE',
        quantity: 30,
      },
    })

    const req = new Request(`http://localhost/api/inventory-transactions?productId=${product1.id}`, { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.transactions).toHaveLength(1)
    expect(data.transactions[0].productId).toBe(product1.id)
  })
})
