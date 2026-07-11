import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { StatCards } from '@/components/dashboard/stat-cards'
import { RegistrationChart } from '@/components/dashboard/registration-chart'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { ConsultationPie } from '@/components/dashboard/consultation-pie'
import { RecentRegistrationsTable } from '@/components/dashboard/recent-registrations-table'
import { FollowupTable } from '@/components/dashboard/followup-table'
import { BillingTable } from '@/components/dashboard/billing-table'

export default function Page() {
  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {/* Page heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground text-balance">
              Dashboard Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Wednesday, 11 July 2026 · Real-time hospital activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="size-4" />
              Export
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              New Registration
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <StatCards />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RegistrationChart />
          </div>
          <ConsultationPie />
        </div>

        <RevenueChart />

        {/* Tables */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RecentRegistrationsTable />
          <FollowupTable />
        </div>

        <BillingTable />
      </div>
    </DashboardShell>
  )
}
