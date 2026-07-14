import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { PatientProfile } from '@/components/patients/patient-profile'
import { centerNameFromMr } from '@/lib/patient-api'

export const dynamic = 'force-dynamic'

export default function PatientProfilePage({ params, searchParams }: { params: { mr: string }; searchParams?: { new?: string } }) {
  const center = centerNameFromMr(params.mr)
  return <DashboardShell><PatientProfile patient={null} center={center} generatedMR={params.mr} justRegistered={searchParams?.new === '1'} /></DashboardShell>
}
