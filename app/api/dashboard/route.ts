import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function last12Months() {
  const months: { month: string; key: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      key: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    })
  }
  return months
}

export async function GET() {
  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const monthStart = startOfMonth(now)

    const [
      totalPatients,
      nutritionPatients,
      ayurcarePatients,
      todayRegistrations,
      todayVisits,
      pendingBills,
      consultationTypeData,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { consultationType: 'NUTRITION' } }),
      prisma.patient.count({ where: { consultationType: 'AYURCARE' } }),
      prisma.patient.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.visit.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.invoice.count({ where: { status: 'Pending' } }),
      prisma.patient.groupBy({
        by: ['consultationType'],
        _count: { consultationType: true },
        where: { createdAt: { gte: monthStart } },
      }),
    ])

    const consultationTypes = [
      { type: 'General', value: 0, fill: 'var(--color-general)' },
      { type: 'Nutrition', value: 0, fill: 'var(--color-nutrition)' },
      { type: 'Ayurcare', value: 0, fill: 'var(--color-ayurcare)' },
      { type: 'Follow-up', value: 0, fill: 'var(--color-followup)' },
    ]

    for (const row of consultationTypeData) {
      const type = row.consultationType.toLowerCase()
      const entry = consultationTypes.find((c) => c.type.toLowerCase() === type || (type === 'general' && c.type === 'General'))
      if (entry) entry.value = row._count.consultationType
    }

    const monthlyRegistrations = last12Months().map((m) => ({ month: m.month, registrations: 0 }))
    const monthlyRevenue = last12Months().map((m) => ({ month: m.month, revenue: 0, expenses: 0 }))

    const allPatients = await prisma.patient.findMany({
      select: { createdAt: true },
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
    })

    const monthCounts = new Map<string, number>()
    for (const p of allPatients) {
      const key = p.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    }

    for (const m of monthlyRegistrations) {
      const key = new Date(now.getFullYear(), now.getMonth() - 11 + monthlyRegistrations.indexOf(m), 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      m.registrations = monthCounts.get(key) || 0
    }

    const allInvoices = await prisma.invoice.findMany({
      select: { createdAt: true, grandTotal: true },
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
    })

    const allExpenses = await prisma.expense.findMany({
      select: { createdAt: true, amount: true },
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
    })

    const revenueByMonth = new Map<string, number>()
    const expenseByMonth = new Map<string, number>()

    for (const inv of allInvoices) {
      const key = inv.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + inv.grandTotal)
    }

    for (const exp of allExpenses) {
      const key = exp.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + exp.amount)
    }

    for (let i = 0; i < 12; i++) {
      const key = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthlyRevenue[i].revenue = revenueByMonth.get(key) || 0
      monthlyRevenue[i].expenses = expenseByMonth.get(key) || 0
    }

    const todayRevenue = monthlyRevenue[11]?.revenue || 0

    return NextResponse.json({
      stats: {
        registrations: todayRegistrations,
        visits: todayVisits,
        totalPatients,
        nutritionPatients,
        ayurcarePatients,
        revenueToday: todayRevenue,
        pendingBills,
      },
      monthlyRegistrations,
      consultationTypes,
      monthlyRevenue,
    })
  } catch (e) {
    console.error('Dashboard error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
