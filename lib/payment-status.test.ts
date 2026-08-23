import { describe, it, expect } from 'vitest'
import { computePaymentStatus, recomputeOverdueInvoices } from '@/lib/payment-status'
import { Prisma } from '@prisma/client'

describe('computePaymentStatus', () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const toDecimal = (value: number) => new Prisma.Decimal(value)

  it('returns PAID when balance <= 0', () => {
    expect(computePaymentStatus(toDecimal(0), toDecimal(100), yesterday)).toBe('PAID')
    expect(computePaymentStatus(toDecimal(-10), toDecimal(100), yesterday)).toBe('PAID')
    expect(computePaymentStatus(toDecimal(0), toDecimal(0), null)).toBe('PAID')
  })

  it('returns OVERDUE when balance > 0 and dueDate is in the past', () => {
    expect(computePaymentStatus(toDecimal(100), toDecimal(0), yesterday)).toBe('OVERDUE')
    expect(computePaymentStatus(toDecimal(100), toDecimal(50), yesterday)).toBe('OVERDUE')
  })

  it('returns PARTIAL when paid > 0, balance > 0, and not overdue', () => {
    expect(computePaymentStatus(toDecimal(100), toDecimal(50), tomorrow)).toBe('PARTIAL')
    expect(computePaymentStatus(toDecimal(100), toDecimal(1), null)).toBe('PARTIAL')
  })

  it('returns PENDING when balance > 0, paid = 0, and not overdue', () => {
    expect(computePaymentStatus(toDecimal(100), toDecimal(0), tomorrow)).toBe('PENDING')
    expect(computePaymentStatus(toDecimal(100), toDecimal(0), null)).toBe('PENDING')
  })

  it('returns OVERDUE even when partial payment made and due date passed', () => {
    expect(computePaymentStatus(toDecimal(100), toDecimal(50), yesterday)).toBe('OVERDUE')
  })

  it('returns PAID when balance is exactly zero regardless of dueDate', () => {
    expect(computePaymentStatus(toDecimal(0), toDecimal(100), yesterday)).toBe('PAID')
  })

  it('handles zero paid amount with future dueDate as PENDING', () => {
    expect(computePaymentStatus(toDecimal(500), toDecimal(0), tomorrow)).toBe('PENDING')
  })

  it('handles null dueDate correctly', () => {
    expect(computePaymentStatus(toDecimal(100), toDecimal(0), null)).toBe('PENDING')
    expect(computePaymentStatus(toDecimal(100), toDecimal(50), null)).toBe('PARTIAL')
    expect(computePaymentStatus(toDecimal(0), toDecimal(100), null)).toBe('PAID')
  })

  it('does not return OVERDUE when balance <= 0 even with past dueDate', () => {
    expect(computePaymentStatus(toDecimal(0), toDecimal(100), yesterday)).toBe('PAID')
  })
})
