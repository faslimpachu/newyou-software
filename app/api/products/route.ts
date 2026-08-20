import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateProductCode } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const categoryId = url.searchParams.get('categoryId') || '';
    const active = url.searchParams.get('active');
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (active !== null && active !== '') {
      where.active = active === 'true';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        purchasePrice: toNumber(p.purchasePrice),
        sellingPrice: toNumber(p.sellingPrice),
        gstPercent: toNumber(p.gstPercent),
        currentStock: toNumber(p.currentStock),
        minimumStock: p.minimumStock,
        maximumStock: p.maximumStock,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error('Products GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const code = await generateProductCode()

    const gst = new Prisma.Decimal(body.gstPercent ?? 0)
    if (gst.lessThan(0) || gst.greaterThan(100)) {
      return NextResponse.json({ error: 'GST percent must be between 0 and 100' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        code,
        sku: sku?.trim() || null,
        categoryId: categoryId || null,
        unit: unit?.trim() || 'pcs',
        purchasePrice: purchasePrice ?? 0,
        sellingPrice: sellingPrice ?? 0,
        gstPercent: gstPercent ?? 0,
        minimumStock: minimumStock ?? 10,
        maximumStock: maximumStock ?? 200,
        currentStock: currentStock ?? 0,
        imageUrl: imageUrl?.trim() || null,
        active: true,
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
    }, { status: 201 });
  } catch (e: unknown) {
    console.error('Products POST error', e);
    if ((e as { code?: string }).code === 'P2002') {
      const target = (e as { meta?: { target?: string } })?.meta?.target
      if (target === 'products_sku_key') {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Product Code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
