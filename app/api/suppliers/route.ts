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
    const pageSize = Math.min(1000, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
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

    const trimmedPhone = typeof phone === 'string' ? phone.trim() : ''
    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedGst = typeof gstNumber === 'string' ? gstNumber.trim() : ''

    if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number' }, { status: 400 });
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (trimmedGst && !/^[0-9A-Z]{15}$/.test(trimmedGst.toUpperCase())) {
      return NextResponse.json({ error: 'GST number must be 15 alphanumeric characters (e.g., GSTIN1234567890)' }, { status: 400 });
    }

    const openingBalanceValue = openingBalance ?? 0
    if (openingBalanceValue < 0) {
      return NextResponse.json({ error: 'Opening balance cannot be negative' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        supplierName: supplierName.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        address: address?.trim() || null,
        gstNumber: trimmedGst ? trimmedGst.toUpperCase() : null,
        openingBalance: openingBalanceValue,
        status: status || 'ACTIVE',
      },
    });

    return NextResponse.json({ supplier: { ...supplier, openingBalance: toNumber(supplier.openingBalance) } }, { status: 201 });
  } catch (e: unknown) {
    console.error('Suppliers POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
