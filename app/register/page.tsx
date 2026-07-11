import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { PatientWorkspace } from '@/components/patients/patient-workspace'

export default function RegistrationPage() {
  return (
    <DashboardShell>
      <PatientWorkspace />
    </DashboardShell>
  )
}
