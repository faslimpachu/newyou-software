import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/pharmacy-sales/route'
import { PATCH } from '@/app/api/batches/[id]/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.pharmacySale.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.supplier.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedStock(quantity = 10, sellingPrice = 25) {
  const category = await prisma.productCategory.create({
    data: { name: `Medicines-${Date.now()}-${Math.floor(Math.random() * 100000)}`, active: true },
  })
  const supplier = await prisma.supplier.create({ data: { supplierName: 'Test Supplier', status: 'ACTIVE' } })
  const product = await prisma.product.create({
    data: {
      name: 'Test Medicine',
      code: `PRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      categoryId: category.id,
      unit: 'pcs',
      purchasePrice: 10,
      sellingPrice,
      currentStock: quantity,
      minimumStock: 5,
      maximumStock: 100,
    },
  })
  const batch = await prisma.productBatch.create({
    data: { productId: product.id, batchNumber: 'BATCH-001', quantity, sellingPrice },
  })
  await prisma.batchReceipt.create({
    data: {
      batchId: batch.id,
      supplierId: supplier.id,
      sourceType: 'PURCHASE',
      quantity,
      remainingQuantity: quantity,
      purchaseRate: 10,
    },
  })
  return { category, supplier, product, batch }
}

describe('Pharmacy Sales API', () => {
  it('GET returns sales grouped by saleGroup with receipt line items', async () => {
    const first = await seedStock(10, 20)
    const second = await seedStock(10, 15)

    await prisma.pharmacySale.createMany({
      data: [
        {
          saleGroup: 'PSALE-20260830-0001',
          saleNumber: 'PSALE-20260830-0001-1',
          patientMr: 'MR000001',
          customerName: 'Grouped Customer',
          customerPhone: '9845012345',
          productId: first.product.id,
          batchId: first.batch.id,
          quantity: 2,
          unitPrice: 20,
          totalAmount: 40,
          paymentMethod: 'CASH',
          createdAt: new Date('2026-08-30T10:00:00.000Z'),
        },
        {
          saleGroup: 'PSALE-20260830-0001',
          saleNumber: 'PSALE-20260830-0001-2',
          patientMr: 'MR000001',
          customerName: 'Grouped Customer',
          customerPhone: '9845012345',
          productId: second.product.id,
          batchId: second.batch.id,
          quantity: 1,
          unitPrice: 15,
          totalAmount: 15,
          paymentMethod: 'CASH',
          createdAt: new Date('2026-08-30T10:00:01.000Z'),
        },
      ],
    })

    const res = await GET(new Request('http://localhost/api/pharmacy-sales', { method: 'GET' }))
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.sales).toHaveLength(1)
    expect(data.sales[0].saleGroup).toBe('PSALE-20260830-0001')
    expect(data.sales[0].itemsCount).toBe(2)
    expect(data.sales[0].totalAmount).toBe(55)
    expect(data.sales[0].customerName).toBe('Grouped Customer')
    expect(data.sales[0].items).toHaveLength(2)
    expect(data.sales[0].items[0].productName).toBe(first.product.name)
    expect(data.sales[0].items[0].batchNumber).toBe(first.batch.batchNumber)
    expect(data.total).toBe(1)
    expect(data.totalPages).toBe(1)
  })

  it('GET applies filters before paginating sale groups', async () => {
    const { product, batch } = await seedStock(10, 25)

    for (let i = 1; i <= 5; i++) {
      await prisma.pharmacySale.create({
        data: {
          saleGroup: `PSALE-20260830-FILTER-${i}`,
          saleNumber: `PSALE-20260830-FILTER-${i}`,
          patientMr: i <= 4 ? 'MRFILTER' : 'MROTHER',
          customerName: i <= 4 ? `Filter Customer ${i}` : 'Other Customer',
          customerPhone: `984501234${i}`,
          productId: product.id,
          batchId: batch.id,
          quantity: 1,
          unitPrice: 25,
          totalAmount: 25,
          paymentMethod: i <= 4 ? 'UPI' : 'CASH',
          createdAt: new Date(`2026-08-3${i <= 2 ? '0' : '1'}T0${i}:00:00.000Z`),
        },
      })
    }

    const req = new Request(
      'http://localhost/api/pharmacy-sales?patientMr=MRFILTER&paymentMethod=UPI&startDate=2026-08-30&endDate=2026-08-31&page=1&pageSize=2',
      { method: 'GET' }
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.sales).toHaveLength(2)
    expect(data.page).toBe(1)
    expect(data.pageSize).toBe(2)
    expect(data.total).toBe(4)
    expect(data.totalPages).toBe(2)
    expect(data.sales.every((sale: any) => sale.patientMr === 'MRFILTER')).toBe(true)
    expect(data.sales.every((sale: any) => sale.paymentMethod === 'UPI')).toBe(true)
  })

  it('GET searches by sale number, customer, phone, and MR', async () => {
    const { product, batch } = await seedStock(10, 25)

    await prisma.pharmacySale.createMany({
      data: [
        {
          saleGroup: 'PSALE-20260830-SEARCH-1',
          saleNumber: 'PSALE-20260830-SEARCH-1',
          patientMr: 'MRSEARCH',
          customerName: 'Searchable Patient',
          customerPhone: '9000000001',
          productId: product.id,
          batchId: batch.id,
          quantity: 1,
          unitPrice: 25,
          totalAmount: 25,
          paymentMethod: 'CARD',
        },
        {
          saleGroup: 'PSALE-20260830-SEARCH-2',
          saleNumber: 'PSALE-20260830-SEARCH-2',
          customerName: 'Unrelated Patient',
          customerPhone: '9000000002',
          productId: product.id,
          batchId: batch.id,
          quantity: 1,
          unitPrice: 25,
          totalAmount: 25,
          paymentMethod: 'CASH',
        },
      ],
    })

    const res = await GET(new Request('http://localhost/api/pharmacy-sales?search=MRSEARCH', { method: 'GET' }))
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.sales).toHaveLength(1)
    expect(data.sales[0].saleGroup).toBe('PSALE-20260830-SEARCH-1')
  })

  it('POST creates a sale and reduces batch stock atomically', async () => {
    const { product, batch } = await seedStock(10, 25)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'John Doe',
        customerPhone: '9845012345',
        paymentMethod: 'CASH',
        items: [{ productId: product.id, batchId: batch.id, quantity: 3, unitPrice: 25 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.sale).toBeDefined()
    expect(data.sale.saleGroup).toContain('PSALE-')
    expect(data.sale.items).toHaveLength(1)
    expect(Number(data.sale.items[0].quantity)).toBe(3)
    expect(Number(data.sale.items[0].unitPrice)).toBe(25)
    expect(Number(data.sale.totalAmount)).toBe(75)

    const updatedBatch = await prisma.productBatch.findUnique({ where: { id: batch.id } })
    expect(Number(updatedBatch?.quantity)).toBe(7)

    const receipt = await prisma.batchReceipt.findFirst({ where: { batchId: batch.id } })
    expect(Number(receipt?.remainingQuantity)).toBe(7)

    const product2 = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(product2?.currentStock)).toBe(7)

    const tx = await prisma.inventoryTransaction.findFirst({
      where: { productId: product.id, type: 'SALE', referenceType: 'SALE_INVOICE' },
    })
    expect(tx).toBeDefined()
    expect(Number(tx?.quantity)).toBe(-3)
    expect(tx?.referenceId).toBe(data.sale.items[0].id)
  })

  it('POST falls back to batch sellingPrice when unitPrice is 0', async () => {
    const { product, batch } = await seedStock(10, 40)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Jane',
        paymentMethod: 'UPI',
        items: [{ productId: product.id, batchId: batch.id, quantity: 2, unitPrice: 0 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(Number(data.sale.items[0].unitPrice)).toBe(40)
    expect(Number(data.sale.totalAmount)).toBe(80)
  })

  it('POST rejects when stock is insufficient', async () => {
    const { product, batch } = await seedStock(2, 25)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Overflow',
        paymentMethod: 'CASH',
        items: [{ productId: product.id, batchId: batch.id, quantity: 5, unitPrice: 25 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/insufficient stock/i)

    const saleCount = await prisma.pharmacySale.count()
    expect(saleCount).toBe(0)
  })

  it('POST validates required fields and payment method', async () => {
    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: '', paymentMethod: 'BITCOIN', items: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST creates multiple sale lines grouped under one saleGroup', async () => {
    const first = await seedStock(10, 20)
    const second = await seedStock(5, 15)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Multi Buy',
        paymentMethod: 'CASH',
        items: [
          { productId: first.product.id, batchId: first.batch.id, quantity: 2, unitPrice: 20 },
          { productId: second.product.id, batchId: second.batch.id, quantity: 1, unitPrice: 15 },
        ],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.sale.items).toHaveLength(2)
    expect(data.sale.items[0].saleNumber).toBe(`${data.sale.saleGroup}-1`)
    expect(data.sale.items[1].saleNumber).toBe(`${data.sale.saleGroup}-2`)
    expect(Number(data.sale.totalAmount)).toBe(55)

    const saleRows = await prisma.pharmacySale.findMany({ where: { saleGroup: data.sale.saleGroup } })
    expect(saleRows).toHaveLength(2)
    expect(saleRows.every((s: any) => s.saleGroup === data.sale.saleGroup)).toBe(true)

    const firstBatch = await prisma.productBatch.findUnique({ where: { id: first.batch.id } })
    expect(Number(firstBatch?.quantity)).toBe(8)
    const secondBatch = await prisma.productBatch.findUnique({ where: { id: second.batch.id } })
    expect(Number(secondBatch?.quantity)).toBe(4)

    const txCount = await prisma.inventoryTransaction.count({ where: { type: 'SALE', referenceType: 'SALE_INVOICE' } })
    expect(txCount).toBe(2)
  })

  it('POST single item uses saleGroup as saleNumber (no suffix) and stores saleGroup', async () => {
    const { product, batch } = await seedStock(10, 25)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Solo',
        paymentMethod: 'CASH',
        items: [{ productId: product.id, batchId: batch.id, quantity: 1, unitPrice: 25 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    // single line: saleNumber === saleGroup, no -1 suffix
    expect(data.sale.items).toHaveLength(1)
    expect(data.sale.items[0].saleNumber).toBe(data.sale.saleGroup)
    expect(data.sale.saleGroup).not.toMatch(/-1$/)

    const stored = await prisma.pharmacySale.findFirst({ where: { saleGroup: data.sale.saleGroup } })
    expect(stored).toBeTruthy()
    expect(stored?.saleGroup).toBe(data.sale.saleGroup)
  })

  it('PATCH updates batch sellingPrice', async () => {
    const { batch } = await seedStock(10, 0)

    const req = new Request(`http://localhost/api/batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellingPrice: 99.5 }),
    })
    const res = await PATCH(req, { params: { id: batch.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Number(data.batch.sellingPrice)).toBe(99.5)

    const updated = await prisma.productBatch.findUnique({ where: { id: batch.id } })
    expect(Number(updated?.sellingPrice)).toBe(99.5)
  })

  it('PATCH rejects a negative sellingPrice', async () => {
    const { batch } = await seedStock(10, 0)

    const req = new Request(`http://localhost/api/batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellingPrice: -5 }),
    })
    const res = await PATCH(req, { params: { id: batch.id } })
    expect(res.status).toBe(400)
  })

  it('PATCH returns 404 for an unknown batch', async () => {
    const req = new Request('http://localhost/api/batches/does-not-exist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellingPrice: 10 }),
    })
    const res = await PATCH(req, { params: { id: 'does-not-exist' } })
    expect(res.status).toBe(404)
  })
})
