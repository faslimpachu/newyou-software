import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function generateMR(): Promise<string> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let seq = await tx.mRSequence.findUnique({
      where: { id: 'GLOBAL' },
    });

    if (!seq) {
      seq = await tx.mRSequence.create({
        data: { id: 'GLOBAL', lastNumber: 1 },
      });
      return `MR${String(seq.lastNumber).padStart(6, '0')}`;
    }

    const updated = await tx.mRSequence.update({
      where: { id: 'GLOBAL' },
      data: { lastNumber: { increment: 1 } },
    });

    return `MR${String(updated.lastNumber).padStart(6, '0')}`;
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
