import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMR } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const pageParam = url.searchParams.get('page')
    const limitParam = url.searchParams.get('limit')
    const hasPagination = pageParam !== null || limitParam !== null
    const page = hasPagination ? parseInt(pageParam || '1') : 0
    const limit = hasPagination ? parseInt(limitParam || '10') : 0
    const skip = hasPagination ? (page - 1) * limit : 0

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { patientName: { contains: search } },
        { mobileNumber: { contains: search } },
        { mr: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        ...(hasPagination ? { skip, take: limit } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          visits: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.patient.count({ where }),
    ])

    return hasPagination
      ? NextResponse.json({ patients, total, page, limit })
      : NextResponse.json({ patients, total: patients.length })
  } catch (e) {
    console.error('Patients GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      consultationType,
      patientName,
      parentName,
      gender,
      mobileNumber,
      address,
      district,
      state,
      pinCode,
      dob,
      age,
      bloodGroup,
    } = body;

    if (!consultationType || !patientName || !gender || !mobileNumber || !address || !district || !state || !pinCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json({ error: 'Mobile number must be exactly 10 digits' }, { status: 400 });
    }

    const mr = await generateMR();

    const patient = await prisma.patient.create({
      data: {
        mr,
        consultationType,
        patientName,
        parentName,
        gender,
        mobileNumber,
        address,
        district,
        state,
        pinCode,
        dob: dob ? new Date(dob) : undefined,
        age: age ? Number(age) : undefined,
        bloodGroup,
      },
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (e) {
    console.error('Patients POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
