import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductBatches } from '@/lib/inventory-service';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const expiryStatus = url.searchParams.get('expiryStatus') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {}
    if (productId) {
      where.productId = productId
    }
    if (supplierId) {
      where.supplierId = supplierId
    }

    if (expiryStatus === 'expired') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.expiryDate = { lt: today }
    } else if (expiryStatus === 'expiring_soon') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysFromNow = new Date(today)
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      where.expiryDate = { gte: today, lt: thirtyDaysFromNow }
    } else if (expiryStatus === 'ok') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.expiryDate = { gte: today }
    } else if (expiryStatus === 'no_expiry') {
      where.expiryDate = null
    }

    const [batches, total] = await Promise.all([
      prisma.productBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          receipts: {
            where: {
              remainingQuantity: { gt: 0 },
            },
            include: {
              supplier: { select: { id: true, supplierName: true } },
              purchaseInvoice: { select: { id: true, invoiceNumber: true } },
            },
          },
        },
      }),
      prisma.productBatch.count({ where }),
    ])

    const result = batches.map((batch) => {
      const totalRemaining = batch.receipts.reduce(
        (sum, r) => sum + Number(r.remainingQuantity),
        0
      )
      const avgCost =
        totalRemaining > 0
          ? batch.receipts.reduce(
              (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
              0
            ) / totalRemaining
          : 0

      return {
        id: batch.id,
        productId: batch.productId,
        product: batch.product,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: toNumber(batch.quantity),
        totalRemaining,
        avgCost: Math.round(avgCost * 100) / 100,
        status: batch.expiryDate
          ? batch.expiryDate < new Date()
            ? 'EXPIRED'
            : batch.expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              ? 'EXPIRING_SOON'
              : 'OK'
          : 'NO_EXPIRY',
        receipts: batch.receipts.map((r) => ({
          id: r.id,
          supplierId: r.supplierId,
          supplierName: r.supplier.supplierName,
          purchaseInvoiceId: r.purchaseInvoiceId,
          invoiceNumber: r.purchaseInvoice?.invoiceNumber,
          quantity: toNumber(r.quantity),
          remainingQuantity: toNumber(r.remainingQuantity),
          purchaseRate: toNumber(r.purchaseRate),
          createdAt: r.createdAt,
        })),
      }
    })

    return NextResponse.json({
      batches: result,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    console.error('Batches GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
