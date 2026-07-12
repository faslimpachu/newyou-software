import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { PatientProfile } from '@/components/patients/patient-profile'
import { existingPatients, centersByPrefix } from '@/lib/registration-data'

export function generateStaticParams() {
  return existingPatients.map((p) => ({ mr: p.mr }))
}

export default function PatientProfilePage({ params }: { params: { mr: string } }) {
  'use client'
  const patient = existingPatients.find((p) => p.mr === params.mr) || null
  const center = patient ? centersByPrefix[patient.mr.slice(0, 2)] || 'Nutrition Center' : 'Nutrition Center'
  return <DashboardShell><PatientProfile patient={patient} center={center} generatedMR={params.mr} /></DashboardShell>
}
