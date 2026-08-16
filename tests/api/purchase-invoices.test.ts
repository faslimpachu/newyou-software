import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/purchase-invoices/route'
import { GET as GETById } from '@/app/api/purchase-invoices/[id]/route'
import { prisma } from '@/lib/prisma'

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
  await prisma.sequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Purchase Invoices API', () => {
  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/purchase-invoices', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoices).toHaveLength(0)
  })

  it('POST creates a purchase invoice and updates stock', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        paymentMode: 'CASH',
        items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice).toBeDefined()
    expect(data.invoice.invoiceNumber).toContain('PINV-')

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(50)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id, type: 'PURCHASE' },
    })
    expect(transactions).toHaveLength(1)
    expect(Number(transactions[0].quantity)).toBe(50)
  })

  it('GET returns invoices with items', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
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

    const req = new Request('http://localhost/api/purchase-invoices', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoices).toHaveLength(1)
    expect(data.invoices[0].invoiceNumber).toBe('PINV-TEST-001')
  })

  it('GET by ID returns invoice with supplier and items', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-TEST-002',
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

    const req = new Request(`http://localhost/api/purchase-invoices/${invoice.id}`, { method: 'GET' })
    const res = await GETById(req, { params: { id: invoice.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoice.invoiceNumber).toBe('PINV-TEST-002')
    expect(data.invoice.supplier.supplierName).toBe('Test Supplier')
  })

  it('POST rejects quantity <= 0', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 0, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Quantity must be greater than zero')
  })

  it('POST rejects purchaseRate <= 0', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 10, purchaseRate: 0, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Purchase rate must be greater than zero')
  })

  it('POST rejects missing supplier', async () => {
    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: 'non-existent-supplier-id',
        items: [{ productId: 'non-existent-product-id', quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Supplier not found')
  })

  it('POST rejects missing products', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: 'non-existent-product-id', quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Products not found')
  })

  it('POST rejects duplicate products when enforced', async () => {
    const originalEnv = process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS
    process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS = 'true'

    try {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
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

      const req = new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-02',
          supplierId: supplier.id,
          items: [
            { productId: product.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' },
            { productId: product.id, quantity: 5, purchaseRate: 10, batchNumber: 'BATCH-002' },
          ],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Duplicate products are not allowed in the same invoice')
    } finally {
      process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS = originalEnv
    }
  })

  it('POST allows duplicate products when not enforced', async () => {
    const originalEnv = process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS
    process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS = 'false'

    try {
      const supplier = await prisma.supplier.create({
        data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
      })
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

      const req = new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-02',
          supplierId: supplier.id,
          items: [
            { productId: product.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' },
            { productId: product.id, quantity: 5, purchaseRate: 10, batchNumber: 'BATCH-002' },
          ],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.invoice.items).toHaveLength(2)
    } finally {
      process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS = originalEnv
    }
  })

  it('POST auto-updates product.purchasePrice from invoice purchaseRate', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 50, purchaseRate: 18, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.purchasePrice)).toBe(18)
    expect(Number(updatedProduct?.sellingPrice)).toBe(15)
  })

  it('POST updates product.purchasePrice to latest purchaseRate on subsequent purchases', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const firstReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 50, purchaseRate: 12, batchNumber: 'BATCH-001' }],
      }),
    })
    await POST(firstReq)

    const secondReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-03',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 30, purchaseRate: 18, batchNumber: 'BATCH-001' }],
      }),
    })
    await POST(secondReq)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.purchasePrice)).toBe(18)
    expect(Number(updatedProduct?.currentStock)).toBe(80)
  })

  it('POST preserves historical purchaseRate on invoice items', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
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

    const firstReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 50, purchaseRate: 12, batchNumber: 'BATCH-001' }],
      }),
    })
    const firstRes = await POST(firstReq)
    const firstInvoice = await firstRes.json()

    const secondReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-03',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 30, purchaseRate: 18, batchNumber: 'BATCH-001' }],
      }),
    })
    const secondRes = await POST(secondReq)
    const secondInvoice = await secondRes.json()

    const firstItem = firstInvoice.invoice.items[0]
    const secondItem = secondInvoice.invoice.items[0]
    expect(firstItem.purchaseRate).toBe(12)
    expect(secondItem.purchaseRate).toBe(18)
  })

  it('POST calculates mixed GST rates per line', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const productA = await prisma.product.create({
      data: { name: 'Product A', code: 'PRD-A', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 5 },
    })
    const productB = await prisma.product.create({
      data: { name: 'Product B', code: 'PRD-B', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 12 },
    })
    const productC = await prisma.product.create({
      data: { name: 'Product C', code: 'PRD-C', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 18 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [
            { productId: productA.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' },
            { productId: productB.id, quantity: 5, purchaseRate: 20, batchNumber: 'BATCH-002' },
            { productId: productC.id, quantity: 2, purchaseRate: 100, batchNumber: 'BATCH-003' },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.subtotal).toBeCloseTo(10 * 10 + 5 * 20 + 2 * 100)
    expect(data.invoice.tax).toBeCloseTo(10 * 10 * 0.05 + 5 * 20 * 0.12 + 2 * 100 * 0.18)
    expect(data.invoice.grandTotal).toBeCloseTo(data.invoice.subtotal + data.invoice.tax)
  })

  it('POST applies zero GST correctly', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: { name: 'Zero GST Product', code: 'PRD-ZERO', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 0 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.tax).toBe(0)
    expect(data.invoice.grandTotal).toBe(data.invoice.subtotal)
  })

  it('POST does not modify product gstPercent after invoice creation', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: { name: 'Product', code: 'PRD-GST', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 12 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.gstPercent)).toBe(12)
  })

  it('POST treats default gstPercent 0 as no tax', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: { name: 'Default GST Product', code: 'PRD-DEFAULT', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.tax).toBe(0)
  })

  it('POST calculates 5% GST correctly for all items', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const productA = await prisma.product.create({
      data: { name: 'Product A', code: 'PRD-A5', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 5 },
    })
    const productB = await prisma.product.create({
      data: { name: 'Product B', code: 'PRD-B5', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 5 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [
          { productId: productA.id, quantity: 10, purchaseRate: 10 },
          { productId: productB.id, quantity: 5, purchaseRate: 20 },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.tax).toBeCloseTo(data.invoice.subtotal * 0.05)
  })

  it('POST calculates 18% GST correctly for all items', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const productA = await prisma.product.create({
      data: { name: 'Product A', code: 'PRD-A18', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 18 },
    })
    const productB = await prisma.product.create({
      data: { name: 'Product B', code: 'PRD-B18', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 18 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [
          { productId: productA.id, quantity: 2, purchaseRate: 100 },
          { productId: productB.id, quantity: 1, purchaseRate: 500 },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.tax).toBeCloseTo(data.invoice.subtotal * 0.18)
  })

  it('POST calculates fractional GST rate correctly', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: { name: 'Fractional GST Product', code: 'PRD-FRAC', categoryId: category.id, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, currentStock: 0, minimumStock: 10, maximumStock: 200, gstPercent: 12.5 },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-001' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.invoice.subtotal).toBeCloseTo(100)
    expect(data.invoice.tax).toBeCloseTo(12.5)
    expect(data.invoice.grandTotal).toBeCloseTo(112.5)
  })

  it('POST rejects empty items array', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })

    const req = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-02',
        supplierId: supplier.id,
        items: [],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Purchase invoice must contain at least one item')
  })
})
