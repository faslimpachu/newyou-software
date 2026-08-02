import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/product-categories/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/product-categories/[id]/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.productCategory.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Product Categories API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/product-categories', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.categories).toHaveLength(0)
  })

  it('POST creates a category', async () => {
    const req = new Request('http://localhost/api/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Medicines', description: 'Medicine products', active: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.category.name).toBe('Medicines')
    expect(data.category.active).toBe(true)
  })

  it('GET returns created categories', async () => {
    await prisma.productCategory.create({
      data: { name: 'Supplements', description: 'Supplement products', active: true },
    })

    const req = new Request('http://localhost/api/product-categories', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.categories).toHaveLength(1)
    expect(data.categories[0].name).toBe('Supplements')
  })

  it('PATCH updates a category', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Old Name', active: true },
    })

    const req = new Request(`http://localhost/api/product-categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PATCH(req, { params: { id: category.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.category.name).toBe('New Name')
  })

  it('DELETE deactivates a category', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'To Delete', active: true },
    })

    const req = new Request(`http://localhost/api/product-categories/${category.id}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: category.id } })
    expect(res.status).toBe(200)

    const deleted = await prisma.productCategory.findUnique({ where: { id: category.id } })
    expect(deleted?.active).toBe(false)
  })
})
