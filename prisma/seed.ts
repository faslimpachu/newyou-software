import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('change-me-immediately', 10)

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { active: true },
    create: {
      username: 'superadmin',
      name: 'Super Admin',
      passwordHash,
      role: 'superadmin',
      active: true,
    },
  })

  await prisma.mRSequence.upsert({
    where: { id: 'GLOBAL' },
    update: {},
    create: { id: 'GLOBAL', lastNumber: 0 },
  })

  await prisma.visitSequence.upsert({
    where: { id: 'NUTRITION' },
    update: {},
    create: { id: 'NUTRITION', centerType: 'NUTRITION', lastNumber: 0 },
  })

  await prisma.visitSequence.upsert({
    where: { id: 'AYURCARE' },
    update: {},
    create: { id: 'AYURCARE', centerType: 'AYURCARE', lastNumber: 0 },
  })

  const sequences = [
    { id: 'PURCHASE_INVOICE', name: 'Purchase Invoice' },
    { id: 'SUPPLIER_PAYMENT', name: 'Supplier Payment' },
    { id: 'SALE_INVOICE', name: 'Sale Invoice' },
    { id: 'PRODUCT', name: 'Product' },
  ]

  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { id: seq.id },
      update: {},
      create: { id: seq.id, name: seq.name, lastNumber: 0 },
    })
  }

  const categories = [
    { name: 'Medicines', description: 'Allopathic and Ayurvedic medicines' },
    { name: 'Supplements', description: 'Vitamins, minerals, and health supplements' },
    { name: 'Herbal Products', description: 'Herbal powders, oils, and formulations' },
    { name: 'Equipment', description: 'Medical and clinic equipment' },
    { name: 'Consumables', description: 'Disposable items and consumables' },
    { name: 'Other', description: 'Miscellaneous items' },
  ]

  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.sequence.deleteMany()

  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    const created = await prisma.productCategory.create({
      data: cat,
    })
    categoryMap.set(cat.name, created.id)
  }

  const suppliers = [
    {
      supplierName: 'ABC Pharma Pvt Ltd',
      contactPerson: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@abcpharma.com',
      address: '123 Industrial Area, Mumbai',
      gstNumber: 'GSTIN1234567890',
      openingBalance: 15000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'XYZ Healthcare',
      contactPerson: 'Priya Sharma',
      phone: '8765432109',
      email: 'priya@xyzhealthcare.com',
      address: '456 Medical Complex, Delhi',
      gstNumber: 'GSTIN0987654321',
      openingBalance: 8000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'Herbal Life India',
      contactPerson: 'Amit Patel',
      phone: '7654321098',
      email: 'amit@herballife.in',
      address: '789 Ayurveda Nagar, Ahmedabad',
      gstNumber: 'GSTIN1122334455',
      openingBalance: 0,
      status: 'ACTIVE',
    },
    {
      supplierName: 'MediEquip Solutions',
      contactPerson: 'Sneha Gupta',
      phone: '6543210987',
      email: 'sneha@mediequip.com',
      address: '321 Tech Park, Bangalore',
      gstNumber: 'GSTIN5566778899',
      openingBalance: 25000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'NutriSupplements Co',
      contactPerson: 'Vikram Singh',
      phone: '5432109876',
      email: 'vikram@nutrisupplements.co.in',
      address: '654 Health Street, Chennai',
      gstNumber: 'GSTIN9988776655',
      openingBalance: 5000,
      status: 'INACTIVE',
    },
  ]

  const supplierMap = new Map<string, string>()
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({
      data: supplier as any,
    })
    supplierMap.set(supplier.supplierName, created.id)
  }

  const products = [
    { name: 'Paracetamol 500mg', sku: 'MED001', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 8, sellingPrice: 15, gstPercent: 5, minimumStock: 50, maximumStock: 200, currentStock: 500 },
    { name: 'Amoxicillin 250mg', sku: 'MED002', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 25, sellingPrice: 45, gstPercent: 5, minimumStock: 30, maximumStock: 150, currentStock: 200 },
    { name: 'Vitamin D3 60K', sku: 'SUP001', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 80, sellingPrice: 150, gstPercent: 5, minimumStock: 20, maximumStock: 100, currentStock: 100 },
    { name: 'Omega-3 Fish Oil', sku: 'SUP002', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 120, sellingPrice: 220, gstPercent: 5, minimumStock: 15, maximumStock: 80, currentStock: 75 },
    { name: 'Triphala Powder', sku: 'HERB001', categoryId: categoryMap.get('Herbal Products')!, unit: 'packet', purchasePrice: 45, sellingPrice: 90, gstPercent: 5, minimumStock: 20, maximumStock: 100, currentStock: 150 },
    { name: 'Ashwagandha Capsules', sku: 'HERB002', categoryId: categoryMap.get('Herbal Products')!, unit: 'bottle', purchasePrice: 150, sellingPrice: 280, gstPercent: 5, minimumStock: 10, maximumStock: 60, currentStock: 60 },
    { name: 'Digital BP Monitor', sku: 'EQP001', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 1200, sellingPrice: 2000, gstPercent: 12, minimumStock: 5, maximumStock: 20, currentStock: 15 },
    { name: 'Stethoscope', sku: 'EQP002', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 350, sellingPrice: 600, gstPercent: 12, minimumStock: 5, maximumStock: 20, currentStock: 10 },
    { name: 'Syringes 10ml', sku: 'CON001', categoryId: categoryMap.get('Consumables')!, unit: 'box', purchasePrice: 45, sellingPrice: 80, gstPercent: 5, minimumStock: 30, maximumStock: 150, currentStock: 200 },
    { name: 'Gauze Pieces', sku: 'CON002', categoryId: categoryMap.get('Consumables')!, unit: 'packet', purchasePrice: 15, sellingPrice: 28, gstPercent: 5, minimumStock: 50, maximumStock: 300, currentStock: 300 },
    { name: 'Protein Powder', sku: 'SUP003', categoryId: categoryMap.get('Supplements')!, unit: 'packet', purchasePrice: 250, sellingPrice: 450, gstPercent: 5, minimumStock: 15, maximumStock: 80, currentStock: 45 },
    { name: 'Cetrizine 10mg', sku: 'MED003', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 12, sellingPrice: 22, gstPercent: 5, minimumStock: 40, maximumStock: 200, currentStock: 350 },
  ]

  const productMap = new Map<string, string>()
  for (const product of products) {
    const created = await prisma.product.create({
      data: { ...product, code: `PRD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(productMap.size + 1).padStart(4, '0')}` },
    })
    productMap.set(product.sku, created.id)

    if (product.currentStock > 0) {
      const batch = await prisma.productBatch.create({
        data: {
          productId: created.id,
          batchNumber: 'OPENING',
          expiryDate: null,
          quantity: product.currentStock,
        },
      })

      await prisma.batchReceipt.create({
        data: {
          batchId: batch.id,
          supplierId: (supplierMap.get('ABC Pharma Pvt Ltd') || supplierMap.values().next().value)!,
          sourceType: 'OPENING',
          quantity: product.currentStock,
          remainingQuantity: product.currentStock,
          purchaseRate: product.purchasePrice,
        },
      })
    }
  }

  const purchaseInvoices = [
    {
      invoiceNumber: 'PINV-20260801-0001',
      invoiceDate: new Date('2026-08-01'),
      supplierId: supplierMap.get('ABC Pharma Pvt Ltd')!,
      paymentMode: 'BANK',
      dueDate: new Date('2026-08-15'),
      notes: 'Monthly medicine stock',
      subtotal: 2500,
      tax: 300,
      grandTotal: 2800,
      paid: 2800,
      balance: 0,
      status: 'PAID',
    },
    {
      invoiceNumber: 'PINV-20260801-0002',
      invoiceDate: new Date('2026-08-01'),
      supplierId: supplierMap.get('XYZ Healthcare')!,
      paymentMode: 'CREDIT',
      dueDate: new Date('2026-08-20'),
      notes: 'Supplements batch',
      subtotal: 4500,
      tax: 540,
      grandTotal: 5040,
      paid: 2000,
      balance: 3040,
      status: 'PARTIAL',
    },
    {
      invoiceNumber: 'PINV-20260802-0001',
      invoiceDate: new Date('2026-08-02'),
      supplierId: supplierMap.get('Herbal Life India')!,
      paymentMode: 'CASH',
      dueDate: new Date('2026-08-10'),
      notes: 'Herbal products',
      subtotal: 1800,
      tax: 216,
      grandTotal: 2016,
      paid: 0,
      balance: 2016,
      status: 'PENDING',
    },
    {
      invoiceNumber: 'PINV-20260802-0002',
      invoiceDate: new Date('2026-08-02'),
      supplierId: supplierMap.get('MediEquip Solutions')!,
      paymentMode: 'BANK',
      dueDate: new Date('2026-08-25'),
      notes: 'Equipment purchase',
      subtotal: 8000,
      tax: 960,
      grandTotal: 8960,
      paid: 5000,
      balance: 3960,
      status: 'PARTIAL',
    },
  ]

  const invoiceMap = new Map<string, string>()
  for (const invoice of purchaseInvoices) {
    const created = await prisma.purchaseInvoice.create({
      data: invoice as any,
    })
    invoiceMap.set(invoice.invoiceNumber, created.id)
  }

  const invoice1Id = invoiceMap.get('PINV-20260801-0001')!
  const invoice2Id = invoiceMap.get('PINV-20260801-0002')!
  const invoice3Id = invoiceMap.get('PINV-20260802-0001')!
  const invoice4Id = invoiceMap.get('PINV-20260802-0002')!

  const invoiceItems = [
    { invoiceId: invoice1Id, productId: productMap.get('MED001')!, quantity: 100, purchaseRate: 8, amount: 800 },
    { invoiceId: invoice1Id, productId: productMap.get('MED002')!, quantity: 50, purchaseRate: 25, amount: 1250 },
    { invoiceId: invoice1Id, productId: productMap.get('MED003')!, quantity: 70, purchaseRate: 12, amount: 840 },
    { invoiceId: invoice2Id, productId: productMap.get('SUP001')!, quantity: 40, purchaseRate: 80, amount: 3200 },
    { invoiceId: invoice2Id, productId: productMap.get('SUP002')!, quantity: 20, purchaseRate: 120, amount: 2400 },
    { invoiceId: invoice2Id, productId: productMap.get('SUP003')!, quantity: 25, purchaseRate: 250, amount: 6250 },
    { invoiceId: invoice3Id, productId: productMap.get('HERB001')!, quantity: 80, purchaseRate: 45, amount: 3600 },
    { invoiceId: invoice3Id, productId: productMap.get('HERB002')!, quantity: 30, purchaseRate: 150, amount: 4500 },
    { invoiceId: invoice4Id, productId: productMap.get('EQP001')!, quantity: 3, purchaseRate: 1200, amount: 3600 },
    { invoiceId: invoice4Id, productId: productMap.get('EQP002')!, quantity: 2, purchaseRate: 350, amount: 700 },
    { invoiceId: invoice4Id, productId: productMap.get('CON001')!, quantity: 100, purchaseRate: 45, amount: 4500 },
  ]

  for (const item of invoiceItems) {
    await prisma.purchaseInvoiceItem.create({
      data: item,
    })
  }

  const supplierPayments = [
    {
      paymentNumber: 'PPAY-20260802-0001',
      supplierId: supplierMap.get('ABC Pharma Pvt Ltd')!,
      invoiceId: invoice1Id,
      amount: 2800,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12345',
      notes: 'Full payment for PINV-20260801-0001',
    },
    {
      paymentNumber: 'PPAY-20260802-0002',
      supplierId: supplierMap.get('XYZ Healthcare')!,
      invoiceId: invoice2Id,
      amount: 2000,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12346',
      notes: 'Partial payment for PINV-20260801-0002',
    },
    {
      paymentNumber: 'PPAY-20260802-0003',
      supplierId: supplierMap.get('MediEquip Solutions')!,
      invoiceId: invoice4Id,
      amount: 5000,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12347',
      notes: 'Partial payment for PINV-20260802-0002',
    },
  ]

  for (const payment of supplierPayments) {
    await prisma.supplierPayment.create({
      data: payment as any,
    })
  }

  const inventoryTransactions = [
    { productId: productMap.get('MED001')!, type: 'PURCHASE', quantity: 100, referenceType: 'PURCHASE_INVOICE', referenceId: invoice1Id, notes: 'Purchased from ABC Pharma' },
    { productId: productMap.get('MED002')!, type: 'PURCHASE', quantity: 50, referenceType: 'PURCHASE_INVOICE', referenceId: invoice1Id, notes: 'Purchased from ABC Pharma' },
    { productId: productMap.get('MED003')!, type: 'PURCHASE', quantity: 70, referenceType: 'PURCHASE_INVOICE', referenceId: invoice1Id, notes: 'Purchased from ABC Pharma' },
    { productId: productMap.get('SUP001')!, type: 'PURCHASE', quantity: 40, referenceType: 'PURCHASE_INVOICE', referenceId: invoice2Id, notes: 'Purchased from XYZ Healthcare' },
    { productId: productMap.get('SUP002')!, type: 'PURCHASE', quantity: 20, referenceType: 'PURCHASE_INVOICE', referenceId: invoice2Id, notes: 'Purchased from XYZ Healthcare' },
    { productId: productMap.get('SUP003')!, type: 'PURCHASE', quantity: 25, referenceType: 'PURCHASE_INVOICE', referenceId: invoice2Id, notes: 'Purchased from XYZ Healthcare' },
    { productId: productMap.get('HERB001')!, type: 'PURCHASE', quantity: 80, referenceType: 'PURCHASE_INVOICE', referenceId: invoice3Id, notes: 'Purchased from Herbal Life India' },
    { productId: productMap.get('HERB002')!, type: 'PURCHASE', quantity: 30, referenceType: 'PURCHASE_INVOICE', referenceId: invoice3Id, notes: 'Purchased from Herbal Life India' },
    { productId: productMap.get('EQP001')!, type: 'PURCHASE', quantity: 3, referenceType: 'PURCHASE_INVOICE', referenceId: invoice4Id, notes: 'Purchased from MediEquip Solutions' },
    { productId: productMap.get('EQP002')!, type: 'PURCHASE', quantity: 2, referenceType: 'PURCHASE_INVOICE', referenceId: invoice4Id, notes: 'Purchased from MediEquip Solutions' },
    { productId: productMap.get('CON001')!, type: 'PURCHASE', quantity: 100, referenceType: 'PURCHASE_INVOICE', referenceId: invoice4Id, notes: 'Purchased from MediEquip Solutions' },
  ]

  for (const tx of inventoryTransactions) {
    await prisma.inventoryTransaction.create({
      data: tx as any,
    })
  }

  console.log('Seed completed with Purchase & Inventory data')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
