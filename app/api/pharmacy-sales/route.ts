import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';
import { adjustStock } from '@/lib/inventory-service';

function toNumber(value: unknown): number {
  return Number(value || 0)
}

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK'];

async function generateSaleNumber(tx: Prisma.TransactionClient): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const seq = await tx.sequence.upsert({
    where: { id: 'PHARMACY_SALE' },
    update: { lastNumber: { increment: 1 } },
    create: { id: 'PHARMACY_SALE', name: 'Pharmacy Sale', lastNumber: 1 },
  })
  return `PSALE-${date}-${String(seq.lastNumber).padStart(4, '0')}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientMr,
      customerName,
      customerPhone,
      gender,
      age,
      dateOfBirth,
      bloodGroup,
      address,
      productId,
      batchId,
      quantity,
      unitPrice,
      paymentMethod,
      notes,
    } = body;

    if (!productId || !batchId) {
      return NextResponse.json({ error: 'productId and batchId are required' }, { status: 400 });
    }
    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Valid payment method is required (CASH, UPI, CARD, BANK)' }, { status: 400 });
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Unit price must be a non-negative number' }, { status: 400 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new ValidationError('Product not found');
      }

      const batch = await tx.productBatch.findFirst({
        where: { id: batchId, productId },
      });
      if (!batch) {
        throw new ValidationError('Batch not found for this product');
      }
      if (Number(batch.quantity) < qty) {
        throw new ValidationError('Insufficient stock in selected batch');
      }

      const effectivePrice = price > 0 ? price : Number(batch.sellingPrice) || Number(product.sellingPrice);
      const totalAmount = qty * effectivePrice;
      const saleNumber = await generateSaleNumber(tx);

      const created = await tx.pharmacySale.create({
        data: {
          saleNumber,
          patientMr: patientMr || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone || null,
          gender: gender || null,
          age: age !== undefined && age !== null && age !== '' ? String(age) : null,
          dateOfBirth: dateOfBirth || null,
          bloodGroup: bloodGroup || null,
          address: address || null,
          productId,
          batchId,
          quantity: qty,
          unitPrice: effectivePrice,
          totalAmount,
          paymentMethod,
          notes: notes || null,
        },
      });

      await adjustStock(
        {
          productId,
          type: 'SALE',
          quantity: qty,
          batchId,
          referenceType: 'SALE_INVOICE',
          referenceId: created.id,
          notes: `Pharmacy sale ${saleNumber}`,
        },
        tx
      );

      return created;
    });

    return NextResponse.json(
      {
        sale: {
          ...sale,
          quantity: toNumber(sale.quantity),
          unitPrice: toNumber(sale.unitPrice),
          totalAmount: toNumber(sale.totalAmount),
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('PharmacySales POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
