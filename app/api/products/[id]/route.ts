import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      reorderLevel,
      currentStock,
      imageUrl,
      active,
    } = body;

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
        ...(reorderLevel !== undefined && { reorderLevel }),
        ...(currentStock !== undefined && { currentStock }),
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
      },
    });
  } catch (e: unknown) {
    console.error('Product PATCH error', e);
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
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
