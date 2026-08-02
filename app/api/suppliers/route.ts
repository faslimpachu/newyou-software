import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { supplierName: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { gstNumber: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          supplierName: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          gstNumber: true,
          openingBalance: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      suppliers: suppliers.map((s) => ({ ...s, openingBalance: toNumber(s.openingBalance) })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error('Suppliers GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      openingBalance,
      status,
    } = body;

    if (!supplierName || !supplierName.trim()) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        supplierName: supplierName.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        openingBalance: openingBalance ?? 0,
        status: status || 'ACTIVE',
      },
    });

    return NextResponse.json({ supplier: { ...supplier, openingBalance: toNumber(supplier.openingBalance) } }, { status: 201 });
  } catch (e: unknown) {
    console.error('Suppliers POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
