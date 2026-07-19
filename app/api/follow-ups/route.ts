import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';

    const where: Record<string, unknown> = {};
    if (patientMr) where.patientMr = patientMr;

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });

    return NextResponse.json({ followUps });
  } catch (e) {
    console.error('Follow-ups GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientMr, program, reviewDate, dueDate, assignedTo, priority, status, remarks } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'patientMr is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: patientMr } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const followUp = await prisma.followUp.create({
      data: {
        patientMr,
        program,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo,
        priority,
        status,
        remarks,
      },
    });

    return NextResponse.json({ followUp }, { status: 201 });
  } catch (e) {
    console.error('Follow-ups POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, program, reviewDate, dueDate, assignedTo, priority, status, remarks } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (program !== undefined) data.program = program;
    if (reviewDate !== undefined) data.reviewDate = reviewDate ? new Date(reviewDate) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (remarks !== undefined) data.remarks = remarks;

    const followUp = await prisma.followUp.update({
      where: { id },
      data,
    });

    return NextResponse.json({ followUp });
  } catch (e) {
    console.error('Follow-ups PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
