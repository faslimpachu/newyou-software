import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function computeTotals(items: { name: string; quantity: number; rate: number }[], discount: number, tax: number, paid: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const discountValue = subtotal * (discount / 100)
  const taxable = subtotal - discountValue
  const taxValue = taxable * (tax / 100)
  const total = taxable + taxValue
  const balance = Math.max(0, total - paid)
  return { subtotal, discountValue, taxValue, total, balance }
}

function mapInvoiceToFrontend(invoice: {
  id: number
  invoiceNumber: string
  center: string
  billType: string
  patientName: string
  patientMrNumber: string
  patientAge: string | null
  patientDob: string | null
  patientGender: string | null
  patientBloodGroup: string | null
  patientAddress: string | null
  patientContact: string | null
  invoiceDate: string
  discount: number
  tax: number
  paid: number
  paymentMethod: string | null
  subtotal?: number | null
  grandTotal?: number | null
  balance?: number | null
  status?: string | null
  items: { id: string; name: string; quantity: number; rate: number }[]
}) {
  const totals = computeTotals(invoice.items, invoice.discount, invoice.tax, invoice.paid)
  return {
    id: invoice.invoiceNumber,
    center: invoice.center as 'nutrition' | 'ayurcare',
    billType: invoice.billType,
    patient: {
      name: invoice.patientName,
      mrNumber: invoice.patientMrNumber,
      age: invoice.patientAge || '',
      dob: invoice.patientDob || '',
      gender: invoice.patientGender || '',
      bloodGroup: invoice.patientBloodGroup || '',
      address: invoice.patientAddress || '',
      contact: invoice.patientContact || '',
    },
    date: invoice.invoiceDate,
    items: invoice.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      rate: item.rate,
    })),
    discount: invoice.discount,
    tax: invoice.tax,
    paid: invoice.paid,
    paymentMethod: invoice.paymentMethod || 'Cash',
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: decodeURIComponent(id) },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice: mapInvoiceToFrontend(invoice) });
  } catch (e) {
    console.error('Invoice GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const invoiceNumber = decodeURIComponent(id)
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const allowedFields = [
      'center', 'billType', 'patientName', 'patientMrNumber', 'patientAge',
      'patientDob', 'patientGender', 'patientBloodGroup', 'patientAddress',
      'patientContact', 'discount', 'tax', 'paid', 'paymentMethod', 'status',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key] === '' ? null : body[key];
      }
    }

    if (body.patient) {
      if (body.patient.name !== undefined) updateData.patientName = body.patient.name
      if (body.patient.mrNumber !== undefined) updateData.patientMrNumber = body.patient.mrNumber
      if (body.patient.age !== undefined) updateData.patientAge = body.patient.age
      if (body.patient.dob !== undefined) updateData.patientDob = body.patient.dob
      if (body.patient.gender !== undefined) updateData.patientGender = body.patient.gender
      if (body.patient.bloodGroup !== undefined) updateData.patientBloodGroup = body.patient.bloodGroup
      if (body.patient.address !== undefined) updateData.patientAddress = body.patient.address
      if (body.patient.contact !== undefined) updateData.patientContact = body.patient.contact
    }

    // The dashboard aggregates these persisted values. Keep them in sync when
    // an invoice's financial inputs are edited instead of relying on a page of
    // invoice rows to recalculate them.
    const discount = body.discount === undefined ? existing.discount : Number(body.discount)
    const tax = body.tax === undefined ? existing.tax : Number(body.tax)
    const paid = body.paid === undefined ? existing.paid : Number(body.paid)
    const totals = computeTotals(existing.items, discount, tax, paid)
    updateData.subtotal = totals.subtotal
    updateData.grandTotal = totals.total
    updateData.balance = totals.balance
    updateData.status = totals.balance > 0 ? 'Pending' : 'Paid'

    const invoice = await prisma.invoice.update({
      where: { invoiceNumber },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json({ invoice: mapInvoiceToFrontend(invoice) });
  } catch (e) {
    console.error('Invoice PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}