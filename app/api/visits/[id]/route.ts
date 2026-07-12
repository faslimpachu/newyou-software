import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, doctor, dietitian, appointmentDate, appointmentTimeSlot } = body;

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (doctor !== undefined) data.doctor = doctor;
    if (dietitian !== undefined) data.dietitian = dietitian;
    if (appointmentDate) data.appointmentDate = new Date(appointmentDate);
    if (appointmentTimeSlot !== undefined) data.appointmentTimeSlot = appointmentTimeSlot;

    const visit = await prisma.visit.update({
      where: { id: decodeURIComponent(id) },
      data,
    });

    return NextResponse.json({ visit });
  } catch (e) {
    console.error('Visit PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
