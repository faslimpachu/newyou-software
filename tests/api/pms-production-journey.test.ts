import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST as PurchasePost } from '@/app/api/purchase-invoices/route'
import { POST as PaymentPost } from '@/app/api/supplier-payments/route'
import { POST as AdjustmentPost } from '@/app/api/inventory-adjustments/route'
import { POST as ConsumePost } from '@/app/api/inventory/consume/route'
import { GET as DashboardGet } from '@/app/api/dashboard/route'
import { GET as BatchesGet } from '@/app/api/batches/route'
import { receiveStock, adjustStock, consumeStock, getInventoryValue, getExpiryStats } from '@/lib/inventory-service'

import { GET as SupplierGetById } from '@/app/api/suppliers/[id]/route'

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

describe('PMS Complete Production Journey', () => {
  it('full staff onboarding: categories, products, suppliers, opening batches', async () => {
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })

    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Medico Pharma', openingBalance: 5000, status: 'ACTIVE' },
    })

    const product = await prisma.product.create({
      data: {
        name: 'Paracetamol 500mg',
        code: 'PRD-PCM-001',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 8,
        sellingPrice: 15,
        gstPercent: 5,
        minimumStock: 50,
        maximumStock: 500,
        currentStock: 0,
        active: true,
      },
    })

    const products = await prisma.product.findMany({ where: { active: true } })
    expect(products).toHaveLength(1)

    await receiveStock({
      productId: product.id,
      quantity: 200,
      batchNumber: 'OPENING',
      supplierId: supplier.id,
      purchaseInvoiceId: '',
      expiryDate: null,
      purchaseRate: 8,
    })

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(1)

    const receipts = await prisma.batchReceipt.findMany({ where: { batchId: batches[0].id } })
    expect(receipts).toHaveLength(1)
    expect(Number(receipts[0].remainingQuantity)).toBe(200)
    expect(Number(receipts[0].purchaseRate)).toBe(8)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(200)

    const value = await getInventoryValue()
    expect(value).toBe(1600)
  })

  it('purchase workflow: atomic creation, GST, batches, stock, transactions', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'HealthCare Distributors', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Amoxicillin 250mg',
        code: 'PRD-AMX-001',
        categoryId: category.id,
        unit: 'strip',
        purchasePrice: 10,
        sellingPrice: 20,
        gstPercent: 12,
        minimumStock: 20,
        maximumStock: 200,
        currentStock: 0,
        active: true,
      },
    })

    const invoiceReq = new Request('http://localhost/api/purchase-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: '2026-08-17',
        supplierId: supplier.id,
        paymentMode: 'CREDIT',
        dueDate: '2026-09-15',
        items: [
          { productId: product.id, quantity: 100, purchaseRate: 10, gstPercent: 12, batchNumber: 'AMX-BATCH-1', expiryDate: '2026-12-31' },
          { productId: product.id, quantity: 50, purchaseRate: 11, gstPercent: 12, batchNumber: 'AMX-BATCH-2', expiryDate: '2027-03-31' },
        ],
      }),
    })

    const invoiceRes = await PurchasePost(invoiceReq)
    expect(invoiceRes.status).toBe(201)
    const invoiceData = await invoiceRes.json()
    expect(invoiceData.invoice.invoiceNumber).toContain('PINV-')

    const subtotal = 100 * 10 + 50 * 11
    const tax = 100 * 10 * 0.12 + 50 * 11 * 0.12
    const grandTotal = subtotal + tax
    expect(invoiceData.invoice.subtotal).toBeCloseTo(subtotal)
    expect(invoiceData.invoice.tax).toBeCloseTo(tax)
    expect(invoiceData.invoice.grandTotal).toBeCloseTo(grandTotal)

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(2)

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(updatedProduct?.currentStock)).toBe(150)

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id, type: 'PURCHASE' },
      orderBy: { createdAt: 'asc' },
    })
    expect(transactions).toHaveLength(2)
    expect(transactions[0].batchId).toBeDefined()
    expect(transactions[1].batchId).toBeDefined()
  })

  it('purchase rollback: no orphaned records on invalid item', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Rollback Product',
        code: 'PRD-ROLL-001',
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
        invoiceDate: '2026-08-17',
        supplierId: supplier.id,
        items: [
          { productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'BATCH-ROLL' },
          { productId: 'non-existent-id', quantity: 10, purchaseRate: 10, batchNumber: 'BATCH-BAD' },
        ],
      }),
    })

    const res = await PurchasePost(req)
    expect(res.status).toBe(400)

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(0)

    const transactions = await prisma.inventoryTransaction.findMany({ where: { productId: product.id } })
    expect(transactions).toHaveLength(0)

    const invoices = await prisma.purchaseInvoice.findMany()
    expect(invoices).toHaveLength(0)
  })

  it('same batch same expiry reuses ProductBatch and creates new BatchReceipt', async () => {
    const supplierA = await prisma.supplier.create({
      data: { supplierName: 'Supplier A', status: 'ACTIVE' },
    })
    const supplierB = await prisma.supplier.create({
      data: { supplierName: 'Supplier B', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Same Batch Product',
        code: 'PRD-SAME-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const expiry = '2026-12-31'
    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-17',
          supplierId: supplierA.id,
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'SAME-BATCH', expiryDate: expiry }],
        }),
      })
    )

    await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-17',
          supplierId: supplierB.id,
          items: [{ productId: product.id, quantity: 50, purchaseRate: 12, batchNumber: 'SAME-BATCH', expiryDate: expiry }],
        }),
      })
    )

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(1)
    expect(Number(batches[0].quantity)).toBe(150)

    const receipts = await prisma.batchReceipt.findMany({ where: { batchId: batches[0].id }, orderBy: { createdAt: 'asc' } })
    expect(receipts).toHaveLength(2)
    expect(receipts[0].supplierId).toBe(supplierA.id)
    expect(receipts[1].supplierId).toBe(supplierB.id)
  })

  it('same batch different expiry is rejected without partial changes', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Test Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Diff Expiry Product',
        code: 'PRD-DIFF-001',
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
          invoiceDate: '2026-08-17',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 50, purchaseRate: 10, batchNumber: 'DIFF-EXP', expiryDate: '2026-12-31' }],
        }),
      })
    )

    const res = await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-17',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 30, purchaseRate: 12, batchNumber: 'DIFF-EXP', expiryDate: '2027-06-30' }],
        }),
      })
    )
    expect(res.status).toBe(400)

    const batches = await prisma.productBatch.findMany({ where: { productId: product.id } })
    expect(batches).toHaveLength(1)
    expect(Number(batches[0].quantity)).toBe(50)
  })

  it('payment journey: partial, full, OVERDUE, and invalid cases', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Payment Supplier', openingBalance: 1000, status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Payment Product',
        code: 'PRD-PAY-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const invoiceRes = await PurchasePost(
      new Request('http://localhost/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: '2026-08-17',
          supplierId: supplier.id,
          paymentMode: 'CREDIT',
          dueDate: '2026-08-20',
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-PAY' }],
        }),
      })
    )
    const invoiceData = await invoiceRes.json()
    const invoiceId = invoiceData.invoice.id

    const partialRes = await PaymentPost(
      new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId,
          amount: 400,
          paymentDate: '2026-08-17',
          paymentMode: 'CASH',
        }),
      })
    )
    expect(partialRes.status).toBe(201)

    const invoiceAfterPartial = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    expect(invoiceAfterPartial?.status).toBe('OVERDUE')
    expect(Number(invoiceAfterPartial?.paid)).toBe(400)

    const fullRes = await PaymentPost(
      new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId,
          amount: Number(invoiceAfterPartial?.balance),
          paymentDate: '2026-08-17',
          paymentMode: 'CASH',
        }),
      })
    )
    expect(fullRes.status).toBe(201)

    const invoiceAfterPaid = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    expect(invoiceAfterPaid?.status).toBe('PAID')
    expect(Number(invoiceAfterPaid?.balance)).toBeLessThanOrEqual(0)
  })

  it('overdue and dashboard stats after payments', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Overdue Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Overdue Product',
        code: 'PRD-OD-001',
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
          invoiceDate: '2026-08-17',
          supplierId: supplier.id,
          paymentMode: 'CREDIT',
          dueDate: '2026-08-18',
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-OD' }],
        }),
      })
    )

    const dashRes = await DashboardGet(new Request('http://localhost/api/dashboard'))
    expect(dashRes.status).toBe(200)
    const dashData = await dashRes.json()
    expect(dashData.purchase.totalSuppliers).toBeGreaterThanOrEqual(1)
    expect(dashData.purchase.inventoryValue).toBeGreaterThan(0)
  })

  it('inventory adjustment journey: increase, decrease, FIFO, validation', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Adjust Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Adjust Product',
        code: 'PRD-ADJ-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-ADJ',
        expiryDate: null,
        quantity: 100,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch.id,
        supplierId: supplier.id,
        sourceType: 'OPENING',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 10,
      },
    })

    await adjustStock({
      productId: product.id,
      type: 'ADJUSTMENT_IN',
      quantity: 20,
      batchId: batch.id,
      unitCost: 14,
      supplierId: supplier.id,
    })

    const afterIncrease = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(afterIncrease?.currentStock)).toBe(120)

    const receiptsAfterIncrease = await prisma.batchReceipt.findMany({ where: { batchId: batch.id } })
    const newReceipt = receiptsAfterIncrease.find((r) => r.sourceType === 'ADJUSTMENT')
    expect(newReceipt).toBeDefined()
    expect(Number(newReceipt?.remainingQuantity)).toBe(20)

    await adjustStock({
      productId: product.id,
      type: 'ADJUSTMENT_OUT',
      quantity: 30,
      batchId: batch.id,
    })

    const afterDecrease = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(afterDecrease?.currentStock)).toBe(90)

    const batchAfter = await prisma.productBatch.findUnique({ where: { id: batch.id } })
    expect(Number(batchAfter?.quantity)).toBe(90)

    const receiptsAfterDecrease = await prisma.batchReceipt.findMany({
      where: { batchId: batch.id },
      orderBy: { createdAt: 'asc' },
    })
    const openingReceipt = receiptsAfterDecrease.find((r) => r.sourceType === 'OPENING')
    expect(Number(openingReceipt?.remainingQuantity)).toBe(70)
  })

  it('FEFO consumption across multiple batches and expiry boundaries', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'FEFO Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'FEFO Product',
        code: 'PRD-FEFO-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const batch1 = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'FEFO-1',
        expiryDate: new Date('2026-08-25'),
        quantity: 100,
      },
    })
    const batch2 = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'FEFO-2',
        expiryDate: new Date('2026-09-30'),
        quantity: 100,
      },
    })
    const batch3 = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'FEFO-3',
        expiryDate: new Date('2026-12-31'),
        quantity: 50,
      },
    })

    await prisma.batchReceipt.create({ data: { batchId: batch1.id, supplierId: supplier.id, sourceType: 'PURCHASE', quantity: 100, remainingQuantity: 100, purchaseRate: 10 } })
    await prisma.batchReceipt.create({ data: { batchId: batch2.id, supplierId: supplier.id, sourceType: 'PURCHASE', quantity: 100, remainingQuantity: 100, purchaseRate: 12 } })
    await prisma.batchReceipt.create({ data: { batchId: batch3.id, supplierId: supplier.id, sourceType: 'PURCHASE', quantity: 50, remainingQuantity: 50, purchaseRate: 14 } })

    await prisma.product.update({
      where: { id: product.id },
      data: { currentStock: 250 },
    })

    const txns = await consumeStock({ productId: product.id, quantity: 120 })
    expect(txns).toHaveLength(2)
    expect(txns[0].batchId).toBe(batch1.id)
    expect(txns[1].batchId).toBe(batch2.id)
    expect(Number(txns[0].quantity)).toBe(-100)
    expect(Number(txns[1].quantity)).toBe(-20)

    const batch1After = await prisma.productBatch.findUnique({ where: { id: batch1.id } })
    const batch2After = await prisma.productBatch.findUnique({ where: { id: batch2.id } })
    expect(Number(batch1After?.quantity)).toBe(0)
    expect(Number(batch2After?.quantity)).toBe(80)

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(productAfter?.currentStock)).toBe(130)
  })

  it('expired batch is rejected by consumeStock and accepted by EXPIRED adjustment', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Expiry Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Expiry Product',
        code: 'PRD-EXP-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const expiredBatch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'EXP-BATCH',
        expiryDate: new Date('2020-01-01'),
        quantity: 100,
      },
    })
    await prisma.batchReceipt.create({
      data: {
        batchId: expiredBatch.id,
        supplierId: supplier.id,
        sourceType: 'PURCHASE',
        quantity: 100,
        remainingQuantity: 100,
        purchaseRate: 10,
      },
    })

    const consumeRes = await ConsumePost(
      new Request('http://localhost/api/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 10 }),
      })
    )
    expect(consumeRes.status).toBe(400)

    await adjustStock({
      productId: product.id,
      type: 'EXPIRED',
      quantity: 100,
      batchId: expiredBatch.id,
    })

    const afterExpired = await prisma.product.findUnique({ where: { id: product.id } })
    expect(Number(afterExpired?.currentStock)).toBe(0)

    const expiredBatchAfter = await prisma.productBatch.findUnique({ where: { id: expiredBatch.id } })
    expect(Number(expiredBatchAfter?.quantity)).toBe(0)
  })

  it('supplier ledger formula: openingBalance + purchases - payments', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Ledger Supplier', openingBalance: 1000, status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Ledger Product',
        code: 'PRD-LEDGER-001',
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
          invoiceDate: '2026-08-17',
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 100, purchaseRate: 10, batchNumber: 'BATCH-LEDGER' }],
        }),
      })
    )

    const invoice = await prisma.purchaseInvoice.findFirst({ where: { supplierId: supplier.id } })
    await PaymentPost(
      new Request('http://localhost/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          invoiceId: invoice!.id,
          amount: 300,
          paymentDate: '2026-08-17',
          paymentMode: 'CASH',
        }),
      })
    )

    const req = new Request(`http://localhost/api/suppliers/${supplier.id}`, { method: 'GET' })
    const res = await SupplierGetById(req, { params: { id: supplier.id } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ledger.totalPurchases).toBeGreaterThan(0)
    expect(data.ledger.totalPayments).toBe(300)
    expect(data.ledger.outstandingBalance).toBeCloseTo(1000 + data.ledger.totalPurchases - 300)
  })
})
