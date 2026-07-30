import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export async function GET(request: Request) {
  try {
    await requireRole(request, ['superadmin', 'admin'])
    const where: Record<string, unknown> = {}

    const doctorParam = new URL(request.url).searchParams.get('doctor')
    if (doctorParam) {
      where.doctor = doctorParam
    }

    const visits = await prisma.visit.findMany({
      where,
      select: {
        id: true,
        doctor: true,
        dietitian: true,
        appointmentDate: true,
        status: true,
        center: true,
        patient: {
          select: {
            consultationType: true,
            patientName: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    })

    const byDoctor = new Map<string, { name: string; total: number; nutrition: number; ayurcare: number }>()
    const byStatus = new Map<string, number>()

    for (const visit of visits) {
      const name = visit.doctor || visit.dietitian || 'Unassigned'
      const key = name.trim().toLowerCase()
      if (!byDoctor.has(key)) {
        byDoctor.set(key, { name, total: 0, nutrition: 0, ayurcare: 0 })
      }
      const entry = byDoctor.get(key)!
      entry.total += 1
      if (visit.patient.consultationType === 'NUTRITION') entry.nutrition += 1
      if (visit.patient.consultationType === 'AYURCARE') entry.ayurcare += 1

      const status = visit.status || 'Unknown'
      byStatus.set(status, (byStatus.get(status) || 0) + 1)
    }

    const doctorReport = Array.from(byDoctor.values()).sort((a, b) => b.total - a.total)

    return NextResponse.json({
      visits,
      doctorReport,
      statusBreakdown: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Reports consultation error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
