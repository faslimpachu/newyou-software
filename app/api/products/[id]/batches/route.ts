import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductBatches } from '@/lib/inventory-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const batches = await getProductBatches(id)

    return NextResponse.json({ batches })
  } catch (e) {
    console.error('Product Batches GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
