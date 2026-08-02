import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await prisma.productCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (e) {
    console.error('ProductCategory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, active } = body;

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ category });
  } catch (e: unknown) {
    console.error('ProductCategory PATCH error', e);
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.productCategory.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('ProductCategory DELETE error', e);
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
