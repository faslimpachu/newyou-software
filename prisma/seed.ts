import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const indianFirstNames = [
  'Aarav', 'Priya', 'Rohan', 'Anjali', 'Vikram', 'Meera', 'Arjun', 'Sana', 'Karthik', 'Deepa',
  'Rahul', 'Neha', 'Aditya', 'Pooja', 'Siddharth', 'Riya', 'Manish', 'Kavya', 'Amit', 'Divya',
  'Suresh', 'Lakshmi', 'Rajesh', 'Sunita', 'Manoj', 'Anita', 'Vijay', 'Kavitha', 'Ravi', 'Shweta',
  'Nikhil', 'Aisha', 'Gaurav', 'Nisha', 'Tarun', 'Sneha', 'Pranav', 'Meenakshi', 'Harsh', 'Isha',
  'Varun', 'Bhavna', 'Yash', 'Preeti', 'Rishabh', 'Swati', 'Kunal', 'Ritika', 'Saurabh', 'Aarohi',
  'Dinesh', 'Rekha', 'Sanjay', 'Geeta', 'Pradeep', 'Nandini', 'Ramesh', 'Usha', 'Mukesh', 'Sarita',
  'Ajay', 'Kiran', 'Sunil', 'Radha', 'Dheeraj', 'Madhuri', 'Anand', 'Shalini', 'Naveen', 'Jaya',
  'Rajiv', 'Padmini', 'Arvind', 'Lata', 'Sachin', 'Ritu', 'Vinod', 'Mamta', 'Rajat', 'Aparna',
  'Suman', 'Kalpana', 'Rohit', 'Nivedita', 'Ashish', 'Deepti', 'Girish', 'Shilpa', 'Hemant', 'Vandana',
  'Rakesh', 'Smita', 'Nitin', 'Archana', 'Sandeep', 'Rashmi', 'Pankaj', 'Anupama', 'Abhishek', 'Tanya',
]

const indianLastNames = [
  'Sharma', 'Nair', 'Mehta', 'Menon', 'Kumar', 'Patel', 'Singh', 'Reddy', 'Iyer', 'Rao',
  'Gupta', 'Joshi', 'Verma', 'Das', 'Kapoor', 'Mukherjee', 'Pillai', 'Chowdhury', 'Bhat', 'Shetty',
  'Kulkarni', 'Agarwal', 'Malhotra', 'Thakur', 'Yadav', 'Naik', 'Prabhu', 'Saxena', 'Tripathi', 'Dubey',
  'Pandey', 'Bhattacharya', 'Dutta', 'Ghosh', 'Bose', 'Mishra', 'Vishwakarma', 'Oberoi', 'Chadha', 'Bhasin',
  'Khurana', 'Luthra', 'Malik', 'Saini', 'Rana', 'Chauhan', 'Solanki', 'Parmar', 'Thakkar', 'Desai',
]

const states = [
  'Karnataka', 'Kerala', 'Tamil Nadu', 'Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh',
  'West Bengal', 'Telangana', 'Andhra Pradesh', 'Rajasthan', 'Punjab', 'Haryana', 'Madhya Pradesh',
]

const districts: Record<string, string[]> = {
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangalore', 'Hubli', 'Belgaum', 'Mangaluru', 'Tumkur', 'Davangere'],
  Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam', 'Palakkad', 'Alappuzha'],
  TamilNadu: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'],
  Delhi: ['New Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  UttarPradesh: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Allahabad', 'Meerut', 'Bareilly', 'Ghaziabad'],
  WestBengal: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Darjeeling', 'Malda', 'Murshidabad'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Rangareddy', 'Siddipet'],
  AndhraPradesh: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kadapa'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bharatpur'],
  Punjab: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Firozpur'],
  Haryana: ['Gurgaon', 'Faridabad', 'Chandigarh', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak'],
  MadhyaPradesh: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Rewa'],
}

const doctors = {
  NUTRITION: ['Dr. Anjali Menon', 'Dr. Rahul Varma', 'Dr. Priya Nair', 'Dr. Sandeep Kumar'],
  AYURCARE: ['Dr. Krishnan Namboothiri', 'Dr. Lakshmi Warrier', 'Dr. Arun Pillai', 'Dr. Meera Thampi'],
}

const programs = {
  NUTRITION: ['Weight Management', 'Diabetic Care', 'Sports Nutrition', 'Diet Planning', 'Metabolic Assessment', 'Pediatric Nutrition'],
  AYURCARE: ['Panchakarma', 'Herbal Therapy', 'Detox Program', 'Pulse Diagnosis', 'Rejuvenation Therapy', 'Stress Management'],
}

