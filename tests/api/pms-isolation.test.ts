import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
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

describe('PMS Isolation Tests', () => {
  it('database schema has no FK from PMS tables to clinical tables', async () => {
    const tables = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `

    const pmsTables = [
      'product_categories',
      'products',
      'suppliers',
      'purchase_invoices',
      'purchase_invoice_items',
      'supplier_payments',
      'inventory_transactions',
      'product_batches',
      'batch_receipts',
      'sequences',
    ]

    const existingTables = tables.map((t) => t.TABLE_NAME)
    for (const table of pmsTables) {
      expect(existingTables).toContain(table)
    }

    const fks = await prisma.$queryRaw<Array<{ TABLE_NAME: string; COLUMN_NAME: string; REFERENCED_TABLE_NAME: string }>>`
      SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `

    const clinicalTables = ['patients', 'visits', 'op_sheets', 'prescriptions', 'invoices', 'invoice_items', 'documents', 'expenses', 'follow_ups', 'nutrition_assessments', 'ayurcare_treatments']

    for (const fk of fks) {
      if (pmsTables.includes(fk.TABLE_NAME)) {
        expect(clinicalTables).not.toContain(fk.REFERENCED_TABLE_NAME)
      }
      if (clinicalTables.includes(fk.TABLE_NAME)) {
        expect(pmsTables).not.toContain(fk.REFERENCED_TABLE_NAME)
      }
    }
  })

  it('PMS operations do not require clinical identifiers', async () => {
    const supplier = await prisma.supplier.create({
      data: { supplierName: 'Isolated Supplier', status: 'ACTIVE' },
    })
    const category = await prisma.productCategory.create({
      data: { name: 'Medicines', active: true },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Isolated Product',
        code: 'PRD-ISO-001',
        categoryId: category.id,
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 200,
      },
    })

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: 'PINV-ISO-001',
        invoiceDate: new Date('2026-08-02'),
        supplierId: supplier.id,
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 0,
        balance: 110,
        status: 'PENDING',
      },
    })

    await prisma.purchaseInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productId: product.id,
        quantity: 10,
        purchaseRate: 10,
        amount: 100,
      },
    })

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'BATCH-ISO',
        expiryDate: null,
        quantity: 10,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch.id,
        supplierId: supplier.id,
        purchaseInvoiceId: invoice.id,
        sourceType: 'PURCHASE',
        quantity: 10,
        remainingQuantity: 10,
        purchaseRate: 10,
      },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        batchId: batch.id,
        type: 'PURCHASE',
        quantity: 10,
        referenceType: 'PURCHASE_INVOICE',
        referenceId: invoice.id,
      },
    })

    await prisma.supplierPayment.create({
      data: {
        paymentNumber: 'PPAY-ISO-001',
        supplierId: supplier.id,
        invoiceId: invoice.id,
        amount: 50,
        paymentDate: new Date('2026-08-02'),
        paymentMode: 'CASH',
      },
    })

    const allPmsRecords = await prisma.$queryRaw<any[]>`
      SELECT 'supplier' as table_name, COUNT(*) as count FROM suppliers
      UNION ALL
      SELECT 'product', COUNT(*) FROM products
      UNION ALL
      SELECT 'purchase_invoice', COUNT(*) FROM purchase_invoices
      UNION ALL
      SELECT 'purchase_invoice_item', COUNT(*) FROM purchase_invoice_items
      UNION ALL
      SELECT 'supplier_payment', COUNT(*) FROM supplier_payments
      UNION ALL
      SELECT 'inventory_transaction', COUNT(*) FROM inventory_transactions
      UNION ALL
      SELECT 'product_batch', COUNT(*) FROM product_batches
      UNION ALL
      SELECT 'batch_receipt', COUNT(*) FROM batch_receipts
    `

    for (const row of allPmsRecords) {
      expect(Number(row.count)).toBeGreaterThan(0)
    }
  })
})
