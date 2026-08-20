import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/products/route'
import { GET as GETById, PATCH, DELETE } from '@/app/api/products/[id]/route'
import { GET as GETLowStock } from '@/app/api/products/low-stock/route'
import { GET as BatchesGet } from '@/app/api/batches/route'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.supplierPayment.deleteMany()
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

  it('GET returns all products when no active filter is provided', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Active Product GET',
        code: 'PRD-ACTIVE-GET2',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: true,
      },
    })
    await prisma.product.create({
      data: {
        name: 'Inactive Product GET',
        code: 'PRD-INACTIVE-GET2',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: false,
      },
    })

    const req = new Request('http://localhost/api/products', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.products).toHaveLength(2)
  })

  it('GET filters by active=true when explicitly passed', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Active Product GET3',
        code: 'PRD-ACTIVE-GET3',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: true,
      },
    })
    await prisma.product.create({
      data: {
        name: 'Inactive Product GET3',
        code: 'PRD-INACTIVE-GET3',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: false,
      },
    })

    const req = new Request('http://localhost/api/products?active=true', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.products).toHaveLength(1)
    expect(data.products[0].name).toBe('Active Product GET3')
  })

  it('GET filters by active=false when explicitly passed', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Active Product GET4',
        code: 'PRD-ACTIVE-GET4',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: true,
      },
    })
    await prisma.product.create({
      data: {
        name: 'Inactive Product GET4',
        code: 'PRD-INACTIVE-GET4',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: false,
      },
    })

    const req = new Request('http://localhost/api/products?active=false', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.products).toHaveLength(1)
    expect(data.products[0].name).toBe('Inactive Product GET4')
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

  it('POST rejects gstPercent > 100', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad GST Product',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 150,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('GST percent must be between 0 and 100')
  })

  it('POST rejects negative gstPercent', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad GST Product',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: -5,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('GST percent must be between 0 and 100')
  })

  it('PATCH rejects gstPercent > 100', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Product',
        code: 'PRD-GST-PATCH',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gstPercent: 100.01 }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('GST percent must be between 0 and 100')
  })

  it('GET batches includes supplier names for batch table', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Batch Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Batch Product',
        code: 'PRD-BATCH-SUP',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        paymentMode: 'CASH',
        items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-SUP', expiryDate: '2026-12-31' }],
      }),
    })
    const postRes = await PurchasePost(req)
    if (postRes.status !== 201) {
      const err = await postRes.json()
      console.error('Purchase invoice creation failed:', err)
    }
    expect(postRes.status).toBe(201)

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(1)

    const batchRes = await BatchesGet(new Request('http://localhost/api/batches'))
    const batchData = await batchRes.json()
    expect(batchData.batches).toHaveLength(1)
    expect(batchData.batches[0].receipts[0].supplierName).toBe('Batch Supplier')
  })

  it('POST returns specific error for duplicate SKU', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    await prisma.product.create({
      data: {
        name: 'Product A',
        code: 'PRD-SKU-A',
        sku: 'SKU-DUP-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
      },
    })

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Product B',
        sku: 'SKU-DUP-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('SKU already exists')
  })

  it('PATCH returns specific error for duplicate SKU', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const productA = await prisma.product.create({
      data: {
        name: 'Product A',
        code: 'PRD-PATCH-SKU-A',
        sku: 'SKU-PATCH-DUP',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
      },
    })
    const productB = await prisma.product.create({
      data: {
        name: 'Product B',
        code: 'PRD-PATCH-SKU-B',
        sku: 'SKU-PATCH-B',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
      },
    })

    const req = new Request(`http://localhost/api/products/${productB.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'SKU-PATCH-DUP' }),
    })
    const res = await PATCH(req, { params: { id: productB.id } })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('SKU already exists')
  })

  it('PATCH rejects update of deactivated product', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Deactivated Product',
        code: 'PRD-INACTIVE-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: false,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Cannot update a deactivated product.')
  })

  it('PATCH rejects toggling active status', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Active Product',
        code: 'PRD-ACTIVE-TOGGLE',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: true,
      },
    })

    const req = new Request(`http://localhost/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
    const res = await PATCH(req, { params: { id: product.id } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Product activation status cannot be changed here. Use delete to deactivate.')
  })

  it('POST creates product with active=true regardless of request body', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Force Active Product',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercent: 5,
        active: false,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.product.active).toBe(true)
  })
})
