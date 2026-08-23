import { NextResponse } from 'next/server';
import { recomputeOverdueInvoices } from '@/lib/payment-status';

export async function GET() {
  try {
    const result = await recomputeOverdueInvoices()
    return NextResponse.json({
      message: 'Overdue invoice status recomputed',
      updated: result.updated,
    })
  } catch (e) {
    console.error('Cron update-overdue error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
