import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
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
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const [purchases, payments] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where: { supplierId: id },
        orderBy: { invoiceDate: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          grandTotal: true,
          paid: true,
          balance: true,
          status: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { paymentDate: 'desc' },
        take: 10,
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          amount: true,
          paymentMode: true,
          reference: true,
          notes: true,
        },
      }),
    ]);

    const totalPurchases = await prisma.purchaseInvoice.aggregate({
      where: { supplierId: id },
      _sum: { grandTotal: true },
    });

    const totalPayments = await prisma.supplierPayment.aggregate({
      where: { supplierId: id },
      _sum: { amount: true },
    });

    const totalPurchaseAmount = toNumber(totalPurchases._sum.grandTotal)
    const totalPaymentAmount = toNumber(totalPayments._sum.amount)
    const outstandingBalance = new Prisma.Decimal(totalPurchaseAmount).plus(toNumber(supplier.openingBalance)).minus(totalPaymentAmount).toNumber()

    const lastPurchase = await prisma.purchaseInvoice.findFirst({
      where: { supplierId: id },
      orderBy: { invoiceDate: 'desc' },
      select: { invoiceDate: true },
    });

    return NextResponse.json({
      supplier: {
        ...supplier,
        openingBalance: toNumber(supplier.openingBalance),
      },
      ledger: {
        totalPurchases: totalPurchaseAmount,
        totalPayments: totalPaymentAmount,
        outstandingBalance,
        lastPurchaseDate: lastPurchase?.invoiceDate || null,
      },
      recentPurchases: purchases.map((p) => ({
        ...p,
        grandTotal: toNumber(p.grandTotal),
        paid: toNumber(p.paid),
        balance: toNumber(p.balance),
      })),
      recentPayments: payments.map((p) => ({
        ...p,
        amount: toNumber(p.amount),
      })),
    });
  } catch (e) {
    console.error('Supplier GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    if (supplierName !== undefined && !supplierName.trim()) {
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

    if (openingBalance !== undefined && openingBalance < 0) {
      return NextResponse.json({ error: 'Opening balance cannot be negative' }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(supplierName !== undefined && { supplierName: supplierName.trim() }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson?.trim() || null }),
        ...(phone !== undefined && { phone: trimmedPhone || null }),
        ...(email !== undefined && { email: trimmedEmail || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(gstNumber !== undefined && { gstNumber: trimmedGst ? trimmedGst.toUpperCase() : null }),
        ...(openingBalance !== undefined && { openingBalance }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ supplier: { ...supplier, openingBalance: toNumber(supplier.openingBalance) } });
  } catch (e: unknown) {
    console.error('Supplier PATCH error', e);
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.supplier.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('Supplier DELETE error', e);
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
