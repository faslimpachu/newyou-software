import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: { params: Promise<{ mr: string }> }) {
  try {
    const { mr } = await context.params;
    const patient = await prisma.patient.findUnique({
      where: { mr: decodeURIComponent(mr) },
      include: {
        visits: true,
        opSheets: { include: { prescription: true } },
        nutritionAssessments: true,
        ayurcareTreatments: true,
        followUps: true,
        documents: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (e) {
    console.error('Patient GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ mr: string }> }) {
  try {
    const { mr } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const patient = await prisma.patient.update({
      where: { mr: decodeURIComponent(mr) },
      data: { status },
    });

    return NextResponse.json({ patient });
  } catch (e) {
    console.error('Patient PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ mr: string }> }) {
  try {
    const { mr } = await context.params;
    await prisma.patient.delete({
      where: { mr: decodeURIComponent(mr) },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Patient DELETE error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
