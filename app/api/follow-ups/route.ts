import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientMr = url.searchParams.get('patientMr') || '';
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const reviewDateFrom = url.searchParams.get('reviewDateFrom') || '';
    const reviewDateTo = url.searchParams.get('reviewDateTo') || '';
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const hasPagination = pageParam !== null || limitParam !== null;
    const page = hasPagination ? Math.max(1, parseInt(pageParam || '1', 10) || 1) : 0;
    const limit = hasPagination ? Math.max(1, parseInt(limitParam || '20', 10) || 20) : 0;
    const skip = hasPagination ? (page - 1) * limit : 0;

    const where: Prisma.FollowUpWhereInput = {};
    if (patientMr) where.patientMr = patientMr;
    if (search) {
      where.OR = [
        { patientMr: { contains: search } },
        { program: { contains: search } },
        { assignedTo: { contains: search } },
        { priority: { contains: search } },
        { status: { contains: search } },
        { remarks: { contains: search } },
        {
          patient: {
            is: {
              OR: [
                { patientName: { contains: search } },
                { mobileNumber: { contains: search } },
                { address: { contains: search } },
                { district: { contains: search } },
              ],
            },
          },
        },
      ];
    }
    if (status) {
      where.status = status
    }
    if (reviewDateFrom || reviewDateTo) {
      where.reviewDate = {}
      if (reviewDateFrom) {
        where.reviewDate.gte = new Date(reviewDateFrom)
      }
      if (reviewDateTo) {
        const toDate = new Date(reviewDateTo)
        toDate.setHours(23, 59, 59, 999)
        where.reviewDate.lte = toDate
      }
    }

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        ...(hasPagination ? { skip, take: limit } : {}),
        orderBy: { reviewDate: 'desc' },
        include: { patient: true },
      }),
      prisma.followUp.count({ where }),
    ]);

    return hasPagination
      ? NextResponse.json({ followUps, total, page, limit, totalPages: Math.ceil(total / limit) })
      : NextResponse.json({ followUps, total });
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
