import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const active = url.searchParams.get('active');

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search };
    }
    if (active !== null && active !== '') {
      where.active = active === 'true';
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch (e) {
    console.error('ProductCategories GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active: active ?? true,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (e: unknown) {
    console.error('ProductCategories POST error', e);
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
