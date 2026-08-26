import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePurchaseNumber } from '@/lib/api-helpers';
import { ValidationError } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';
import { computePaymentStatus } from '@/lib/payment-status';

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
        { supplier: { supplierName: { contains: search } } },
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

    if (!supplierId || invoiceId === undefined || invoiceId === null || invoiceId === '' || amount === undefined || amount === null || !paymentDate) {
      return NextResponse.json({ error: 'supplierId, invoiceId, amount, and paymentDate are required' }, { status: 400 });
    }

    const paymentNumber = await generatePurchaseNumber('SUPPLIER_PAYMENT')

    const amountDecimal = new Prisma.Decimal(amount)
    if (amountDecimal.lessThanOrEqualTo(0)) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
      })

      if (!invoice) {
        throw new ValidationError('Purchase invoice not found')
      }

      if (invoice.supplierId !== supplierId) {
        throw new ValidationError('Payment supplier does not match the invoice supplier')
      }

      const amountDecimal = new Prisma.Decimal(amount)

      const oldPaid = new Prisma.Decimal(invoice.paid)
      const oldBalance = new Prisma.Decimal(invoice.balance)

      const updated = await tx.purchaseInvoice.updateMany({
        where: {
          id: invoiceId,
          balance: { gte: amountDecimal },
        },
        data: {
          paid: { increment: amountDecimal },
          balance: { decrement: amountDecimal },
        },
      })

      if (updated.count === 0) {
        throw new ValidationError(`Payment amount exceeds outstanding balance`)
      }

      const newPaid = oldPaid.plus(amountDecimal)
      const newBalance = oldBalance.minus(amountDecimal)
      const status = computePaymentStatus(newBalance, newPaid, invoice.dueDate)

      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { status },
      })

      const createdPayment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId,
          invoiceId,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMode: paymentMode || null,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
        },
      })

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
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('SupplierPayments POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}