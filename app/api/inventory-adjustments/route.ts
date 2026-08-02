import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';

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
        },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return NextResponse.json({
      adjustments: adjustments.map((a) => ({
        ...a,
        quantity: toNumber(a.quantity),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
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
      notes,
    } = body;

    if (!productId || !type || quantity === undefined || quantity === null) {
      return NextResponse.json({ error: 'productId, type, and quantity are required' }, { status: 400 });
    }

    const validTypes = ['PURCHASE', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const decreaseTypes = ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST']
    const isDecrease = decreaseTypes.includes(type)
    const qty = new Prisma.Decimal(quantity)

    if (qty.lessThanOrEqualTo(0)) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new ValidationError('Product not found')
      }

      if (isDecrease) {
        const result = await tx.product.updateMany({
          where: {
            id: productId,
            currentStock: { gte: qty },
          },
          data: { currentStock: { decrement: qty.toNumber() } },
        });

        if (result.count === 0) {
          throw new ValidationError('Insufficient stock')
        }
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: { increment: qty.toNumber() } },
        })
      }

      const created = await tx.inventoryTransaction.create({
        data: {
          productId,
          type: type as 'PURCHASE' | 'SALE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN_OUT' | 'EXPIRED' | 'DAMAGED' | 'LOST',
          quantity: isDecrease ? qty.times(-1).toNumber() : qty.toNumber(),
          referenceType: 'ADJUSTMENT',
          notes: notes?.trim() || null,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      })

      return created
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
