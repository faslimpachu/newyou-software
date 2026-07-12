import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMR } from '@/lib/api-helpers';

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
      doctor,
      dietitian,
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

    const centerType = consultationType === 'NUTRITION' ? 'NUTRITION' : 'AYURCARE';
    const mr = await generateMR(centerType);

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

    await prisma.visit.create({
      data: {
        patientMr: patient.mr,
        doctor: doctor || null,
        dietitian: dietitian || null,
        status: 'Waiting',
      },
    });

    await prisma.patient.update({
      where: { mr: patient.mr },
      data: { status: 'Visited' },
    });

    return NextResponse.json({ mr, patient }, { status: 201 });
  } catch (e) {
    console.error('Register error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
