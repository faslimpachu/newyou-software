import { Prisma } from '@prisma/client'

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
