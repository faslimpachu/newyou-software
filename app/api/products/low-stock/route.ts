import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, currentStock: true, minimumStock: true },
    })

    const lowStockCount = products.filter((p) => new Prisma.Decimal(p.currentStock).lessThan(p.minimumStock)).length

    return NextResponse.json({ count: lowStockCount })
  } catch (e) {
    console.error('Products low-stock GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
