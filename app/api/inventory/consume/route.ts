import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/api-helpers';
import { consumeStock } from '@/lib/inventory-service';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      quantity,
      referenceType,
      referenceId,
      notes,
    } = body;

    if (!productId || quantity === undefined || quantity === null) {
      return NextResponse.json({ error: 'productId and quantity are required' }, { status: 400 });
    }

    const transactions = await consumeStock({
      productId,
      quantity,
      referenceType: referenceType || 'SALE_INVOICE',
      referenceId,
      notes,
    })

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        quantity: toNumber(t.quantity),
      })),
    }, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('ConsumeStock POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
