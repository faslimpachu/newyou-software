import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePurchaseNumber } from '@/lib/api-helpers';
import { ValidationError } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';
import { receiveStock } from '@/lib/inventory-service';

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
      return NextResponse.json({ error: 'Purchase invoice must contain at least one item' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json({ error: 'Product is required for all items' }, { status: 400 })
      }
      if (!item.batchNumber || !item.batchNumber.trim()) {
        return NextResponse.json({ error: 'Batch number is required for all items' }, { status: 400 })
      }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new ValidationError('Supplier not found')
    }

    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, gstPercent: true },
    })

    const foundIds = new Set(products.map((p) => p.id))
    const missingIds = productIds.filter((id: string) => !foundIds.has(id))
    if (missingIds.length > 0) {
      throw new ValidationError(`Products not found: ${missingIds.join(', ')}`)
    }

    const productMap = new Map<string, Prisma.Decimal>(
      products.map((product) => [product.id, product.gstPercent ?? new Prisma.Decimal(0)]),
    )

    for (const product of products) {
      const gstPercent = product.gstPercent ?? new Prisma.Decimal(0)
      if (gstPercent.lessThan(0) || gstPercent.greaterThan(100)) {
        throw new ValidationError(`Invalid GST percent for product: ${gstPercent}`)
      }
    }

    const enforceUniqueProducts = process.env.ENFORCE_UNIQUE_PURCHASE_PRODUCTS === 'true'
    if (enforceUniqueProducts) {
      const uniqueProductIds = new Set(productIds)
      if (uniqueProductIds.size !== productIds.length) {
        return NextResponse.json({ error: 'Duplicate products are not allowed in the same invoice' }, { status: 400 })
      }
    }

    const totals = items.reduce(
      (acc: { subtotal: Prisma.Decimal; tax: Prisma.Decimal }, item: { productId: string; quantity: number; purchaseRate: number }) => {
        const lineAmount = new Prisma.Decimal(item.quantity).times(item.purchaseRate)
        const gst = productMap.get(item.productId) ?? new Prisma.Decimal(0)
        return {
          subtotal: acc.subtotal.plus(lineAmount),
          tax: acc.tax.plus(lineAmount.times(gst).div(100)),
        }
      },
      { subtotal: new Prisma.Decimal(0), tax: new Prisma.Decimal(0) },
    )

    const subtotal = totals.subtotal
    const tax = totals.tax
    const grandTotal = subtotal.plus(tax)
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
          subtotal: subtotal.toNumber(),
          tax: tax.toNumber(),
          grandTotal: grandTotal.toNumber(),
          paid: 0,
          balance: balance.toNumber(),
          status: 'PENDING',
        },
      })

      for (const item of items) {
        const quantity = new Prisma.Decimal(item.quantity)
        const purchaseRate = new Prisma.Decimal(item.purchaseRate)

        if (quantity.lessThanOrEqualTo(0)) {
          throw new ValidationError('Quantity must be greater than zero')
        }
        if (purchaseRate.lessThanOrEqualTo(0)) {
          throw new ValidationError('Purchase rate must be greater than zero')
        }

        const gstPercent = new Prisma.Decimal(item.gstPercent ?? productMap.get(item.productId) ?? 0)
        if (gstPercent.lessThan(0) || gstPercent.greaterThan(100)) {
          throw new ValidationError(`Invalid GST percent for product`)
        }

        const amount = quantity.times(purchaseRate)

        await tx.purchaseInvoiceItem.create({
          data: {
            invoiceId: createdInvoice.id,
            productId: item.productId,
            quantity: quantity.toNumber(),
            purchaseRate: purchaseRate.toNumber(),
            amount: amount.toNumber(),
            batchNumber: item.batchNumber?.trim() || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        })

        await receiveStock({
          productId: item.productId,
          quantity: quantity.toNumber(),
          batchNumber: item.batchNumber?.trim() || `BATCH-${Date.now()}`,
          supplierId,
          purchaseInvoiceId: createdInvoice.id,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          purchaseRate: purchaseRate.toNumber(),
          notes: `Purchase invoice ${invoiceNumber}`,
        }, tx)
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
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('PurchaseInvoices POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
