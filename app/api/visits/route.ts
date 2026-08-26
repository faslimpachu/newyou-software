import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVisitId } from '@/lib/api-helpers';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const status = url.searchParams.get('status') || '';
    const center = url.searchParams.get('center') || '';
    const search = url.searchParams.get('search') || '';
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const hasPagination = pageParam !== null || limitParam !== null;
    const page = hasPagination ? Math.max(1, parseInt(pageParam || '1', 10) || 1) : 0;
    const limit = hasPagination ? Math.max(1, parseInt(limitParam || '20', 10) || 20) : 0;
    const skip = hasPagination ? (page - 1) * limit : 0;

    const where: Prisma.VisitWhereInput = {};
    if (patientMr) {
      where.patientMr = patientMr;
    }
    if (status) {
      where.status = status;
    }
    if (center) {
      where.center = center;
    }
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { patientMr: { contains: search } },
        { doctor: { contains: search } },
        { dietitian: { contains: search } },
        { appointmentTimeSlot: { contains: search } },
        {
          patient: {
            is: {
              OR: [
                { patientName: { contains: search } },
                { mobileNumber: { contains: search } },
                { parentName: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        ...(hasPagination ? { skip, take: limit } : {}),
        orderBy: { createdAt: 'desc' },
        include: { patient: true },
      }),
      prisma.visit.count({ where }),
    ]);

    return hasPagination
      ? NextResponse.json({ visits, total, page, limit, totalPages: Math.ceil(total / limit) })
      : NextResponse.json({ visits, total });
  } catch (e) {
    console.error('Visits GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientMr, doctor, dietitian, appointmentDate, appointmentTimeSlot, center } = body;

    if (!patientMr) {
      return NextResponse.json({ error: 'Patient MR is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { mr: patientMr },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const centerType = center?.toLowerCase().includes('ayurcare') ? 'AYURCARE' : 'NUTRITION';
    const visitId = await generateVisitId(centerType);

    const visit = await prisma.visit.create({
      data: {
        id: visitId,
        patientMr,
        doctor: doctor || null,
        dietitian: dietitian || null,
        appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
        appointmentTimeSlot: appointmentTimeSlot || null,
        center: center || null,
        status: 'Waiting',
      },
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch (e) {
    console.error('Visits POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
