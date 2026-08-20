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
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        purchasePrice: toNumber(product.purchasePrice),
        sellingPrice: toNumber(product.sellingPrice),
        gstPercent: toNumber(product.gstPercent),
        currentStock: toNumber(product.currentStock),
      },
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
        ...(active !== undefined && { active }),
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
