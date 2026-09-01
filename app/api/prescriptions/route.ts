import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;

    const prescriptions = await prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true, opSheet: true },
    });

    return NextResponse.json({ prescriptions });
  } catch (e) {
    console.error('Prescriptions GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientMr, visitId, opSheetId, diagnosis, medicines, advice, followUp, doctorSignature } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'patientMr is required' }, { status: 400 });
    }

    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientMr,
        visitId,
        opSheetId,
        diagnosis,
        medicines,
        advice,
        followUp,
        doctorSignature,
      },
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (e) {
    console.error('Prescriptions POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, diagnosis, medicines, advice, followUp, doctorSignature } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.prescription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (diagnosis !== undefined) data.diagnosis = diagnosis;
    if (medicines !== undefined) data.medicines = medicines;
    if (advice !== undefined) data.advice = advice;
    if (followUp !== undefined) data.followUp = followUp;
    if (doctorSignature !== undefined) data.doctorSignature = doctorSignature;

    const prescription = await prisma.prescription.update({
      where: { id },
      data,
      include: { opSheet: { include: { visit: true } } },
    });

    return NextResponse.json({ prescription });
  } catch (e) {
    console.error('Prescriptions PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
