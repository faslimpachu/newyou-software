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
      paymentMethod,
      notes,
      items: rawItems,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Valid payment method is required (CASH, UPI, CARD, BANK)' }, { status: 400 });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'At least one sale item is required' }, { status: 400 });
    }

    const items = rawItems.map((it: any) => ({
      productId: it.productId,
      batchId: it.batchId,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice) || 0,
    }));

    for (const it of items) {
      if (!it.productId || !it.batchId) {
        return NextResponse.json({ error: 'Each item needs a product and batch' }, { status: 400 });
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
      }
      if (it.unitPrice < 0) {
        return NextResponse.json({ error: 'Unit price must be a non-negative number' }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const base = await generateSaleNumber(tx);
      const created: { row: any; product: any; batch: any }[] = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product) throw new ValidationError('Product not found');
        const batch = await tx.productBatch.findFirst({ where: { id: it.batchId, productId: it.productId } });
        if (!batch) throw new ValidationError('Batch not found for this product');
        if (Number(batch.quantity) < it.quantity) {
          throw new ValidationError(`Insufficient stock in selected batch for ${product.name}`);
        }

        const effectivePrice =
          it.unitPrice > 0 ? it.unitPrice : Number(batch.sellingPrice) || Number(product.sellingPrice);
        const totalAmount = it.quantity * effectivePrice;
        const saleNumber = items.length === 1 ? base : `${base}-${i + 1}`;

        const row = await tx.pharmacySale.create({
          data: {
            saleGroup: base,
            saleNumber,
            patientMr: patientMr || null,
            customerName: customerName.trim(),
            customerPhone: customerPhone || null,
            gender: gender || null,
            age: age !== undefined && age !== null && age !== '' ? String(age) : null,
            dateOfBirth: dateOfBirth || null,
            bloodGroup: bloodGroup || null,
            address: address || null,
            productId: it.productId,
            batchId: it.batchId,
            quantity: it.quantity,
            unitPrice: effectivePrice,
            totalAmount,
            paymentMethod,
            notes: notes || null,
          },
        });

        await adjustStock(
          {
            productId: it.productId,
            type: 'SALE',
            quantity: it.quantity,
            batchId: it.batchId,
            referenceType: 'SALE_INVOICE',
            referenceId: row.id,
            notes: `Pharmacy sale ${saleNumber}`,
          },
          tx
        );

        created.push({ row, product, batch });
      }

      const lines = created.map(({ row, product, batch }) => ({
        id: row.id,
        saleNumber: row.saleNumber,
        productName: product.name,
        batchNumber: batch.batchNumber,
        quantity: toNumber(row.quantity),
        unitPrice: toNumber(row.unitPrice),
        totalAmount: toNumber(row.totalAmount),
      }));

      const totalAmount = lines.reduce((sum, l) => sum + l.totalAmount, 0);

      return {
        saleGroup: base,
        saleNumber: base,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        paymentMethod,
        createdAt: created[0].row.createdAt,
        items: lines,
        totalAmount,
      };
    });

    return NextResponse.json({ sale: result }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('PharmacySales POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
