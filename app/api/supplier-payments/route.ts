import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePurchaseNumber } from '@/lib/api-helpers';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { reference: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [payments, total] = await Promise.all([
      prisma.supplierPayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          supplier: { select: { id: true, supplierName: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      prisma.supplierPayment.count({ where }),
    ]);

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        amount: toNumber(p.amount),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error('SupplierPayments GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierId,
      invoiceId,
      amount,
      paymentDate,
      paymentMode,
      reference,
      notes,
    } = body;

    if (!supplierId || !amount || !paymentDate) {
      return NextResponse.json({ error: 'supplierId, amount, and paymentDate are required' }, { status: 400 });
    }

    const paymentNumber = await generatePurchaseNumber('SUPPLIER_PAYMENT')

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId,
          invoiceId: invoiceId || null,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMode: paymentMode || null,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
        },
      })

      if (invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: invoiceId },
        })

        if (invoice) {
          const newPaid = Number(invoice.paid) + Number(amount)
          const newBalance = Number(invoice.grandTotal) - newPaid
          let status = 'PENDING'
          if (newBalance <= 0) {
            status = 'PAID'
          } else if (newPaid > 0) {
            status = 'PARTIAL'
          }

          await tx.purchaseInvoice.update({
            where: { id: invoiceId },
            data: {
              paid: newPaid,
              balance: newBalance,
              status: status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
            },
          })
        }
      }

      return createdPayment
    })

    const fullPayment = await prisma.supplierPayment.findUnique({
      where: { id: payment.id },
      include: {
        supplier: { select: { id: true, supplierName: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    })

    return NextResponse.json({
      payment: fullPayment ? {
        ...fullPayment,
        amount: toNumber(fullPayment.amount),
      } : null,
    }, { status: 201 })
  } catch (e: unknown) {
    console.error('SupplierPayments POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}