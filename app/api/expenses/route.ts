import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    const month = url.searchParams.get('month') || '';
    const category = url.searchParams.get('category') || '';

    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (month) {
      const [year, m] = month.split('-');
      if (year && m) {
        const start = `${year}-${m}-01`;
        const end = m === '12' ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(m) + 1).padStart(2, '0')}-01`;
        where.date = { gte: start, lt: end };
      }
    }
    if (category && category !== 'all') where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (e) {
    console.error('Expenses GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      category,
      description,
      amount,
      paymentMethod,
      paidTo,
      remarks,
      receiptName,
      receiptDataUrl,
      addedBy,
      createdDate,
    } = body;

    if (!date || !category || !description || !amount) {
      return NextResponse.json({ error: 'date, category, description, and amount are required' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        date,
        category,
        description,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'Cash',
        paidTo: paidTo || '',
        remarks: remarks || '',
        receiptName: receiptName || null,
        receiptDataUrl: receiptDataUrl || null,
        addedBy: addedBy || 'Front Office',
        createdDate: createdDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error('Expenses POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
