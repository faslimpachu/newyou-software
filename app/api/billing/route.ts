import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { patient: true, items: true },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (e) {
    console.error('Billing GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientMr,
      consultationType,
      centerType,
      subtotal,
      tax,
      grandTotal,
      paymentMethod,
      paidAmount,
      balance,
      status,
      remarks,
      items,
    } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'patientMr is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    const nextNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '') || '0') + 1 : 1;
    const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientMr,
        consultationType,
        centerType,
        subtotal: subtotal ? Number(subtotal) : 0,
        tax: tax ? Number(tax) : 0,
        grandTotal: grandTotal ? Number(grandTotal) : 0,
        paymentMethod,
        paidAmount: paidAmount ? Number(paidAmount) : 0,
        balance: balance ? Number(balance) : 0,
        status,
        remarks,
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    console.error('Billing POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
