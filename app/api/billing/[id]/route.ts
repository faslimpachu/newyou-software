import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
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
    console.error('Invoice GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    const allowed = [
      'consultationType', 'centerType', 'subtotal', 'tax', 'grandTotal',
      'paymentMethod', 'paidAmount', 'balance', 'status', 'remarks',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key] === '' ? null : body[key];
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: decodeURIComponent(id) },
      data,
    });

    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('Invoice PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
