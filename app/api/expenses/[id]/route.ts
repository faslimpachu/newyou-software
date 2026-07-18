import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (e) {
    console.error('Expense GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.date !== undefined) data.date = body.date;
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.paidTo !== undefined) data.paidTo = body.paidTo;
    if (body.remarks !== undefined) data.remarks = body.remarks;
    if (body.receiptName !== undefined) data.receiptName = body.receiptName || null;
    if (body.receiptDataUrl !== undefined) data.receiptDataUrl = body.receiptDataUrl || null;
    if (body.addedBy !== undefined) data.addedBy = body.addedBy;
    if (body.createdDate !== undefined) data.createdDate = body.createdDate;

    const expense = await prisma.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json({ expense });
  } catch (e) {
    console.error('Expense PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Expense DELETE error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
