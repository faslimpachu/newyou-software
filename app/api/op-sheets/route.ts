import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const visitId = url.searchParams.get('visitId') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;
    if (visitId) where.visitId = visitId;

    const sheets = await prisma.oPSheet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true, visit: true },
    });

    return NextResponse.json({ sheets });
  } catch (e) {
    console.error('OP Sheets GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientMr, visitId, clinicalExamination, vitals, diagnosis, symptoms } = body;

    if (!patientMr || !visitId) {
      return NextResponse.json({ error: 'patientMr and visitId are required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const sheet = await prisma.oPSheet.create({
      data: {
        patientMr,
        visitId,
        clinicalExamination,
        vitals,
        diagnosis,
        symptoms,
      },
    });

    return NextResponse.json({ sheet }, { status: 201 });
  } catch (e) {
    console.error('OP Sheets POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
