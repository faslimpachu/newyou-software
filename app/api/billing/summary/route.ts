import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const [invoiceTotals, expenseTotals, todayExpenseTotal, todayInvoicePayments] = await Promise.all([
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
      prisma.expense.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          date: {
            equals: now.toISOString().slice(0, 10),
          },
        },
      }),
      prisma.invoice.aggregate({
        _sum: {
          paid: true,
        },
        where: {
          createdAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      }),
    ])

    const totalRevenue = invoiceTotals._sum.grandTotal ?? 0
    const totalExpenses = expenseTotals._sum.amount ?? 0
    const outstandingPatientBills = invoiceTotals._sum.balance ?? 0
    const todayExpenses = todayExpenseTotal._sum.amount ?? 0
    const todayCashCollected = todayInvoicePayments._sum.paid ?? 0

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingPatientBills,
      collectedRevenue: totalRevenue - outstandingPatientBills,
      todayExpenses,
      todayCashCollected,
    })
  } catch (error) {
    console.error('Billing summary GET error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}