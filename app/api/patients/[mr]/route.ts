import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVisitId } from '@/lib/api-helpers';

export async function GET(request: NextRequest, context: { params: Promise<{ mr: string }> }) {
  try {
    const { mr } = await context.params;
    const patient = await prisma.patient.findUnique({
      where: { mr: decodeURIComponent(mr) },
      include: {
        visits: { orderBy: { createdAt: 'desc' } },
        opSheets: { orderBy: { createdAt: 'desc' }, include: { visit: true, prescription: true } },
        prescriptions: { orderBy: { createdAt: 'desc' }, include: { opSheet: { include: { visit: true } } } },
        nutritionAssessments: true,
        ayurcareTreatments: true,
        followUps: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
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
    const {
      status,
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
      consultationType,
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
      doctor,
      center,
    } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (patientName !== undefined) data.patientName = patientName;
    if (parentName !== undefined) data.parentName = parentName;
    if (gender !== undefined) data.gender = gender;
    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address;
    if (district !== undefined) data.district = district;
    if (state !== undefined) data.state = state;
    if (pinCode !== undefined) data.pinCode = pinCode;
    if (dob !== undefined) data.dob = dob ? new Date(dob) : undefined;
    if (age !== undefined) data.age = age ? Number(age) : undefined;
    if (bloodGroup !== undefined) data.bloodGroup = bloodGroup;
    if (consultationType !== undefined) data.consultationType = consultationType;
    if (emergencyName !== undefined) data.emergencyContactName = emergencyName;
    if (emergencyPhone !== undefined) data.emergencyContactPhone = emergencyPhone;
    if (emergencyRelation !== undefined) data.emergencyContactRelation = emergencyRelation;
    if (allergies !== undefined) data.allergies = allergies;
    if (conditions !== undefined) data.conditions = conditions;
    if (medications !== undefined) data.medications = medications;
    if (smoking !== undefined) data.smoking = smoking;
    if (alcohol !== undefined) data.alcohol = alcohol;
    if (exercise !== undefined) data.exercise = exercise;
    if (diet !== undefined) data.diet = diet;

    if (doctor !== undefined && doctor) {
      const centerType = center?.toLowerCase().includes('ayurcare') ? 'AYURCARE' : 'NUTRITION';
      const visitId = await generateVisitId(centerType);
      await prisma.visit.create({
        data: {
          id: visitId,
          patientMr: decodeURIComponent(mr),
          doctor: doctor || null,
          status: 'Visited',
        },
      });
    }

    const patient = await prisma.patient.update({
      where: { mr: decodeURIComponent(mr) },
      data,
      include: {
        visits: { orderBy: { createdAt: 'desc' } },
        opSheets: { orderBy: { createdAt: 'desc' }, include: { visit: true, prescription: true } },
        prescriptions: { orderBy: { createdAt: 'desc' }, include: { opSheet: { include: { visit: true } } } },
        nutritionAssessments: true,
        ayurcareTreatments: true,
        followUps: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
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
