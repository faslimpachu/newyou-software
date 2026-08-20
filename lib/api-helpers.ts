import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function generateMR(): Promise<string> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    try {
      const updated = await tx.mRSequence.update({
        where: { id: 'GLOBAL' },
        data: { lastNumber: { increment: 1 } },
      })
      return `MR${String(updated.lastNumber).padStart(6, '0')}`
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') {
        const created = await tx.mRSequence.create({
          data: { id: 'GLOBAL', lastNumber: 1 },
        })
        return `MR${String(created.lastNumber).padStart(6, '0')}`
      }
      throw e
    }
  })
}

export async function generateVisitId(centerType: 'NUTRITION' | 'AYURCARE'): Promise<string> {
  const prefix = centerType === 'NUTRITION' ? 'NU' : 'AY'

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    try {
      const updated = await tx.visitSequence.update({
        where: { id: centerType },
        data: { lastNumber: { increment: 1 } },
      })
      return `${prefix}${String(updated.lastNumber).padStart(6, '0')}`
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') {
        const created = await tx.visitSequence.create({
          data: { id: centerType, centerType, lastNumber: 1 },
        })
        return `${prefix}${String(created.lastNumber).padStart(6, '0')}`
      }
      throw e
    }
  })
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseJson<T>(body: unknown): T {
  return body as T;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function generateProductCode(): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `PRD-${date}-`

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const maxExisting = await tx.product.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    })

    let nextNum = 1
    if (maxExisting?.code) {
      const parts = maxExisting.code.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num >= nextNum) nextNum = num + 1
    }

    const updated = await tx.productSequence.upsert({
      where: { id: 'GLOBAL' },
      update: { lastNumber: { increment: 1 } },
      create: { id: 'GLOBAL', lastNumber: nextNum },
    })

    const num = Math.max(updated.lastNumber, nextNum)
    if (num > updated.lastNumber) {
      await tx.productSequence.update({
        where: { id: 'GLOBAL' },
        data: { lastNumber: num },
      })
    }

    return `${prefix}${String(num).padStart(4, '0')}`
  })
}

export async function generatePurchaseNumber(sequenceName: 'PURCHASE_INVOICE' | 'SUPPLIER_PAYMENT' | 'SALE_INVOICE'): Promise<string> {
  const prefixMap: Record<string, string> = {
    PURCHASE_INVOICE: 'PINV',
    SUPPLIER_PAYMENT: 'PPAY',
    SALE_INVOICE: 'SINV',
  }

  const nameMap: Record<string, string> = {
    PURCHASE_INVOICE: 'Purchase Invoice',
    SUPPLIER_PAYMENT: 'Supplier Payment',
    SALE_INVOICE: 'Sale Invoice',
  }

  const prefix = prefixMap[sequenceName] || 'DOC'
  const name = nameMap[sequenceName] || 'Document'

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    try {
      const updated = await tx.sequence.update({
        where: { id: sequenceName },
        data: { lastNumber: { increment: 1 } },
      })

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const num = String(updated.lastNumber).padStart(4, '0')

      return `${prefix}-${date}-${num}`
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') {
        const created = await tx.sequence.create({
          data: { id: sequenceName, name, lastNumber: 1 },
        })

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const num = String(created.lastNumber).padStart(4, '0')

        return `${prefix}-${date}-${num}`
      }

      throw e
    }
  })
}
