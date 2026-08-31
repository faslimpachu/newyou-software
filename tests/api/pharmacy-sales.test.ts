import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { POST } from '@/app/api/pharmacy-sales/route'
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
  const category = await prisma.productCategory.create({ data: { name: 'Medicines', active: true } })
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
  it('POST creates a sale and reduces batch stock atomically', async () => {
    const { product, batch } = await seedStock(10, 25)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'John Doe',
        customerPhone: '9845012345',
        productId: product.id,
        batchId: batch.id,
        quantity: 3,
        unitPrice: 25,
        paymentMethod: 'CASH',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.sale).toBeDefined()
    expect(data.sale.saleNumber).toContain('PSALE-')
    expect(Number(data.sale.quantity)).toBe(3)
    expect(Number(data.sale.unitPrice)).toBe(25)
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
    expect(tx?.referenceId).toBe(data.sale.id)
  })

  it('POST falls back to batch sellingPrice when unitPrice is 0', async () => {
    const { product, batch } = await seedStock(10, 40)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Jane',
        productId: product.id,
        batchId: batch.id,
        quantity: 2,
        unitPrice: 0,
        paymentMethod: 'UPI',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(Number(data.sale.unitPrice)).toBe(40)
    expect(Number(data.sale.totalAmount)).toBe(80)
  })

  it('POST rejects when stock is insufficient', async () => {
    const { product, batch } = await seedStock(2, 25)

    const req = new Request('http://localhost/api/pharmacy-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Overflow',
        productId: product.id,
        batchId: batch.id,
        quantity: 5,
        unitPrice: 25,
        paymentMethod: 'CASH',
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
      body: JSON.stringify({ customerName: '', productId: '', batchId: '', quantity: 1, unitPrice: 1, paymentMethod: 'BITCOIN' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
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
