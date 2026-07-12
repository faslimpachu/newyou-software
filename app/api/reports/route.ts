import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [patients, visits, staff] = await Promise.all([
      prisma.patient.count(),
      prisma.visit.count(),
      prisma.staff.count(),
    ]);

    return NextResponse.json({ patients, visits, staff });
  } catch (e) {
    console.error('Reports error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
