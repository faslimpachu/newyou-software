import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, centerType: true },
      orderBy: { name: 'asc' },
    });

    const centers = ['NUTRITION', 'AYURCARE'];
    const statuses = ['Active', 'Inactive', 'Waiting', 'Consulting', 'Completed', 'Cancelled', 'Follow-up'];
    const visitStatuses = ['Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show', 'Follow-up'];

    return NextResponse.json({
      staff,
      centers,
      statuses,
      visitStatuses: [
        'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show', 'Follow-up'
      ],
    });
  } catch (e) {
    console.error('Lookup GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
