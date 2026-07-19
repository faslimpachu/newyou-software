import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { PatientProfile } from '@/components/patients/patient-profile'
import { prisma } from '@/lib/prisma'
import { centerNameFromConsultationType } from '@/lib/patient-api'

export const dynamic = 'force-dynamic'

export default async function PatientProfilePage({ params, searchParams }: { params: Promise<{ mr: string }>; searchParams?: Promise<{ new?: string }> }) {
  const { mr } = await params
  const query = searchParams ? await searchParams : undefined

  const patient = await prisma.patient.findUnique({
    where: { mr },
    include: {
      visits: { orderBy: { createdAt: 'desc' } },
    },
  })

  const center = patient ? centerNameFromConsultationType(patient.consultationType) : 'Nutrition Center'

  return <DashboardShell><PatientProfile patient={null} center={center} generatedMR={mr} justRegistered={query?.new === '1'} /></DashboardShell>
}
