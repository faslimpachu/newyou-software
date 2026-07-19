import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMR } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          visits: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json({ patients, total, page, limit });
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

    if (!consultationType || !patientName || !parentName || !gender || !mobileNumber || !address || !district || !state || !pinCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json({ error: 'Mobile number must be exactly 10 digits' }, { status: 400 });
    }

    const existing = await prisma.patient.findUnique({
      where: { mobileNumber },
    });

    if (existing) {
      return NextResponse.json({ error: 'Mobile number already registered' }, { status: 409 });
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
