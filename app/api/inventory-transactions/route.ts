import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
        },
      }),
      prisma.inventoryTransaction.count({ where }),
    ])

    const purchaseInvoiceIds = transactions
      .filter((t) => t.referenceType === 'PURCHASE_INVOICE' && t.referenceId)
      .map((t) => t.referenceId as string)

    const invoices = purchaseInvoiceIds.length
      ? await prisma.purchaseInvoice.findMany({
          where: { id: { in: purchaseInvoiceIds } },
          select: { id: true, invoiceNumber: true },
        })
      : []

    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv.invoiceNumber]))

    return NextResponse.json({
      transactions: transactions.map((t) => {
        const reference =
          t.referenceType === 'PURCHASE_INVOICE' && t.referenceId
            ? invoiceMap.get(t.referenceId) || t.referenceId
            : t.referenceId || null

        return {
          ...t,
          quantity: toNumber(t.quantity),
          reference,
        }
      }),
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