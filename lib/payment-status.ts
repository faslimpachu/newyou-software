import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export function computePaymentStatus(
  balance: Prisma.Decimal,
  paid: Prisma.Decimal,
  dueDate: Date | null
): 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' {
  if (balance.lessThanOrEqualTo(0)) {
    return 'PAID'
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dueDate && new Date(dueDate) < today) {
    return 'OVERDUE'
  }
  if (paid.greaterThan(0)) {
    return 'PARTIAL'
  }
  return 'PENDING'
}

export async function recomputeOverdueInvoices(): Promise<{ updated: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      status: {
        in: ['PENDING', 'PARTIAL'],
      },
      balance: {
        gt: 0,
      },
      dueDate: {
        lt: today,
      },
    },
  })

  let updated = 0
  for (const invoice of overdueInvoices) {
    const newStatus = computePaymentStatus(invoice.balance, invoice.paid, invoice.dueDate)
    if (newStatus === 'OVERDUE') {
      await prisma.purchaseInvoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      })
      updated++
    }
  }

  return { updated }
}
