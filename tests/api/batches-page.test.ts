import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { GET as BatchesGet } from '@/app/api/batches/route'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.productSequence.deleteMany()
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Batches Page API', () => {
  it('GET /api/batches returns empty list initially', async () => {
    const req = new Request('http://localhost/api/batches', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(0)
  })

  it('GET /api/batches returns batches with purchase data', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Batch Test Product',
        code: 'PRD-BATCH-PAGE',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-PAGE-1', expiryDate: '2026-12-31' },
            { productId: product.id, quantity: 50, purchaseRate: 12, batchNumber: 'BATCH-PAGE-2', expiryDate: '2027-03-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(2)
    const batchNumbers = data.batches.map((b: any) => b.batchNumber).sort()
    expect(batchNumbers).toEqual(['BATCH-PAGE-1', 'BATCH-PAGE-2'])
    const batch1 = data.batches.find((b: any) => b.batchNumber === 'BATCH-PAGE-1')
    expect(batch1).toBeDefined()
    expect(batch1!.receipts).toHaveLength(1)
    expect(batch1!.receipts[0].supplierName).toBe('Batch Test Supplier')
    expect(batch1!.status).toBe('OK')
  })

  it('GET /api/batches filters by EXPIRED status', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Expired Batch Product',
        code: 'PRD-BATCH-EXP',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-EXP', expiryDate: '2020-01-01' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?expiryStatus=expired', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].status).toBe('EXPIRED')
  })

  it('GET /api/batches filters by EXPIRING_SOON status', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Expiring Soon Product',
        code: 'PRD-BATCH-SOON',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const today = new Date()
    const soonDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
    const soonDateStr = soonDate.toISOString().split('T')[0]

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-SOON', expiryDate: soonDateStr },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?expiryStatus=expiring_soon', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].status).toBe('EXPIRING_SOON')
  })

  it('GET /api/batches filters by NO_EXPIRY status', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'No Expiry Product',
        code: 'PRD-BATCH-NOEXP',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-NOEXP', expiryDate: '' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?expiryStatus=no_expiry', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].status).toBe('NO_EXPIRY')
  })

  it('GET /api/batches supports search by batch number', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Search Batch Product',
        code: 'PRD-BATCH-SEARCH',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'SEARCH-BATCH-1', expiryDate: '2026-12-31' },
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'OTHER-BATCH', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?search=SEARCH-BATCH-1', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].batchNumber).toBe('SEARCH-BATCH-1')
  })

  it('GET /api/batches search by product name', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Unique Product Name For Search',
        code: 'PRD-BATCH-SEARCH-2',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-SEARCH-2', expiryDate: '2026-12-31' },
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-SEARCH-2B', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?search=Unique Product Name', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(2)
    const batchNumbers = data.batches.map((b: any) => b.batchNumber).sort()
    expect(batchNumbers).toEqual(['BATCH-SEARCH-2', 'BATCH-SEARCH-2B'])
  })

  it('GET /api/batches search by supplier name', async () => {
    const supplierA = await prisma.supplier.create({
      data: { supplierName: 'Alpha Supplier', status: 'ACTIVE' },
    })
    const supplierB = await prisma.supplier.create({
      data: { supplierName: 'Beta Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Supplier Search Product',
        code: 'PRD-BATCH-SEARCH-3',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplierA.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-ALPHA', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplierB.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 12, batchNumber: 'BATCH-BETA', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?search=Alpha', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].batchNumber).toBe('BATCH-ALPHA')
  })

  it('GET /api/batches search is case-sensitive', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Case Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Case Product',
        code: 'PRD-BATCH-SEARCH-4',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'CASE-BATCH-1', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?search=CASE-BATCH-1', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].batchNumber).toBe('CASE-BATCH-1')
  })

  it('GET /api/batches search with no matches returns empty list', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'No Match Product',
        code: 'PRD-BATCH-SEARCH-5',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'NO-MATCH-BATCH', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches?search=NONEXISTENT', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(0)
  })

  it('GET /api/batches includes receipt details with supplier and invoice', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Receipt Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Receipt Detail Product',
        code: 'PRD-BATCH-RECEIPT',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-18',
          supplierId: supplier.id,
          paymentMode: 'CASH',
          items: [
            { productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-RECEIPT', expiryDate: '2026-12-31' },
          ],
        }),
      })
    )

    const req = new Request('http://localhost/api/batches', { method: 'GET' })
    const res = await BatchesGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batches).toHaveLength(1)
    expect(data.batches[0].receipts).toHaveLength(1)
    expect(data.batches[0].receipts[0].supplierName).toBe('Receipt Supplier')
    expect(data.batches[0].receipts[0].remainingQuantity).toBe(100)
    expect(data.batches[0].receipts[0].purchaseRate).toBe(10)
  })
})
