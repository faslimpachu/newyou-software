import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/inventory-adjustments/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Inventory Adjustments API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/inventory-adjustments', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.adjustments).toHaveLength(0)
  })

  it('POST increases stock and creates transaction', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-20260802-0001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_IN',
        quantity: 50,
        notes: 'Found stock',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.transaction).toBeDefined()
    expect(data.transaction.quantity).toBe(50)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(50)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0].type).toBe('ADJUSTMENT_IN')
    expect(Number(transactions[0].quantity)).toBe(50)
  })

  it('POST decreases stock and creates transaction', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-20260802-0002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 30,
        notes: 'Damaged stock',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.transaction.quantity).toBe(-30)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(70)
  })

  it('POST returns 400 for insufficient stock', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-20260802-0003',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 10,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 50,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Insufficient stock')
  })

  it('POST rejects quantity <= 0', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-20260802-0003',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/inventory-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: 'ADJUSTMENT_IN',
        quantity: 0,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Quantity must be greater than zero')
  })

  it('GET returns adjustments with filters', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: 'PRD-20260802-0004',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })
    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: 'ADJUSTMENT_IN',
        quantity: 50,
        referenceType: 'ADJUSTMENT',
        notes: 'Found stock',
      },
    })

    const req = new Request(`http://localhost/api/inventory-adjustments?productId=${product.id}`, { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.adjustments).toHaveLength(1)
    expect(data.adjustments[0].product.name).toBe('Test Product')
  })
})
