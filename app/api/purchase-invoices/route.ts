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
        { invoiceNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          supplier: { select: { id: true, supplierName: true, contactPerson: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
        },
      }),
      prisma.purchaseInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        ...inv,
        subtotal: toNumber(inv.subtotal),
        tax: toNumber(inv.tax),
        grandTotal: toNumber(inv.grandTotal),
        paid: toNumber(inv.paid),
        balance: toNumber(inv.balance),
        items: inv.items.map((item) => ({
          ...item,
          quantity: toNumber(item.quantity),
          purchaseRate: toNumber(item.purchaseRate),
          amount: toNumber(item.amount),
        })),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error('PurchaseInvoices GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      invoiceDate,
      supplierId,
      paymentMode,
      dueDate,
      notes,
      items,
    } = body;

    if (!invoiceDate || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'invoiceDate, supplierId, and at least one item are required' }, { status: 400 });
    }

    const subtotal = items.reduce((sum: number, item: { quantity: number; purchaseRate: number }) => sum + (item.quantity * item.purchaseRate), 0)
    const tax = subtotal * 0.12
    const grandTotal = subtotal + tax
    const balance = grandTotal

    const invoiceNumber = await generatePurchaseNumber('PURCHASE_INVOICE')

    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          supplierId,
          paymentMode: paymentMode || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes?.trim() || null,
          subtotal,
          tax,
          grandTotal,
          paid: 0,
          balance,
          status: 'PENDING',
        },
      })

      for (const item of items) {
        const quantity = Number(item.quantity) || 0
        const purchaseRate = Number(item.purchaseRate) || 0
        const amount = quantity * purchaseRate

        await tx.purchaseInvoiceItem.create({
          data: {
            invoiceId: createdInvoice.id,
            productId: item.productId,
            quantity,
            purchaseRate,
            amount,
          },
        })

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: quantity } },
        })

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'PURCHASE',
            quantity,
            referenceType: 'PURCHASE_INVOICE',
            referenceId: createdInvoice.id,
            notes: `Purchase invoice ${invoiceNumber}`,
          },
        })
      }

      return createdInvoice
    })

    const fullInvoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        supplier: { select: { id: true, supplierName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    })

    return NextResponse.json({
      invoice: fullInvoice ? {
        ...fullInvoice,
        subtotal: toNumber(fullInvoice.subtotal),
        tax: toNumber(fullInvoice.tax),
        grandTotal: toNumber(fullInvoice.grandTotal),
        paid: toNumber(fullInvoice.paid),
        balance: toNumber(fullInvoice.balance),
        items: fullInvoice.items.map((item) => ({
          ...item,
          quantity: toNumber(item.quantity),
          purchaseRate: toNumber(item.purchaseRate),
          amount: toNumber(item.amount),
        })),
      } : null,
    }, { status: 201 })
  } catch (e: unknown) {
    console.error('PurchaseInvoices POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
