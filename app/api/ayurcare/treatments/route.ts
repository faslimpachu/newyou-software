import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;

    const treatments = await prisma.ayurcareTreatment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });

    return NextResponse.json({ treatments });
  } catch (e) {
    console.error('Ayurcare GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientMr,
      diagnosis,
      treatmentPlan,
      medicines,
      procedures,
      therapies,
      advice,
      practitioner,
      reviewDate,
      notes,
    } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'patientMr is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const treatment = await prisma.ayurcareTreatment.create({
      data: {
        patientMr,
        diagnosis,
        treatmentPlan,
        medicines,
        procedures,
        therapies,
        advice,
        practitioner,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        notes,
      },
    });

    return NextResponse.json({ treatment }, { status: 201 });
  } catch (e) {
    console.error('Ayurcare POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
