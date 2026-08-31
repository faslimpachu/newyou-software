import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/pharmacy-sales/route'
import { prisma } from '@/lib/prisma'

const TEST_PREFIX = 'TESTSALE'

async function cleanup() {
  await prisma.pharmacySale.deleteMany({ where: { saleGroup: { startsWith: TEST_PREFIX } } })
}

describe('Pharmacy sales GET list API', () => {
  let productId: string
  let batchId: string

  beforeAll(async () => {
    await cleanup()
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        code: `TEST-PRD-${Date.now()}`,
        unit: 'pcs',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 0,
      },
    })
    productId = product.id
    const batch = await prisma.productBatch.create({
      data: { productId, batchNumber: `B${Date.now()}`, quantity: 10, sellingPrice: 2 },
    })
    batchId = batch.id

    const now = new Date()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await prisma.pharmacySale.createMany({
      data: [
        {
          saleGroup: `${TEST_PREFIX}-1`,
          saleNumber: `${TEST_PREFIX}-1-1`,
          patientMr: 'MR000111',
          customerName: 'Alice',
          productId,
          batchId,
          quantity: 2,
          unitPrice: 10,
          totalAmount: 20,
          paymentMethod: 'CASH',
          createdAt: yesterday,
        },
        {
          saleGroup: `${TEST_PREFIX}-1`,
          saleNumber: `${TEST_PREFIX}-1-2`,
          patientMr: 'MR000111',
          customerName: 'Alice',
          productId,
          batchId,
          quantity: 1,
          unitPrice: 30,
          totalAmount: 30,
          paymentMethod: 'CASH',
          createdAt: yesterday,
        },
      ],
    })

    await prisma.pharmacySale.create({
      data: {
        saleGroup: `${TEST_PREFIX}-2`,
        saleNumber: `${TEST_PREFIX}-2`,
        patientMr: 'MR000222',
        customerName: 'Bob',
        productId,
        batchId,
        quantity: 5,
        unitPrice: 40,
        totalAmount: 200,
        paymentMethod: 'UPI',
        createdAt: now,
      },
    })
  })

  afterAll(async () => {
    await cleanup()
    await prisma.productBatch.deleteMany({ where: { id: batchId } })
    await prisma.product.deleteMany({ where: { id: productId } })
  })

  it('returns sales grouped by saleGroup, newest first', async () => {
    const req = new NextRequest('http://localhost/api/pharmacy-sales')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.totalPages).toBe(1)
    expect(body.sales).toHaveLength(2)
    expect(body.sales[0].saleGroup).toBe(`${TEST_PREFIX}-2`)
    expect(body.sales[0].itemsCount).toBe(1)
    expect(body.sales[0].totalAmount).toBe(200)
    expect(body.sales[1].itemsCount).toBe(2)
    expect(body.sales[1].totalAmount).toBe(50)
    expect(body.sales[0].customerName).toBe('Bob')
    expect(body.sales[0].items[0].productName).toBe('Test Product')
    expect(body.sales[0].items[0].batchNumber).toBeDefined()
  })

  it('paginates on the backend using page/pageSize', async () => {
    const req = new NextRequest('http://localhost/api/pharmacy-sales?page=1&pageSize=1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.totalPages).toBe(2)
    expect(body.sales).toHaveLength(1)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(1)
  })

  it('filters by paymentMethod on the backend', async () => {
    const req = new NextRequest('http://localhost/api/pharmacy-sales?paymentMethod=CASH')
    const res = await GET(req)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.sales[0].saleGroup).toBe(`${TEST_PREFIX}-1`)
    expect(body.sales[0].itemsCount).toBe(2)
  })

  it('filters by patientMr on the backend', async () => {
    const req = new NextRequest('http://localhost/api/pharmacy-sales?patientMr=MR000222')
    const res = await GET(req)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.sales[0].saleGroup).toBe(`${TEST_PREFIX}-2`)
  })

  it('filters by date range on the backend', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const req = new NextRequest(
      `http://localhost/api/pharmacy-sales?startDate=${today}&endDate=${today}`
    )
    const res = await GET(req)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.sales[0].saleGroup).toBe(`${TEST_PREFIX}-2`)
  })

  it('respects pagination together with filters', async () => {
    const req = new NextRequest(
      'http://localhost/api/pharmacy-sales?paymentMethod=CASH&pageSize=1&page=1'
    )
    const res = await GET(req)
    const body = await res.json()
    expect(body.totalPages).toBe(1)
    expect(body.sales).toHaveLength(1)
  })
})
