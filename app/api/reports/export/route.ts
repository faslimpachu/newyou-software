import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        mr: true,
        patientName: true,
        mobileNumber: true,
        consultationType: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'MR,Name,Mobile,Type,Status,Created';
    const rows = patients.map((p: typeof patients[0]) =>
      [p.mr, p.patientName, p.mobileNumber, p.consultationType, p.status || '', new Date(p.createdAt).toISOString()].join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=patients.csv',
      },
    });
  } catch (e) {
    console.error('Reports export error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
