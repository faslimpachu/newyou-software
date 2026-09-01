import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ValidationError } from '@/lib/api-helpers'
import { Prisma } from '@prisma/client'
import { adjustStock } from '@/lib/inventory-service'

function toNumber(value: unknown): number {
  return Number(value || 0)
}

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK']

type PharmacySaleLine = {
  id: string
  saleNumber: string
  saleGroup: string
  patientMr: string | null
  customerName: string
  customerPhone: string | null
  productId: string
  batchId: string
  quantity: unknown
  unitPrice: unknown
  totalAmount: unknown
  paymentMethod: string
  createdAt: Date
}

type PharmacySaleGroup = {
  saleGroup: string
  _min: { createdAt: Date | null }
  _count: { id: number }
  _sum: { totalAmount: unknown }
}

type PharmacySaleTotal = {
  _sum: { totalAmount: unknown }
}

type MatchingSaleGroup = {
  saleGroup: string
  _min: { createdAt: Date | null }
}

async function generateSaleNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const seq = await tx.sequence.upsert({
    where: { id: 'PHARMACY_SALE' },
    update: { lastNumber: { increment: 1 } },
    create: { id: 'PHARMACY_SALE', name: 'Pharmacy Sale', lastNumber: 1 },
  })
  return `PSALE-${date}-${String(seq.lastNumber).padStart(4, '0')}`
}

