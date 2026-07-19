import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMR, generateVisitId } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      consultationType,
      patientName,
      parentName,
      gender,
      mobileNumber,
      email,
      address,
      district,
      state,
      pinCode,
      dob,
      age,
      bloodGroup,
      doctor,
      dietitian,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      allergies,
      conditions,
      medications,
      smoking,
      alcohol,
      exercise,
      diet,
    } = body;

    if (!consultationType || !patientName || !parentName || !gender || !mobileNumber || !address || !district || !state || !pinCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json({ error: 'Mobile number must be exactly 10 digits' }, { status: 400 });
    }

    const centerType = consultationType === 'NUTRITION' ? 'NUTRITION' : 'AYURCARE';
    const mr = await generateMR();
    const visitId = await generateVisitId(centerType);

    const patient = await prisma.patient.create({
      data: {
        mr,
        consultationType,
        patientName,
        parentName,
        gender,
        mobileNumber,
        email: email || undefined,
        address,
        district,
        state,
        pinCode,
        dob: dob ? new Date(dob) : undefined,
        age: age ? Number(age) : undefined,
        bloodGroup,
        emergencyContactName: emergencyName || undefined,
        emergencyContactPhone: emergencyPhone || undefined,
        emergencyContactRelation: emergencyRelation || undefined,
        allergies: allergies || undefined,
        conditions: conditions || undefined,
        medications: medications || undefined,
        smoking: smoking || undefined,
        alcohol: alcohol || undefined,
        exercise: exercise || undefined,
        diet: diet || undefined,
      },
    });

    await prisma.visit.create({
      data: {
        id: visitId,
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
