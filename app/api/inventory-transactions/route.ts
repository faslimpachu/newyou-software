import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') || '';
    const type = url.searchParams.get('type') || '';
    const referenceType = url.searchParams.get('referenceType') || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (productId) {
      where.productId = productId;
    }
    if (type) {
      where.type = type;
    }
    if (referenceType) {
      where.referenceType = referenceType;
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          purchaseInvoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        quantity: toNumber(t.quantity),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error('InventoryTransactions GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}