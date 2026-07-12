import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function generateMR(centerType: string): Promise<string> {
  const prefix = centerType === 'NUTRITION' ? 'NU' : 'AY';
  
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let seq = await tx.mRSequence.findUnique({
      where: { centerType },
    });

    if (!seq) {
      seq = await tx.mRSequence.create({
        data: { centerType, lastNumber: 1 },
      });
      return `${prefix}${String(seq.lastNumber).padStart(6, '0')}`;
    }

    const updated = await tx.mRSequence.update({
      where: { centerType },
      data: { lastNumber: { increment: 1 } },
    });

    return `${prefix}${String(updated.lastNumber).padStart(6, '0')}`;
  });
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
