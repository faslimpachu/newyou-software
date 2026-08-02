import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/products/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/products/[id]/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
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
        reorderLevel: 10,
        currentStock: 100,
        active: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.product.name).toBe('Paracetamol')
    expect(data.product.currentStock).toBe(100)
  })

  it('GET returns products with category', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Supplements', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Vitamin D',
        categoryId: category.id,
        unit: 'bottle',
        purchasePrice: 50,
        sellingPrice: 80,
        gstPercent: 5,
        currentStock: 20,
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
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 10,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', sellingPrice: 20 }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.product.name).toBe('New Name')
    expect(data.product.sellingPrice).toBe(20)
  })

  it('DELETE deactivates a product', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'To Delete',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 10,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: product.id } })
    expect(res.status).toBe(200)

    const deleted = await prisma.product.findUnique({ where: { id: product.id } })
    expect(deleted?.active).toBe(false)
  })
})
