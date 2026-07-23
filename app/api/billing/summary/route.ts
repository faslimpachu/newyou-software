import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This endpoint deliberately does not accept pagination or table filters. The
// billing dashboard is a clinic-wide aggregate, while the tables are paginated
// views of that same data.
export async function GET() {
  try {
    const [invoiceTotals, expenseTotals] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: {
          grandTotal: true,
          balance: true,
        },
      }),
      prisma.expense.aggregate({
        _sum: {
          amount: true,
        },
      }),
    ])

    const totalRevenue = invoiceTotals._sum.grandTotal ?? 0
    const totalExpenses = expenseTotals._sum.amount ?? 0
    const outstandingPatientBills = invoiceTotals._sum.balance ?? 0

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingPatientBills,
      collectedRevenue: totalRevenue - outstandingPatientBills,
    })
  } catch (error) {
    console.error('Billing summary GET error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}