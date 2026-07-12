import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;

    const assessments = await prisma.nutritionAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });

    return NextResponse.json({ assessments });
  } catch (e) {
    console.error('Nutrition GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientMr,
      assessmentDate,
      program,
      weight,
      bmi,
      bodyFat,
      dietPlan,
      observations,
      recommendations,
      notes,
      reviewDate,
      dietitian,
    } = body;

    if (!patientMr || !assessmentDate) {
      return NextResponse.json({ error: 'patientMr and assessmentDate are required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const assessment = await prisma.nutritionAssessment.create({
      data: {
        patientMr,
        assessmentDate: new Date(assessmentDate),
        program,
        weight: weight ? Number(weight) : undefined,
        bmi: bmi ? Number(bmi) : undefined,
        bodyFat: bodyFat ? Number(bodyFat) : undefined,
        dietPlan,
        observations,
        recommendations,
        notes,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        dietitian,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (e) {
    console.error('Nutrition POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
