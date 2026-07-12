import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const status = url.searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) {
      where.patientMr = patientMr;
    }
    if (status) {
      where.status = status;
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });

    return NextResponse.json({ visits });
  } catch (e) {
    console.error('Visits GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientMr, doctor, dietitian, appointmentDate, appointmentTimeSlot } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'Patient MR is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { mr: patientMr },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const visit = await prisma.visit.create({
      data: {
        patientMr,
        doctor: doctor || null,
        dietitian: dietitian || null,
        appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
        appointmentTimeSlot: appointmentTimeSlot || null,
        status: 'Waiting',
      },
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch (e) {
    console.error('Visits POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