const followUpPrograms = ['Diet review', 'Lab follow-up', 'Panchakarma session', 'Herbal therapy review', 'Weight check', 'HbA1c follow-up']

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

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
  await prisma.batchReceipt.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.sequence.deleteMany()

  await prisma.document.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.oPSheet.deleteMany()
  await prisma.nutritionAssessment.deleteMany()
  await prisma.ayurcareTreatment.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.patient.deleteMany()

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

  await prisma.patient.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.followUp.deleteMany()

  const statuses = ['Active', 'Follow-up', 'Consulting']
  const genders: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other']
  const consultationTypes: Array<'NUTRITION' | 'AYURCARE'> = ['NUTRITION', 'AYURCARE']
  const visitStatuses = ['Waiting', 'Completed', 'Active']

  const pinCodeMap: Record<string, string> = {
    Karnataka: '560001', Kerala: '682001', TamilNadu: '600001', Maharashtra: '400001', Gujarat: '380001',
    Delhi: '110001', UttarPradesh: '226001', WestBengal: '700001', Telangana: '500001', AndhraPradesh: '530001',
    Rajasthan: '302001', Punjab: '144001', Haryana: '122001', MadhyaPradesh: '462001',
  }

  const usedNames = new Set<string>()
  let nutritionVisitCounter = 0
  let ayurcareVisitCounter = 0

  for (let i = 1; i <= 100; i++) {
    const gender = randomItem(genders)
    let firstName = randomItem(indianFirstNames)
    let lastName = randomItem(indianLastNames)
    let fullName = `${firstName} ${lastName}`

    while (usedNames.has(fullName)) {
      firstName = randomItem(indianFirstNames)
      lastName = randomItem(indianLastNames)
      fullName = `${firstName} ${lastName}`
    }
    usedNames.add(fullName)

    const consultationType = randomItem(consultationTypes)
    const state = randomItem(states)
    const district = randomItem(districts[state] || ['Central'])
    const age = randomInt(5, 78)
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - age)
    const mobile = `9${randomInt(100000000, 999999999)}`
    const parentName = `${randomItem(indianFirstNames)} ${lastName}`
    const bloodGroup = randomItem(bloodGroups)
    const status = randomItem(statuses)

    const patient = await prisma.patient.create({
      data: {
        mr: `MR${String(i).padStart(6, '0')}`,
        consultationType,
        patientName: fullName,
        parentName,
        gender,
        mobileNumber: mobile,
        address: `${randomInt(1, 99)} ${district} Road, ${district}`,
        district,
        state,
        pinCode: pinCodeMap[state] || '110001',
        dob,
        age,
        bloodGroup,
        status,
        emergencyContactName: `${randomItem(indianFirstNames)} ${lastName}`,
        emergencyContactPhone: `9${randomInt(100000000, 999999999)}`,
        emergencyContactRelation: randomItem(['Spouse', 'Parent', 'Child', 'Sibling', 'Guardian']),
        allergies: Math.random() > 0.5 ? randomItem(['None', 'Peanuts', 'Dust', 'Pollen', 'Drug Allergy', 'Shellfish']) : 'None',
        conditions: Math.random() > 0.6 ? randomItem(['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Arthritis', 'PCOS', 'None']) : 'None',
        medications: Math.random() > 0.7 ? randomItem(['Metformin', 'Thyroxine', 'Amlodipine', 'None', 'Insulin']) : 'None',
        smoking: randomItem(['Never', 'Former', 'Occasional', 'Regular']),
        alcohol: randomItem(['Never', 'Occasional', 'Regular', 'Former']),
        exercise: randomItem(['Sedentary', 'Light', 'Moderate', 'Active']),
        diet: randomItem(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']),
      },
    })

    const visitCount = randomInt(1, 3)
    for (let v = 0; v < visitCount; v++) {
      const isNutrition = Math.random() > 0.4
      const centerType = isNutrition ? 'NUTRITION' : 'AYURCARE'
      const center = isNutrition ? 'Nutrition Center' : 'Ayurcare Center'
      const doctor = randomItem(doctors[centerType])
      const program = randomItem(programs[centerType])

      if (isNutrition) {
        nutritionVisitCounter++
      } else {
        ayurcareVisitCounter++
      }

      const visitId = `${isNutrition ? 'NU' : 'AY'}${String(isNutrition ? nutritionVisitCounter : ayurcareVisitCounter).padStart(6, '0')}`
      const appointmentDate = randomDate(new Date('2026-01-01'), new Date('2026-08-18'))
      const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM']
      const visitStatus = v === 0 ? 'Waiting' : randomItem(visitStatuses)

      await prisma.visit.create({
        data: {
          id: visitId,
          patientMr: patient.mr,
          doctor,
          dietitian: isNutrition ? doctor : null,
          appointmentDate,
          appointmentTimeSlot: randomItem(timeSlots),
          status: visitStatus,
          center,
        },
      })
    }

    const followUpCount = randomInt(0, 3)
    for (let f = 0; f < followUpCount; f++) {
      const reviewDate = randomDate(new Date('2026-07-01'), new Date('2026-10-01'))
      const dueDate = new Date(reviewDate)
      dueDate.setDate(dueDate.getDate() + randomInt(7, 30))
      const priority = randomItem(['Low', 'Medium', 'High'])
      const status = randomItem(['Pending', 'Scheduled', 'Completed', 'Overdue'])

      await prisma.followUp.create({
        data: {
          patientMr: patient.mr,
          program: randomItem(followUpPrograms),
          reviewDate,
          dueDate,
          assignedTo: randomItem(doctors.NUTRITION.concat(doctors.AYURCARE)),
          priority,
          status,
          remarks: Math.random() > 0.5 ? 'Patient advised to continue current regimen' : '',
        },
      })
    }
  }

  await prisma.mRSequence.update({
    where: { id: 'GLOBAL' },
    data: { lastNumber: 100 },
  })

  await prisma.visitSequence.update({
    where: { id: 'NUTRITION' },
    data: { lastNumber: nutritionVisitCounter },
  })

  await prisma.visitSequence.update({
    where: { id: 'AYURCARE' },
    data: { lastNumber: ayurcareVisitCounter },
  })

  console.log('Seed completed with 100 patients, visits, and follow-ups')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
