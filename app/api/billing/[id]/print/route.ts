import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: decodeURIComponent(id) },
      include: { patient: true, items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('Invoice print GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
