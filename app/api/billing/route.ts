import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function computeTotals(items: { name: string; quantity: number; rate: number }[], discount: number, tax: number, paid: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const discountValue = subtotal * (discount / 100)
  const taxable = subtotal - discountValue
  const taxValue = taxable * (tax / 100)
  const total = taxable + taxValue
  const balance = Math.max(0, total - paid)
  return { subtotal, discountValue, taxValue, total, balance }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMrNumber = patientMr;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
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
      center,
      billType,
      patient,
      items,
      discount,
      tax,
      paid,
      paymentMethod,
    } = body;

    if (!center || !billType || !patient || !items?.length) {
      return NextResponse.json({ error: 'center, billType, patient, and items are required' }, { status: 400 });
    }

    const totals = computeTotals(items, discount || 0, tax || 0, paid || 0);

    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const nextNum = lastInvoice ? lastInvoice.id + 1 : 1;
    const invoiceNumber = `INV-${String(nextNum).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        center,
        billType,
        patientName: patient.name,
        patientMrNumber: patient.mrNumber,
        patientAge: patient.age,
        patientDob: patient.dob || null,
        patientGender: patient.gender,
        patientBloodGroup: patient.bloodGroup,
        patientAddress: patient.address,
        patientContact: patient.contact,
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        discount: discount || 0,
        tax: tax || 0,
        paid: paid || 0,
        paymentMethod: paymentMethod || 'Cash',
        subtotal: totals.subtotal,
        grandTotal: totals.total,
        balance: totals.balance,
        status: totals.balance > 0 ? 'Pending' : 'Paid',
        items: {
          create: items.map((item: { name: string; quantity: number; rate: number }) => ({
            name: item.name,
            quantity: item.quantity,
            rate: item.rate,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    console.error('Billing POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
