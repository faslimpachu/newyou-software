import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          orderBy: { createdAt: 'asc' },
          include: {
            receipts: {
              where: {
                remainingQuantity: { gt: 0 },
              },
              include: {
                supplier: { select: { id: true, supplierName: true } },
                purchaseInvoice: { select: { id: true, invoiceNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const batches = product.batches.map((batch) => {
      const totalRemaining = batch.receipts.reduce(
        (sum, r) => sum + Number(r.remainingQuantity),
        0
      )
      const avgCost =
        totalRemaining > 0
          ? batch.receipts.reduce(
              (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
              0
            ) / totalRemaining
          : 0

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: toNumber(batch.quantity),
        totalRemaining,
        avgCost: Math.round(avgCost * 100) / 100,
        status: batch.expiryDate
          ? batch.expiryDate < new Date()
            ? 'EXPIRED'
            : batch.expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              ? 'EXPIRING_SOON'
              : 'OK'
          : 'NO_EXPIRY',
        receipts: batch.receipts.map((r) => ({
          id: r.id,
          supplierId: r.supplierId,
          supplierName: r.supplier.supplierName,
          purchaseInvoiceId: r.purchaseInvoiceId,
          invoiceNumber: r.purchaseInvoice?.invoiceNumber,
          quantity: toNumber(r.quantity),
          remainingQuantity: toNumber(r.remainingQuantity),
          purchaseRate: toNumber(r.purchaseRate),
          createdAt: r.createdAt,
        })),
      }
    })

    return NextResponse.json({
      product: {
        ...product,
        purchasePrice: toNumber(product.purchasePrice),
        sellingPrice: toNumber(product.sellingPrice),
        gstPercent: toNumber(product.gstPercent),
        currentStock: toNumber(product.currentStock),
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock,
      },
      batches,
    });
  } catch (e) {
    console.error('Product GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      unit,
      purchasePrice,
      sellingPrice,
      gstPercent,
      minimumStock,
      maximumStock,
      currentStock,
      imageUrl,
      active,
    } = body;

    if (currentStock !== undefined) {
      return NextResponse.json({ error: 'Current stock cannot be updated directly. Use inventory adjustment to correct stock levels.' }, { status: 400 });
    }

    if (gstPercent !== undefined) {
      const gst = new Prisma.Decimal(gstPercent)
      if (gst.lessThan(0) || gst.greaterThan(100)) {
        return NextResponse.json({ error: 'GST percent must be between 0 and 100' }, { status: 400 })
      }
    }

    const existing = await prisma.product.findUnique({ where: { id }, select: { active: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (!existing.active) {
      return NextResponse.json({ error: 'Cannot update a deactivated product.' }, { status: 400 })
    }

    if (active !== undefined) {
      return NextResponse.json({ error: 'Product activation status cannot be changed here. Use delete to deactivate.' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(sku !== undefined && { sku: sku?.trim() || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(unit !== undefined && { unit: unit?.trim() || 'pcs' }),
        ...(purchasePrice !== undefined && { purchasePrice }),
        ...(sellingPrice !== undefined && { sellingPrice }),
        ...(gstPercent !== undefined && { gstPercent }),
        ...(minimumStock !== undefined && { minimumStock }),
        ...(maximumStock !== undefined && { maximumStock }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      product: {
        ...product,
        purchasePrice: toNumber(product.purchasePrice),
        sellingPrice: toNumber(product.sellingPrice),
        gstPercent: toNumber(product.gstPercent),
        currentStock: toNumber(product.currentStock),
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock,
      },
    });
  } catch (e: unknown) {
    console.error('Product PATCH error', e);
    if ((e as { code?: string }).code === 'P2002') {
      const target = (e as { meta?: { target?: string } })?.meta?.target
      if (target === 'products_sku_key') {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Product Code already exists' }, { status: 409 });
    }
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('Product DELETE error', e);
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
