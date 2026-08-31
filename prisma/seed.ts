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

async function buildExtraSupplierPayments(
  supplierMap: Map<string, string>,
  extraInvoices: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>[],
  invoice1: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>,
  invoice2: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>,
  invoice3: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>,
  invoice4: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>,
  invoice5: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>,
) {
  const paymentModes = ['BANK', 'CASH', 'UPI', 'CREDIT'] as const
  const references = ['NEFT', 'IMPS', 'RTGS', 'CHQ', 'CASH', 'UPI']
  const notes = [
    'Advance against upcoming delivery',
    'Settlement for this month',
    'Balance clearance',
    'Routine payment',
    'Top-up payment',
    'Discount adjusted payment',
    'Quality deduction waived',
    'Freight included payment',
    'Tax paid at source adjusted',
    'Part settlement for pending dues',
  ]

  const allInvoices = [invoice1, invoice2, invoice3, invoice4, invoice5, ...extraInvoices]
  const payments: Array<{
    paymentNumber: string
    supplierId: string
    invoiceId: string
    amount: number
    paymentDate: Date
    paymentMode: string
    reference: string | null
    notes: string | null
  }> = []

  for (let i = 0; i < 22; i++) {
    const invoice = allInvoices[i % allInvoices.length]
    const supplierId = invoice.supplierId
    const mode = paymentModes[i % paymentModes.length]
    const baseAmount = Math.round(Number(invoice.balance) / 3) || 500
    const amount = baseAmount + randomInt(100, 2000)
    const paymentDate = new Date(invoice.invoiceDate)
    paymentDate.setDate(paymentDate.getDate() + randomInt(1, 20))

    payments.push({
      paymentNumber: `PPAY-2026080${i + 3}-${String(i + 1).padStart(4, '0')}`,
      supplierId,
      invoiceId: invoice.id,
      amount: Math.min(amount, Number(invoice.balance) || amount),
      paymentDate,
      paymentMode: mode,
      reference: `${references[i % references.length]}-${randomInt(10000, 99999)}`,
      notes: notes[i % notes.length],
    })
  }

  return payments
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

  await prisma.productSequence.upsert({
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
  ]

  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { id: seq.id },
      update: {},
      create: { id: seq.id, name: seq.name, lastNumber: 0 },
    })
  }

  // ------------------------------------------------------------------
  // 1. Clean PMS tables only (preserve clinical seed behavior)
  // ------------------------------------------------------------------
  await (prisma as any).pharmacySale.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.batchReceipt.deleteMany()
  await prisma.purchaseInvoiceItem.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.purchaseInvoice.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.productSequence.deleteMany()
  await prisma.sequence.deleteMany()

  await prisma.document.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.oPSheet.deleteMany()
  await prisma.nutritionAssessment.deleteMany()
  await prisma.ayurcareTreatment.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.patient.deleteMany()

  // ------------------------------------------------------------------
  // 2. Categories
  // ------------------------------------------------------------------
  const categories = [
    { name: 'Medicines', description: 'Allopathic and Ayurvedic medicines' },
    { name: 'Supplements', description: 'Vitamins, minerals, and health supplements' },
    { name: 'Herbal Products', description: 'Herbal powders, oils, and formulations' },
    { name: 'Equipment', description: 'Medical and clinic equipment' },
    { name: 'Consumables', description: 'Disposable items and consumables' },
    { name: 'Other', description: 'Miscellaneous items' },
  ]

  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    const created = await prisma.productCategory.create({
      data: cat,
    })
    categoryMap.set(cat.name, created.id)
  }

  // ------------------------------------------------------------------
  // 3. Suppliers
  // ------------------------------------------------------------------
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
    {
      supplierName: 'MediCore Traders',
      contactPerson: 'Deepak Reddy',
      phone: '9321654789',
      email: 'deepak@medicore.in',
      address: '12 Health Plaza, Hyderabad',
      gstNumber: 'GSTIN1234509876',
      openingBalance: 12000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'PureHerb Suppliers',
      contactPerson: 'Kavya Nair',
      phone: '8763495210',
      email: 'kavya@pureherb.com',
      address: '34 Green Valley, Kochi',
      gstNumber: 'GSTIN6543210987',
      openingBalance: 3000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'LifeLine Distributors',
      contactPerson: 'Arjun Mehta',
      phone: '9658741230',
      email: 'arjun@lifeline.co.in',
      address: '78 Market Road, Pune',
      gstNumber: 'GSTIN7890123456',
      openingBalance: 18000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'CardioMed Devices',
      contactPerson: 'Neha Joshi',
      phone: '9123456780',
      email: 'neha@cardiomed.com',
      address: '90 Tech Park, Gurgaon',
      gstNumber: 'GSTIN3456789012',
      openingBalance: 0,
      status: 'ACTIVE',
    },
    {
      supplierName: 'GreenLeaf Herbals',
      contactPerson: 'Ravi Iyer',
      phone: '9988776655',
      email: 'ravi@greenleaf.in',
      address: '56 Ayurveda Street, Chennai',
      gstNumber: 'GSTIN5678901234',
      openingBalance: 7000,
      status: 'INACTIVE',
    },
    {
      supplierName: 'Swift Medical Supplies',
      contactPerson: 'Pooja Rao',
      phone: '9012345678',
      email: 'pooja@swiftmed.com',
      address: '23 Commercial Complex, Mumbai',
      gstNumber: 'GSTIN9012345678',
      openingBalance: 22000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'VitaSource Nutrition',
      contactPerson: 'Anand Kumar',
      phone: '9345678901',
      email: 'anand@vitasource.in',
      address: '45 Wellness Avenue, Bangalore',
      gstNumber: 'GSTIN2345678901',
      openingBalance: 0,
      status: 'ACTIVE',
    },
    {
      supplierName: 'AyurBest Remedies',
      contactPerson: 'Lakshmi Pillai',
      phone: '9876123450',
      email: 'lakshmi@ayurbest.com',
      address: '67 Herb Lane, Kerala',
      gstNumber: 'GSTIN8765432109',
      openingBalance: 9500,
      status: 'ACTIVE',
    },
    {
      supplierName: 'EquipMed India',
      contactPerson: 'Sachin Verma',
      phone: '9123987456',
      email: 'sachin@equipmed.in',
      address: '89 Industrial Zone, Ahmedabad',
      gstNumber: 'GSTIN3456127890',
      openingBalance: 15000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'NutriLife Sciences',
      contactPerson: 'Ritu Sharma',
      phone: '9789456123',
      email: 'ritu@nutrilife.com',
      address: '12 Pharma Hub, Chandigarh',
      gstNumber: 'GSTIN6549873210',
      openingBalance: 0,
      status: 'INACTIVE',
    },
    {
      supplierName: 'Zeenat Medical',
      contactPerson: 'Imran Khan',
      phone: '9356712845',
      email: 'imran@zeenatmed.in',
      address: '34 Clinic Road, Lucknow',
      gstNumber: 'GSTIN9876541230',
      openingBalance: 6000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'Sunrise Pharma',
      contactPerson: 'Anita Desai',
      phone: '9641237890',
      email: 'anita@sunrisepharma.com',
      address: '56 Sunrise Industrial Estate, Surat',
      gstNumber: 'GSTIN1472583690',
      openingBalance: 11000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'Bharat Ayurvedics',
      contactPerson: 'Manoj Thakur',
      phone: '9412345678',
      email: 'manoj@bharatayurvedics.in',
      address: '78 Traditional Medicine Lane, Jaipur',
      gstNumber: 'GSTIN2583691470',
      openingBalance: 4000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'MediQuick Logistics',
      contactPerson: 'Swati Gupta',
      phone: '9234567812',
      email: 'swati@mediquick.com',
      address: '90 Logistics Park, Delhi',
      gstNumber: 'GSTIN3691472580',
      openingBalance: 0,
      status: 'INACTIVE',
    },
    {
      supplierName: 'Prime Health Distributors',
      contactPerson: 'Kunal Malhotra',
      phone: '9765432109',
      email: 'kunal@primehealth.in',
      address: '12 Prime Tower, Kolkata',
      gstNumber: 'GSTIN7418529630',
      openingBalance: 13000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'Arogya Pharmaceuticals',
      contactPerson: 'Divya Reddy',
      phone: '9890123456',
      email: 'divya@arogya.co.in',
      address: '34 Health Corridor, Bangalore',
      gstNumber: 'GSTIN8529637410',
      openingBalance: 8500,
      status: 'ACTIVE',
    },
    {
      supplierName: 'HerboCure India',
      contactPerson: 'Tarun Nambiar',
      phone: '9123456089',
      email: 'tarun@herbocure.com',
      address: '56 Herbal Tech Park, Coimbatore',
      gstNumber: 'GSTIN9637418520',
      openingBalance: 0,
      status: 'ACTIVE',
    },
    {
      supplierName: 'SafeCare Instruments',
      contactPerson: 'Meenakshi Iyer',
      phone: '9345678120',
      email: 'meena@safecare.in',
      address: '78 Precision Avenue, Chennai',
      gstNumber: 'GSTIN1597538462',
      openingBalance: 20000,
      status: 'ACTIVE',
    },
    {
      supplierName: 'WellMark Nutrition',
      contactPerson: 'Harsh Vardhan',
      phone: '9876541230',
      email: 'harsh@wellmark.com',
      address: '90 Nutrition Street, Delhi',
      gstNumber: 'GSTIN3571598462',
      openingBalance: 5000,
      status: 'INACTIVE',
    },
    {
      supplierName: 'Om Sai Medical',
      contactPerson: 'Rajeshwari Devi',
      phone: '9123456798',
      email: 'rajeshwari@omsaimedical.in',
      address: '23 Temple Road, Hyderabad',
      gstNumber: 'GSTIN2641975830',
      openingBalance: 7500,
      status: 'ACTIVE',
    },
  ]

  const supplierMap = new Map<string, string>()
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({
      data: supplier as any,
    })
    supplierMap.set(supplier.supplierName, created.id)
  }

  // ------------------------------------------------------------------
  // 4. Products
  // ------------------------------------------------------------------
  const products = [
    { name: 'Paracetamol 500mg', sku: 'MED001', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 8, sellingPrice: 15, gstPercent: 5, minimumStock: 50, maximumStock: 200, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Amoxicillin 250mg', sku: 'MED002', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 25, sellingPrice: 45, gstPercent: 5, minimumStock: 30, maximumStock: 150, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Vitamin D3 60K', sku: 'SUP001', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 80, sellingPrice: 150, gstPercent: 5, minimumStock: 20, maximumStock: 100, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Omega-3 Fish Oil', sku: 'SUP002', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 120, sellingPrice: 220, gstPercent: 5, minimumStock: 15, maximumStock: 80, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Triphala Powder', sku: 'HERB001', categoryId: categoryMap.get('Herbal Products')!, unit: 'packet', purchasePrice: 45, sellingPrice: 90, gstPercent: 5, minimumStock: 20, maximumStock: 100, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Ashwagandha Capsules', sku: 'HERB002', categoryId: categoryMap.get('Herbal Products')!, unit: 'bottle', purchasePrice: 150, sellingPrice: 280, gstPercent: 5, minimumStock: 10, maximumStock: 60, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Digital BP Monitor', sku: 'EQP001', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 1200, sellingPrice: 2000, gstPercent: 12, minimumStock: 5, maximumStock: 20, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Stethoscope', sku: 'EQP002', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 350, sellingPrice: 600, gstPercent: 12, minimumStock: 5, maximumStock: 20, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Syringes 10ml', sku: 'CON001', categoryId: categoryMap.get('Consumables')!, unit: 'box', purchasePrice: 45, sellingPrice: 80, gstPercent: 5, minimumStock: 30, maximumStock: 150, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Gauze Pieces', sku: 'CON002', categoryId: categoryMap.get('Consumables')!, unit: 'packet', purchasePrice: 15, sellingPrice: 28, gstPercent: 5, minimumStock: 50, maximumStock: 300, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Protein Powder', sku: 'SUP003', categoryId: categoryMap.get('Supplements')!, unit: 'packet', purchasePrice: 250, sellingPrice: 450, gstPercent: 5, minimumStock: 15, maximumStock: 80, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Cetrizine 10mg', sku: 'MED003', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 12, sellingPrice: 22, gstPercent: 5, minimumStock: 40, maximumStock: 200, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Ibuprofen 400mg', sku: 'MED004', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 18, sellingPrice: 35, gstPercent: 5, minimumStock: 40, maximumStock: 180, currentStock: 120, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Azithromycin 500mg', sku: 'MED005', categoryId: categoryMap.get('Medicines')!, unit: 'strip', purchasePrice: 35, sellingPrice: 65, gstPercent: 5, minimumStock: 25, maximumStock: 120, currentStock: 5, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Calcium with Vitamin D', sku: 'SUP004', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 110, sellingPrice: 199, gstPercent: 5, minimumStock: 18, maximumStock: 90, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Zinc Supplements', sku: 'SUP005', categoryId: categoryMap.get('Supplements')!, unit: 'bottle', purchasePrice: 90, sellingPrice: 170, gstPercent: 5, minimumStock: 18, maximumStock: 90, currentStock: 300, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Chyawanprash', sku: 'HERB003', categoryId: categoryMap.get('Herbal Products')!, unit: 'jar', purchasePrice: 180, sellingPrice: 320, gstPercent: 5, minimumStock: 12, maximumStock: 70, currentStock: 45, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Giloy Tablets', sku: 'HERB004', categoryId: categoryMap.get('Herbal Products')!, unit: 'bottle', purchasePrice: 95, sellingPrice: 180, gstPercent: 5, minimumStock: 15, maximumStock: 80, currentStock: 8, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Glucometer', sku: 'EQP003', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 350, sellingPrice: 599, gstPercent: 12, minimumStock: 4, maximumStock: 15, currentStock: 15, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Thermometer', sku: 'EQP004', categoryId: categoryMap.get('Equipment')!, unit: 'pcs', purchasePrice: 120, sellingPrice: 220, gstPercent: 12, minimumStock: 10, maximumStock: 40, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop' },
    { name: 'Bandages Roll', sku: 'CON003', categoryId: categoryMap.get('Consumables')!, unit: 'roll', purchasePrice: 25, sellingPrice: 45, gstPercent: 5, minimumStock: 40, maximumStock: 200, currentStock: 200, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Antiseptic Cream', sku: 'CON004', categoryId: categoryMap.get('Consumables')!, unit: 'tube', purchasePrice: 40, sellingPrice: 75, gstPercent: 5, minimumStock: 25, maximumStock: 120, currentStock: 3, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
    { name: 'Face Mask', sku: 'CON005', categoryId: categoryMap.get('Consumables')!, unit: 'box', purchasePrice: 60, sellingPrice: 120, gstPercent: 5, minimumStock: 30, maximumStock: 150, currentStock: 500, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop' },
    { name: 'Weight Loss Tea', sku: 'OTH001', categoryId: categoryMap.get('Other')!, unit: 'packet', purchasePrice: 130, sellingPrice: 249, gstPercent: 5, minimumStock: 10, maximumStock: 60, currentStock: 25, imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&h=200&fit=crop' },
    { name: 'Health Records Folder', sku: 'OTH002', categoryId: categoryMap.get('Other')!, unit: 'pcs', purchasePrice: 35, sellingPrice: 65, gstPercent: 5, minimumStock: 20, maximumStock: 100, currentStock: 0, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop' },
  ]

  const productMap = new Map<string, string>()
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        ...product,
        code: `PRD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(productMap.size + 1).padStart(4, '0')}`,
      },
    })
    productMap.set(product.sku, created.id)
  }

  // ------------------------------------------------------------------
  // 5. Helpers
  // ------------------------------------------------------------------
  const today = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  function dateStr(daysFromNow: number): string {
    const d = new Date(today.getTime() + daysFromNow * dayMs)
    return d.toISOString().split('T')[0]
  }

  // ------------------------------------------------------------------
  // 6. Purchase Invoices with batch-level items
  //    This section exercises:
  //    - receiveStock() business rules via direct model creation
  //    - Same batch + same expiry reused across suppliers
  //    - Expired and expiring-soon batches
  //    - OVERDUE invoice example
  // ------------------------------------------------------------------

  // Invoice 1: PAID medicine + supplement purchases
  const invoice1 = await prisma.purchaseInvoice.create({
    data: {
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
  })

  // Invoice 2: PARTIAL, due date in the past -> OVERDUE after partial payment
  const invoice2 = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: 'PINV-20260801-0002',
      invoiceDate: new Date('2026-08-01'),
      supplierId: supplierMap.get('XYZ Healthcare')!,
      paymentMode: 'CREDIT',
      dueDate: new Date('2026-08-10'),
      notes: 'Supplements batch',
      subtotal: 4500,
      tax: 540,
      grandTotal: 5040,
      paid: 2000,
      balance: 3040,
      status: 'OVERDUE',
    },
  })

  // Invoice 3: PENDING herbal products
  const invoice3 = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: 'PINV-20260802-0001',
      invoiceDate: new Date('2026-08-02'),
      supplierId: supplierMap.get('Herbal Life India')!,
      paymentMode: 'CASH',
      dueDate: new Date('2026-08-20'),
      notes: 'Herbal products',
      subtotal: 1800,
      tax: 216,
      grandTotal: 2016,
      paid: 0,
      balance: 2016,
      status: 'PENDING',
    },
  })

  // Invoice 4: PARTIAL equipment
  const invoice4 = await prisma.purchaseInvoice.create({
    data: {
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
  })

  // ------------------------------------------------------------------
  // 7. Invoice items -> ProductBatch + BatchReceipt + InventoryTransaction
  // ------------------------------------------------------------------
  const invoiceItems = [
    // Invoice 1 items
    { invoiceId: invoice1.id, productId: productMap.get('MED001')!, quantity: 100, purchaseRate: 8, amount: 800, batchNumber: 'PCM-001', expiryDate: dateStr(60) },
    { invoiceId: invoice1.id, productId: productMap.get('MED002')!, quantity: 50, purchaseRate: 25, amount: 1250, batchNumber: 'AMX-001', expiryDate: dateStr(90) },
    { invoiceId: invoice1.id, productId: productMap.get('MED003')!, quantity: 70, purchaseRate: 12, amount: 840, batchNumber: 'CTZ-001', expiryDate: dateStr(120) },
    // Invoice 2 items
    { invoiceId: invoice2.id, productId: productMap.get('SUP001')!, quantity: 40, purchaseRate: 80, amount: 3200, batchNumber: 'VITD-001', expiryDate: dateStr(180) },
    { invoiceId: invoice2.id, productId: productMap.get('SUP002')!, quantity: 20, purchaseRate: 120, amount: 2400, batchNumber: 'OMG-001', expiryDate: dateStr(150) },
    { invoiceId: invoice2.id, productId: productMap.get('SUP003')!, quantity: 25, purchaseRate: 250, amount: 6250, batchNumber: 'PRO-001', expiryDate: dateStr(100) },
    // Invoice 3 items
    { invoiceId: invoice3.id, productId: productMap.get('HERB001')!, quantity: 80, purchaseRate: 45, amount: 3600, batchNumber: 'TRI-001', expiryDate: dateStr(200) },
    { invoiceId: invoice3.id, productId: productMap.get('HERB002')!, quantity: 30, purchaseRate: 150, amount: 4500, batchNumber: 'ASH-001', expiryDate: dateStr(250) },
    // Invoice 4 items
    { invoiceId: invoice4.id, productId: productMap.get('EQP001')!, quantity: 3, purchaseRate: 1200, amount: 3600, batchNumber: 'BPM-001', expiryDate: null },
    { invoiceId: invoice4.id, productId: productMap.get('EQP002')!, quantity: 2, purchaseRate: 350, amount: 700, batchNumber: 'STH-001', expiryDate: null },
    { invoiceId: invoice4.id, productId: productMap.get('CON001')!, quantity: 100, purchaseRate: 45, amount: 4500, batchNumber: 'SYR-001', expiryDate: dateStr(365) },
  ]

  const batchMap = new Map<string, string>()
  const receiptMap = new Map<string, string>()

  for (const item of invoiceItems) {
    await prisma.purchaseInvoiceItem.create({
      data: {
        invoiceId: item.invoiceId,
        productId: item.productId,
        quantity: item.quantity,
        purchaseRate: item.purchaseRate,
        amount: item.amount,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      },
    })

    const batchKey = `${item.productId}::${item.batchNumber}`
    let batchId = batchMap.get(batchKey)

    if (!batchId) {
      const batch = await prisma.productBatch.create({
        data: {
          productId: item.productId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          quantity: item.quantity,
        },
      })
      batchId = batch.id
      batchMap.set(batchKey, batch.id)
    } else {
      await prisma.productBatch.update({
        where: { id: batchId },
        data: { quantity: { increment: item.quantity } },
      })
    }

    const receipt = await prisma.batchReceipt.create({
      data: {
        batchId: batchId!,
        supplierId: (item.invoiceId === invoice1.id || item.invoiceId === invoice3.id)
          ? supplierMap.get('ABC Pharma Pvt Ltd')!
          : item.invoiceId === invoice2.id
            ? supplierMap.get('XYZ Healthcare')!
            : item.invoiceId === invoice4.id
              ? supplierMap.get('MediEquip Solutions')!
              : supplierMap.get('ABC Pharma Pvt Ltd')!,
        purchaseInvoiceId: item.invoiceId,
        sourceType: 'PURCHASE',
        quantity: item.quantity,
        remainingQuantity: item.quantity,
        purchaseRate: item.purchaseRate,
      },
    })
    receiptMap.set(`${batchId}::${receipt.id}`, receipt.id)

    await prisma.inventoryTransaction.create({
      data: {
        productId: item.productId,
        batchId: batchId!,
        type: 'PURCHASE',
        quantity: item.quantity,
        referenceType: 'PURCHASE_INVOICE',
        referenceId: item.invoiceId,
        notes: `Purchased from invoice ${item.invoiceId}`,
      },
    })

    await prisma.product.update({
      where: { id: item.productId },
      data: { currentStock: { increment: item.quantity } },
    })
  }

  // ------------------------------------------------------------------
  // 8. Same batch, same expiry, different supplier scenario
  //    Product MED001, batch PCM-001, expiry +60 days:
  //    - First purchased from ABC Pharma (invoice1)
  //    - Then purchased from XYZ Healthcare (new invoice5)
  // ------------------------------------------------------------------
  const invoice5 = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: 'PINV-20260803-0001',
      invoiceDate: new Date('2026-08-03'),
      supplierId: supplierMap.get('XYZ Healthcare')!,
      paymentMode: 'CREDIT',
      dueDate: new Date('2026-09-01'),
      notes: 'Repeat batch from different supplier',
      subtotal: 400,
      tax: 48,
      grandTotal: 448,
      paid: 0,
      balance: 448,
      status: 'PENDING',
    },
  })

  const invoice5Item = {
    invoiceId: invoice5.id,
    productId: productMap.get('MED001')!,
    quantity: 50,
    purchaseRate: 9,
    amount: 450,
    batchNumber: 'PCM-001',
    expiryDate: dateStr(60),
  }

  await prisma.purchaseInvoiceItem.create({
    data: {
      invoiceId: invoice5Item.invoiceId,
      productId: invoice5Item.productId,
      quantity: invoice5Item.quantity,
      purchaseRate: invoice5Item.purchaseRate,
      amount: invoice5Item.amount,
      batchNumber: invoice5Item.batchNumber,
      expiryDate: new Date(invoice5Item.expiryDate!),
    },
  })

  const batchKey5 = `${invoice5Item.productId}::${invoice5Item.batchNumber}`
  const existingBatchId = batchMap.get(batchKey5)!

  await prisma.productBatch.update({
    where: { id: existingBatchId },
    data: { quantity: { increment: invoice5Item.quantity } },
  })

  await prisma.batchReceipt.create({
    data: {
      batchId: existingBatchId,
      supplierId: supplierMap.get('XYZ Healthcare')!,
      purchaseInvoiceId: invoice5.id,
      sourceType: 'PURCHASE',
      quantity: invoice5Item.quantity,
      remainingQuantity: invoice5Item.quantity,
      purchaseRate: invoice5Item.purchaseRate,
    },
  })

  await prisma.inventoryTransaction.create({
    data: {
      productId: invoice5Item.productId,
      batchId: existingBatchId,
      type: 'PURCHASE',
      quantity: invoice5Item.quantity,
      referenceType: 'PURCHASE_INVOICE',
      referenceId: invoice5.id,
      notes: `Repeat batch PCM-001 from XYZ Healthcare`,
    },
  })

  await prisma.product.update({
    where: { id: invoice5Item.productId },
    data: { currentStock: { increment: invoice5Item.quantity } },
  })

  // ------------------------------------------------------------------
  // 8a. Additional 20 purchase invoices for pagination coverage
  // ------------------------------------------------------------------
  const extraInvoiceCount = 20
  const extraInvoices: Awaited<ReturnType<typeof prisma.purchaseInvoice.create>>[] = []
  const extraInvoiceItems: Array<{
    invoiceId: string
    productId: string
    quantity: number
    purchaseRate: number
    amount: number
    batchNumber: string
    expiryDate: string
  }> = []

  const invoiceStatuses = ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE'] as string[]
  const paymentModes = ['BANK', 'CASH', 'CREDIT'] as string[]
  const supplierNames = Array.from(supplierMap.keys())
  const productSkuList = Array.from(productMap.keys())

  for (let i = 0; i < extraInvoiceCount; i++) {
    const invoiceDate = new Date('2026-08-04')
    invoiceDate.setDate(invoiceDate.getDate() + i)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + randomInt(15, 45))
    const status = randomItem(invoiceStatuses) as typeof invoiceStatuses[number]
    const paymentMode = randomItem(paymentModes) as typeof paymentModes[number]
    const supplierName = randomItem(supplierNames)
    const subtotal = randomInt(500, 8000)
    const tax = Math.round(subtotal * 0.05)
    const grandTotal = subtotal + tax
    const paid = status === 'PAID' ? grandTotal : status === 'PARTIAL' ? randomInt(0, grandTotal) : 0
    const balance = grandTotal - paid

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: `PINV-20260804-${String(i + 1).padStart(4, '0')}`,
        invoiceDate,
        supplierId: supplierMap.get(supplierName)!,
        paymentMode: paymentMode as any,
        dueDate,
        notes: `Seed invoice ${i + 6}`,
        subtotal,
        tax,
        grandTotal,
        paid,
        balance,
        status: status as any,
      },
    })

    extraInvoices.push(invoice)

    const itemCount = randomInt(1, 4)
    const usedProductSkus = new Set<string>()
    for (let j = 0; j < itemCount; j++) {
      let sku = randomItem(productSkuList)
      while (usedProductSkus.has(sku)) {
        sku = randomItem(productSkuList)
      }
      usedProductSkus.add(sku)

      const productId = productMap.get(sku)!
      const quantity = randomInt(10, 200)
      const purchaseRate = randomInt(10, 500)
      const amount = quantity * purchaseRate
      const batchNumber = `SEED-${String(i + 6).padStart(3, '0')}-${String(j + 1).padStart(2, '0')}`
      const expiryDate = dateStr(randomInt(30, 365))

      extraInvoiceItems.push({
        invoiceId: invoice.id,
        productId,
        quantity,
        purchaseRate,
        amount,
        batchNumber,
        expiryDate,
      })
    }
  }

  for (const item of extraInvoiceItems) {
    await prisma.purchaseInvoiceItem.create({
      data: {
        invoiceId: item.invoiceId,
        productId: item.productId,
        quantity: item.quantity,
        purchaseRate: item.purchaseRate,
        amount: item.amount,
        batchNumber: item.batchNumber,
        expiryDate: new Date(item.expiryDate),
      },
    })

    const batchKey = `${item.productId}::${item.batchNumber}`
    let batchId = batchMap.get(batchKey)

    if (!batchId) {
      const batch = await prisma.productBatch.create({
        data: {
          productId: item.productId,
          batchNumber: item.batchNumber,
          expiryDate: new Date(item.expiryDate),
          quantity: item.quantity,
        },
      })
      batchId = batch.id
      batchMap.set(batchKey, batch.id)
    } else {
      await prisma.productBatch.update({
        where: { id: batchId },
        data: { quantity: { increment: item.quantity } },
      })
    }

    const invoice = extraInvoices.find((inv) => inv.id === item.invoiceId)!
    await prisma.batchReceipt.create({
      data: {
        batchId: batchId!,
        supplierId: invoice.supplierId,
        purchaseInvoiceId: item.invoiceId,
        sourceType: 'PURCHASE',
        quantity: item.quantity,
        remainingQuantity: item.quantity,
        purchaseRate: item.purchaseRate,
      },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: item.productId,
        batchId: batchId!,
        type: 'PURCHASE',
        quantity: item.quantity,
        referenceType: 'PURCHASE_INVOICE',
        referenceId: item.invoiceId,
        notes: `Purchased from seed invoice ${item.invoiceId}`,
      },
    })

    await prisma.product.update({
      where: { id: item.productId },
      data: { currentStock: { increment: item.quantity } },
    })
  }

  // ------------------------------------------------------------------
  // 9. Create expired batch and expiring-soon batch explicitly
  // ------------------------------------------------------------------
  const expiredBatch = await prisma.productBatch.create({
    data: {
      productId: productMap.get('MED001')!,
      batchNumber: 'PCM-EXPIRED',
      expiryDate: new Date('2026-07-01'),
      quantity: 40,
    },
  })

  await prisma.batchReceipt.create({
    data: {
      batchId: expiredBatch.id,
      supplierId: supplierMap.get('ABC Pharma Pvt Ltd')!,
      purchaseInvoiceId: invoice1.id,
      sourceType: 'PURCHASE',
      quantity: 40,
      remainingQuantity: 40,
      purchaseRate: 8,
    },
  })

  await prisma.inventoryTransaction.create({
    data: {
      productId: productMap.get('MED001')!,
      batchId: expiredBatch.id,
      type: 'PURCHASE',
      quantity: 40,
      referenceType: 'PURCHASE_INVOICE',
      referenceId: invoice1.id,
      notes: 'Expired batch',
    },
  })

  await prisma.product.update({
    where: { id: productMap.get('MED001')! },
    data: { currentStock: { increment: 40 } },
  })

  const expiringBatch = await prisma.productBatch.create({
    data: {
      productId: productMap.get('MED002')!,
      batchNumber: 'AMX-SOON',
      expiryDate: new Date(dateStr(15)),
      quantity: 25,
    },
  })

  await prisma.batchReceipt.create({
    data: {
      batchId: expiringBatch.id,
      supplierId: supplierMap.get('XYZ Healthcare')!,
      purchaseInvoiceId: invoice2.id,
      sourceType: 'PURCHASE',
      quantity: 25,
      remainingQuantity: 25,
      purchaseRate: 26,
    },
  })

  await prisma.inventoryTransaction.create({
    data: {
      productId: productMap.get('MED002')!,
      batchId: expiringBatch.id,
      type: 'PURCHASE',
      quantity: 25,
      referenceType: 'PURCHASE_INVOICE',
      referenceId: invoice2.id,
      notes: 'Expiring soon batch',
    },
  })

  await prisma.product.update({
    where: { id: productMap.get('MED002')! },
    data: { currentStock: { increment: 25 } },
  })

  // ------------------------------------------------------------------
  // 10. Supplier Payments
  // ------------------------------------------------------------------
  const supplierPayments = [
    {
      paymentNumber: 'PPAY-20260802-0001',
      supplierId: supplierMap.get('ABC Pharma Pvt Ltd')!,
      invoiceId: invoice1.id,
      amount: 2800,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12345',
      notes: 'Full payment for PINV-20260801-0001',
    },
    {
      paymentNumber: 'PPAY-20260802-0002',
      supplierId: supplierMap.get('XYZ Healthcare')!,
      invoiceId: invoice2.id,
      amount: 2000,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12346',
      notes: 'Partial payment for PINV-20260801-0002',
    },
    {
      paymentNumber: 'PPAY-20260802-0003',
      supplierId: supplierMap.get('MediEquip Solutions')!,
      invoiceId: invoice4.id,
      amount: 5000,
      paymentDate: new Date('2026-08-02'),
      paymentMode: 'BANK',
      reference: 'NEFT-12347',
      notes: 'Partial payment for PINV-20260802-0002',
    },
    ...(await buildExtraSupplierPayments(supplierMap, extraInvoices, invoice1, invoice2, invoice3, invoice4, invoice5)),
  ]

  for (const payment of supplierPayments) {
    await prisma.supplierPayment.create({
      data: payment as any,
    })
  }

  // ------------------------------------------------------------------
  // 11. Inventory Adjustments
  // ------------------------------------------------------------------
  // Find first batch for MED001 for adjustment
  const med001Batches = await prisma.productBatch.findMany({
    where: { productId: productMap.get('MED001')! },
    orderBy: { createdAt: 'asc' },
  })

  if (med001Batches.length > 0) {
    const targetBatch = med001Batches[0]
    const receipts = await prisma.batchReceipt.findMany({
      where: { batchId: targetBatch.id },
      orderBy: { createdAt: 'asc' },
    })

    if (receipts.length > 0) {
      const receipt = receipts[0]
      await prisma.batchReceipt.update({
        where: { id: receipt.id },
        data: { remainingQuantity: { decrement: 10 } },
      })
    }

    await prisma.productBatch.update({
      where: { id: targetBatch.id },
      data: { quantity: { decrement: 10 } },
    })

    await prisma.product.update({
      where: { id: productMap.get('MED001')! },
      data: { currentStock: { decrement: 10 } },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: productMap.get('MED001')!,
        batchId: targetBatch.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 10,
        referenceType: 'ADJUSTMENT',
        notes: 'Physical count correction',
      },
    })
  }

  // ------------------------------------------------------------------
  // 12. Additional inventory transactions for dashboard coverage
  // ------------------------------------------------------------------
  // SALE transaction example (manual, if feature flag allows)
  const med002Batches = await prisma.productBatch.findMany({
    where: { productId: productMap.get('MED002')! },
    orderBy: { createdAt: 'asc' },
  })

  if (med002Batches.length > 0) {
    const saleBatch = med002Batches[0]
    const saleReceipts = await prisma.batchReceipt.findMany({
      where: { batchId: saleBatch.id },
      orderBy: { createdAt: 'asc' },
    })

    if (saleReceipts.length > 0) {
      const saleReceipt = saleReceipts[0]
      await prisma.batchReceipt.update({
        where: { id: saleReceipt.id },
        data: { remainingQuantity: { decrement: 5 } },
      })
    }

    await prisma.productBatch.update({
      where: { id: saleBatch.id },
      data: { quantity: { decrement: 5 } },
    })

    await prisma.product.update({
      where: { id: productMap.get('MED002')! },
      data: { currentStock: { decrement: 5 } },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: productMap.get('MED002')!,
        batchId: saleBatch.id,
        type: 'SALE',
        quantity: 5,
        referenceType: 'ADJUSTMENT',
        notes: 'Sample sale transaction',
      },
    })
  }

  // ------------------------------------------------------------------
  // 12a. Dummy inventory adjustments for pagination testing
  // ------------------------------------------------------------------
  const adjustmentNotes = [
    'Physical count correction',
    'Stock found during audit',
    'Damaged items removed',
    'Expired stock write-off',
    'Return to supplier',
    'Lost inventory adjustment',
    'Found additional stock',
    'System correction',
    'Transfer from another store',
    'Quality check adjustment',
  ]

  const adjustmentTypes = [
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'ADJUSTMENT_IN',
    'EXPIRED',
    'ADJUSTMENT_IN',
    'DAMAGED',
    'ADJUSTMENT_IN',
    'SALE',
    'ADJUSTMENT_IN',
    'LOST',
    'ADJUSTMENT_IN',
    'RETURN_OUT',
    'ADJUSTMENT_IN',
  ]

  const allProductIds = Array.from(productMap.values())
  const allBatchEntries = Array.from(batchMap.entries())

  for (let i = 0; i < 45; i++) {
    const productId = allProductIds[i % allProductIds.length]
    const [, batchId] = allBatchEntries[i % allBatchEntries.length]
    const type = adjustmentTypes[i % adjustmentTypes.length]
    const quantity = randomInt(1, 20)
    const notes = adjustmentNotes[i % adjustmentNotes.length]
    const unitCost = randomInt(5, 500)
    const supplierId = Array.from(supplierMap.values())[i % Array.from(supplierMap.values()).length]

    if (['ADJUSTMENT_IN'].includes(type)) {
      await prisma.batchReceipt.create({
        data: {
          batchId,
          supplierId,
          purchaseInvoiceId: null,
          sourceType: 'ADJUSTMENT',
          quantity,
          remainingQuantity: quantity,
          purchaseRate: unitCost,
        },
      })

      await prisma.productBatch.update({
        where: { id: batchId },
        data: { quantity: { increment: quantity } },
      })

      await prisma.product.update({
        where: { id: productId },
        data: { currentStock: { increment: quantity } },
      })
    } else if (['ADJUSTMENT_OUT', 'EXPIRED', 'DAMAGED', 'LOST', 'SALE', 'RETURN_OUT'].includes(type)) {
      const receipts = await prisma.batchReceipt.findMany({
        where: { batchId, remainingQuantity: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      })

      let remainingToConsume = quantity
      for (const receipt of receipts) {
        if (remainingToConsume <= 0) break
        const consume = Math.min(remainingToConsume, Number(receipt.remainingQuantity))
        await prisma.batchReceipt.update({
          where: { id: receipt.id },
          data: { remainingQuantity: { decrement: consume } },
        })
        remainingToConsume -= consume
      }

      await prisma.productBatch.update({
        where: { id: batchId },
        data: { quantity: { decrement: quantity } },
      })

      await prisma.product.update({
        where: { id: productId },
        data: { currentStock: { decrement: quantity } },
      })
    }

    await prisma.inventoryTransaction.create({
      data: {
        productId,
        batchId,
        type: type as any,
        quantity: type === 'ADJUSTMENT_IN' ? quantity : -quantity,
        referenceType: 'ADJUSTMENT',
        notes,
      },
    })
  }

  // ------------------------------------------------------------------
  // 13. Recalculate invoice balances and statuses to match seed state
  // ------------------------------------------------------------------
  await prisma.purchaseInvoice.update({
    where: { id: invoice2.id },
    data: { status: 'OVERDUE' },
  })

  // ------------------------------------------------------------------
  // 14. Clinical seed (patients, visits, follow-ups)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 14a. Pharmacy Sales History seed data
  // ------------------------------------------------------------------
  const salePatients = await prisma.patient.findMany({
    orderBy: { mr: 'asc' },
    take: 30,
  })
  let saleBatches = await prisma.productBatch.findMany({
    where: { quantity: { gt: 10 } },
    orderBy: { createdAt: 'asc' },
    include: {
      product: { select: { id: true, sellingPrice: true } },
    },
    take: 20,
  })
  const salePaymentMethods = ['CASH', 'UPI', 'CARD', 'BANK']

  if (saleBatches.length === 0) {
    const fallbackCategory = await prisma.productCategory.create({
      data: {
        name: 'Seed Pharmacy Sale Items',
        description: 'Products created for pharmacy sales history pagination checks',
      },
    })
    const fallbackSupplier = await prisma.supplier.create({
      data: {
        supplierName: 'Seed Pharmacy Supplier',
        contactPerson: 'Seed User',
        phone: '9000000000',
        status: 'ACTIVE',
      } as any,
    })
    const fallbackProduct = await prisma.product.create({
      data: {
        name: 'Seed Wellness Tablets',
        code: 'PRD-SEED-PHARMACY-0001',
        sku: 'PHS-SEED-001',
        categoryId: fallbackCategory.id,
        unit: 'strip',
        purchasePrice: 20,
        sellingPrice: 45,
        gstPercent: 5,
        minimumStock: 20,
        maximumStock: 500,
        currentStock: 300,
        active: true,
      },
    })
    const fallbackBatch = await prisma.productBatch.create({
      data: {
        productId: fallbackProduct.id,
        batchNumber: 'PHS-SEED-BATCH-001',
        expiryDate: new Date('2027-12-31'),
        quantity: 300,
        sellingPrice: 45,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: fallbackBatch.id,
        supplierId: fallbackSupplier.id,
        sourceType: 'OPENING',
        quantity: 300,
        remainingQuantity: 300,
        purchaseRate: 20,
      },
    })

    await prisma.inventoryTransaction.create({
      data: {
        productId: fallbackProduct.id,
        batchId: fallbackBatch.id,
        type: 'PURCHASE',
        quantity: 300,
        referenceType: 'PURCHASE_INVOICE',
        notes: 'Opening stock for pharmacy sales history seed',
      },
    })

    saleBatches = await prisma.productBatch.findMany({
      where: { id: fallbackBatch.id },
      include: {
        product: { select: { id: true, sellingPrice: true } },
      },
    })
  }

  if (salePatients.length > 0 && saleBatches.length > 0) {
    for (let i = 0; i < 28; i++) {
      const patient = salePatients[i % salePatients.length]
      const saleDate = new Date('2026-08-01T10:00:00.000Z')
      saleDate.setDate(saleDate.getDate() + i)
      saleDate.setHours(9 + (i % 8), (i * 7) % 60, 0, 0)

      const saleGroup = `PSALE-SEED-202608${String(i + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`
      const lineCount = (i % 3) + 1
      const paymentMethod = salePaymentMethods[i % salePaymentMethods.length]

      for (let j = 0; j < lineCount; j++) {
        const batch = saleBatches[(i + j) % saleBatches.length]
        const quantity = (j % 2) + 1
        const unitPrice = Number(batch.sellingPrice) || Number(batch.product.sellingPrice) || 10
        const saleNumber = lineCount === 1 ? saleGroup : `${saleGroup}-${j + 1}`

        const row = await (prisma as any).pharmacySale.create({
          data: {
            saleGroup,
            saleNumber,
            patientMr: patient.mr,
            customerName: patient.patientName,
            customerPhone: patient.mobileNumber,
            gender: patient.gender,
            age: patient.age === null || patient.age === undefined ? null : String(patient.age),
            dateOfBirth: patient.dob ? patient.dob.toISOString().slice(0, 10) : null,
            bloodGroup: patient.bloodGroup,
            address: [patient.address, patient.district, patient.state, patient.pinCode].filter(Boolean).join(', '),
            productId: batch.productId,
            batchId: batch.id,
            quantity,
            unitPrice,
            totalAmount: quantity * unitPrice,
            paymentMethod,
            notes: 'Seed pharmacy sale for history pagination testing',
            createdAt: saleDate,
          },
        })

        const receipts = await prisma.batchReceipt.findMany({
          where: { batchId: batch.id, remainingQuantity: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
        })

        let remainingToConsume = quantity
        for (const receipt of receipts) {
          if (remainingToConsume <= 0) break
          const consume = Math.min(remainingToConsume, Number(receipt.remainingQuantity))
          await prisma.batchReceipt.update({
            where: { id: receipt.id },
            data: { remainingQuantity: { decrement: consume } },
          })
          remainingToConsume -= consume
        }

        await prisma.productBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: quantity } },
        })

        await prisma.product.update({
          where: { id: batch.productId },
          data: { currentStock: { decrement: quantity } },
        })

        await prisma.inventoryTransaction.create({
          data: {
            productId: batch.productId,
            batchId: batch.id,
            type: 'SALE',
            quantity: -quantity,
            referenceType: 'SALE_INVOICE',
            referenceId: row.id,
            notes: `Seed pharmacy sale ${saleNumber}`,
            createdAt: saleDate,
          },
        })
      }
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

  console.log('Seed completed with PMS data: categories, suppliers, products, batches, invoices, payments, adjustments, transactions, and 100 patients/visits/follow-ups')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