function parseDateRange(startDate: string, endDate: string) {
  const createdAt: Prisma.DateTimeFilter = {}

  if (startDate) {
    const start = new Date(startDate)
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0)
      createdAt.gte = start
    }
  }

  if (endDate) {
    const end = new Date(endDate)
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999)
      createdAt.lte = end
    }
  }

  return Object.keys(createdAt).length ? createdAt : undefined
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const summary = url.searchParams.get('summary') === 'true'
    const pharmacySale = (prisma as any).pharmacySale

    if (summary) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setHours(23, 59, 59, 999)

      const [totalSale, todaySale]: [PharmacySaleTotal, PharmacySaleTotal] =
        await Promise.all([
          pharmacySale.aggregate({
            _sum: { totalAmount: true },
          }),
          pharmacySale.aggregate({
            where: { createdAt: { gte: todayStart, lte: todayEnd } },
            _sum: { totalAmount: true },
          }),
        ])

      return NextResponse.json({
        totalSaleAmount: toNumber(totalSale._sum.totalAmount),
        todaySaleAmount: toNumber(todaySale._sum.totalAmount),
      })
    }

    const search = url.searchParams.get('search')?.trim() || ''
    const patientMr = url.searchParams.get('patientMr')?.trim() || ''
    const paymentMethod = url.searchParams.get('paymentMethod') || ''
    const startDate = url.searchParams.get('startDate') || ''
    const endDate = url.searchParams.get('endDate') || ''
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('pageSize')) || 20),
    )
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { saleGroup: { contains: search } },
        { saleNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { patientMr: { contains: search } },
      ]
    }
    if (patientMr) {
      where.patientMr = { contains: patientMr }
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }
    const createdAt = parseDateRange(startDate, endDate)
    if (createdAt) {
      where.createdAt = createdAt
    }

    const matchingGroups: MatchingSaleGroup[] = await pharmacySale.groupBy({
      by: ['saleGroup'],
      where,
      _min: { createdAt: true },
      orderBy: [{ _min: { createdAt: 'desc' } }, { saleGroup: 'desc' }],
    })

    const total = matchingGroups.length
    const pageGroups = matchingGroups.slice(skip, skip + pageSize)
    const saleGroups = pageGroups.map((group) => group.saleGroup)
    const matchingSaleGroups = matchingGroups.map((group) => group.saleGroup)

    const [groups, totalSale]: [PharmacySaleGroup[], PharmacySaleTotal] =
      await Promise.all([
        saleGroups.length
          ? pharmacySale.groupBy({
              by: ['saleGroup'],
              where: { saleGroup: { in: saleGroups } },
              _min: { createdAt: true },
              _count: { id: true },
              _sum: { totalAmount: true },
            })
          : Promise.resolve([]),
        matchingSaleGroups.length
          ? pharmacySale.aggregate({
              where: { saleGroup: { in: matchingSaleGroups } },
              _sum: { totalAmount: true },
            })
          : Promise.resolve({ _sum: { totalAmount: 0 } }),
      ])

    const groupMap = new Map(groups.map((group) => [group.saleGroup, group]))
    const orderedGroups = pageGroups
      .map((group) => groupMap.get(group.saleGroup))
      .filter((group): group is PharmacySaleGroup => Boolean(group))

    const lines = saleGroups.length
      ? ((await pharmacySale.findMany({
          where: { saleGroup: { in: saleGroups } },
          orderBy: { saleNumber: 'asc' },
        })) as PharmacySaleLine[])
      : []

    const productIds = Array.from(new Set(lines.map((line) => line.productId)))
    const batchIds = Array.from(new Set(lines.map((line) => line.batchId)))
    const [products, batches] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, unit: true },
          })
        : Promise.resolve([]),
      batchIds.length
        ? prisma.productBatch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, batchNumber: true },
          })
        : Promise.resolve([]),
    ])

    const productMap = new Map(products.map((product) => [product.id, product]))
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]))
    const linesByGroup = new Map<string, typeof lines>()
    for (const line of lines) {
      const existing = linesByGroup.get(line.saleGroup) || []
      existing.push(line)
      linesByGroup.set(line.saleGroup, existing)
    }

    const sales = orderedGroups.map((group) => {
      const groupLines = linesByGroup.get(group.saleGroup) || []
      const first = groupLines[0]
      const items = groupLines.map((line) => {
        const product = productMap.get(line.productId)
        const batch = batchMap.get(line.batchId)

        return {
          id: line.id,
          saleNumber: line.saleNumber,
          productId: line.productId,
          productName: product?.name || 'Unknown product',
          productSku: product?.sku || null,
          batchId: line.batchId,
          batchNumber: batch?.batchNumber || '',
          quantity: toNumber(line.quantity),
          unitPrice: toNumber(line.unitPrice),
          totalAmount: toNumber(line.totalAmount),
        }
      })

      return {
        saleGroup: group.saleGroup,
        saleNumber: group.saleGroup,
        customerName: first?.customerName || '',
        customerPhone: first?.customerPhone || null,
        patientMr: first?.patientMr || null,
        paymentMethod: first?.paymentMethod || '',
        createdAt: group._min.createdAt || first?.createdAt || null,
        itemsCount: group._count.id,
        totalAmount: toNumber(group._sum.totalAmount),
        items,
      }
    })

    return NextResponse.json({
      sales,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      totalSaleAmount: toNumber(totalSale._sum.totalAmount),
    })
  } catch (e: unknown) {
    console.error('PharmacySales GET error', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      patientMr,
      customerName,
      customerPhone,
      gender,
      age,
      dateOfBirth,
      bloodGroup,
      address,
      paymentMethod,
      notes,
      items: rawItems,
    } = body

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 },
      )
    }
    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (CASH, UPI, CARD, BANK)' },
        { status: 400 },
      )
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one sale item is required' },
        { status: 400 },
      )
    }

    const items = rawItems.map((it: any) => ({
      productId: it.productId,
      batchId: it.batchId,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice) || 0,
    }))

    for (const it of items) {
      if (!it.productId || !it.batchId) {
        return NextResponse.json(
          { error: 'Each item needs a product and batch' },
          { status: 400 },
        )
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be greater than zero' },
          { status: 400 },
        )
      }
      if (it.unitPrice < 0) {
        return NextResponse.json(
          { error: 'Unit price must be a non-negative number' },
          { status: 400 },
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const base = await generateSaleNumber(tx)
      const created: { row: any; product: any; batch: any }[] = []

      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const product = await tx.product.findUnique({
          where: { id: it.productId },
        })
        if (!product) throw new ValidationError('Product not found')
        const batch = await tx.productBatch.findFirst({
          where: { id: it.batchId, productId: it.productId },
        })
        if (!batch)
          throw new ValidationError('Batch not found for this product')
        if (Number(batch.quantity) < it.quantity) {
          throw new ValidationError(
            `Insufficient stock in selected batch for ${product.name}`,
          )
        }

        const effectivePrice =
          it.unitPrice > 0
            ? it.unitPrice
            : Number(batch.sellingPrice) || Number(product.sellingPrice)
        const totalAmount = it.quantity * effectivePrice
        const saleNumber = items.length === 1 ? base : `${base}-${i + 1}`

        const row = await (tx as any).pharmacySale.create({
          data: {
            saleGroup: base,
            saleNumber,
            patientMr: patientMr || null,
            customerName: customerName.trim(),
            customerPhone: customerPhone || null,
            gender: gender || null,
            age:
              age !== undefined && age !== null && age !== ''
                ? String(age)
                : null,
            dateOfBirth: dateOfBirth || null,
            bloodGroup: bloodGroup || null,
            address: address || null,
            productId: it.productId,
            batchId: it.batchId,
            quantity: it.quantity,
            unitPrice: effectivePrice,
            totalAmount,
            paymentMethod,
            notes: notes || null,
          },
        })

        await adjustStock(
          {
            productId: it.productId,
            type: 'SALE',
            quantity: it.quantity,
            batchId: it.batchId,
            referenceType: 'SALE_INVOICE',
            referenceId: row.id,
            notes: `Pharmacy sale ${saleNumber}`,
          },
          tx,
        )

        created.push({ row, product, batch })
      }

      const lines = created.map(({ row, product, batch }) => ({
        id: row.id,
        saleNumber: row.saleNumber,
        productName: product.name,
        batchNumber: batch.batchNumber,
        quantity: toNumber(row.quantity),
        unitPrice: toNumber(row.unitPrice),
        totalAmount: toNumber(row.totalAmount),
      }))

      const totalAmount = lines.reduce((sum, l) => sum + l.totalAmount, 0)

      return {
        saleGroup: base,
        saleNumber: base,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        paymentMethod,
        createdAt: created[0].row.createdAt,
        items: lines,
        totalAmount,
      }
    })

    return NextResponse.json({ sale: result }, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('PharmacySales POST error', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
