import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/api-helpers';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sellingPrice } = body;

    if (sellingPrice === undefined || sellingPrice === null) {
      return NextResponse.json({ error: 'sellingPrice is required' }, { status: 400 });
    }

    const price = Number(sellingPrice);
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Selling price must be a non-negative number' }, { status: 400 });
    }

    const batch = await prisma.productBatch.findUnique({
      where: { id },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const updated = await prisma.productBatch.update({
      where: { id },
      data: { sellingPrice: price },
    });

    return NextResponse.json({
      batch: {
        id: updated.id,
        sellingPrice: toNumber(updated.sellingPrice),
      },
    });
  } catch (e) {
    console.error('Batch PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
