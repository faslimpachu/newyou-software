import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/products/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/products/[id]/route'
import { GET as GETLowStock } from '@/app/api/products/low-stock/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Products API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/products', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.products).toHaveLength(0)
  })

  it('POST creates a product', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Paracetamol',
        sku: 'MED001',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        minimumStock: 10,
        maximumStock: 200,
        currentStock: 100,
        active: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.product.name).toBe('Paracetamol')
    expect(data.product.currentStock).toBe(100)
    expect(data.product.code).toContain('PRD-')
    expect(data.product.minimumStock).toBe(10)
    expect(data.product.maximumStock).toBe(200)
  })

  it('GET returns products with category', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Supplements', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Vitamin D',
        code: 'PRD-20260802-0001',
        categoryId: category.id,
        unit: 'bottle',
        purchasePrice: 50,
        sellingPrice: 80,
        gstPercent: 5,
        currentStock: 20,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/products', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.products).toHaveLength(1)
    expect(data.products[0].category.name).toBe('Supplements')
  })

  it('PATCH updates a product', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Old Name',
        code: 'PRD-20260802-0002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 10,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', sellingPrice: 20, minimumStock: 15, maximumStock: 150 }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.product.name).toBe('New Name')
    expect(data.product.sellingPrice).toBe(20)
    expect(data.product.minimumStock).toBe(15)
    expect(data.product.maximumStock).toBe(150)
  })

  it('DELETE deactivates a product', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'To Delete',
        code: 'PRD-20260802-0003',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 10,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: product.id } })
    expect(res.status).toBe(200)

    const deleted = await prisma.product.findUnique({ where: { id: product.id } })
    expect(deleted?.active).toBe(false)
  })

  it('PATCH rejects currentStock update', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Stock Protect',
        code: 'PRD-20260802-2001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 50,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Stock Protect Updated', currentStock: 999 }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Current stock cannot be updated directly. Use inventory adjustment to correct stock levels.')

    const updated = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updated?.currentStock)).toBe(50)
  })

  it('PATCH allows updating other fields without currentStock', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Stock Protect',
        code: 'PRD-20260802-2002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 50,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Stock Protect Updated', sellingPrice: 20 }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.product.name).toBe('Stock Protect Updated')
    expect(data.product.sellingPrice).toBe(20)
    expect(data.product.currentStock).toBe(50)
  })

  it('GET low-stock returns count of products below minimumStock', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Low Stock Item',
        code: 'PRD-20260802-1001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 3,
        minimumStock: 10,
        maximumStock: 200,
        active: true,
      },
    })
    await prisma.product.create({
      data: {
        name: 'Healthy Stock Item',
        code: 'PRD-20260802-1002',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 50,
        minimumStock: 10,
        maximumStock: 200,
        active: true,
      },
    })
    await prisma.product.create({
      data: {
        name: 'Out of Stock Item',
        code: 'PRD-20260802-1003',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
        active: true,
      },
    })

    const req = new Request('http://localhost/api/products/low-stock', { method: 'GET' })
    const res = await GETLowStock(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(2)
  })

  it('GET low-stock returns 0 when no products are low', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Healthy Stock Item',
        code: 'PRD-20260802-1004',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 50,
        minimumStock: 10,
        maximumStock: 200,
        active: true,
      },
    })

    const req = new Request('http://localhost/api/products/low-stock', { method: 'GET' })
    const res = await GETLowStock(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(0)
  })

  it('GET low-stock ignores inactive products', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Inactive Low Stock',
        code: 'PRD-20260802-1005',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
        active: false,
      },
    })

    const req = new Request('http://localhost/api/products/low-stock', { method: 'GET' })
    const res = await GETLowStock(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(0)
  })
})
