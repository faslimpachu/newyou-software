import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, supplierName: true, contactPerson: true, phone: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, purchasePrice: true, sellingPrice: true } },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        subtotal: toNumber(invoice.subtotal),
        tax: toNumber(invoice.tax),
        grandTotal: toNumber(invoice.grandTotal),
        paid: toNumber(invoice.paid),
        balance: toNumber(invoice.balance),
        items: invoice.items.map((item) => ({
          ...item,
          quantity: toNumber(item.quantity),
          purchaseRate: toNumber(item.purchaseRate),
          amount: toNumber(item.amount),
          product: {
            ...item.product,
            purchasePrice: toNumber(item.product.purchasePrice),
            sellingPrice: toNumber(item.product.sellingPrice),
          },
        })),
        payments: invoice.payments.map((payment) => ({
          ...payment,
          amount: toNumber(payment.amount),
        })),
      },
    });
  } catch (e) {
    console.error('PurchaseInvoice GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}