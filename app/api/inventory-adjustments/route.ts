import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';
import { adjustStock } from '@/lib/inventory-service';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') || '';
    const type = url.searchParams.get('type') || '';
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
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [adjustments, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          batch: { select: { id: true, batchNumber: true } },
        },
      }),
      prisma.inventoryTransaction.count({ where }),
    ])

    return NextResponse.json({
      adjustments: adjustments.map((a) => ({
        ...a,
        quantity: toNumber(a.quantity),
        batch: a.batch,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    console.error('InventoryAdjustments GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      type,
      quantity,
      batchId,
      unitCost,
      supplierId,
      notes,
    } = body;

    if (!productId || !type || quantity === undefined || quantity === null || !batchId) {
      return NextResponse.json({ error: 'productId, type, quantity, and batchId are required' }, { status: 400 });
    }

    const validTypes = ['SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST', 'OPENING']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const allowManualSale = process.env.ALLOW_MANUAL_SALE_ADJUSTMENT !== 'false'
    if (type === 'SALE' && !allowManualSale) {
      return NextResponse.json({ error: 'Manual SALE adjustments are not allowed. Use the billing module for sales.' }, { status: 400 });
    }

    const decreaseTypes = ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST']
    const isDecrease = decreaseTypes.includes(type)

    const adjustmentType = type === 'OPENING' ? 'ADJUSTMENT_IN' : type

    const adjustment = await prisma.$transaction(async (tx) => {
      return await adjustStock({
        productId,
        type: adjustmentType as 'SALE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN_OUT' | 'EXPIRED' | 'DAMAGED' | 'LOST',
        quantity,
        batchId,
        unitCost: isDecrease ? undefined : unitCost,
        supplierId: isDecrease ? undefined : supplierId,
        referenceType: 'ADJUSTMENT',
        notes,
      }, tx)
    })

    return NextResponse.json({
      transaction: {
        ...adjustment,
        quantity: toNumber(adjustment.quantity),
      },
    }, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('InventoryAdjustments POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
