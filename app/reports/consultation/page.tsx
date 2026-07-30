'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Skeleton } from '@/components/ui/skeleton'

interface DoctorReport {
  name: string
  total: number
  nutrition: number
  ayurcare: number
}

interface ReportResponse {
  visits: {
    id: string
    doctor: string | null
    dietitian: string | null
    appointmentDate: string | null
    status: string | null
    center: string | null
    patient: {
      consultationType: string
      patientName: string
    }
  }[]
  doctorReport: DoctorReport[]
  statusBreakdown: { status: string; count: number }[]
}

const chartConfig = {
  nutrition: { label: 'Nutrition', color: 'var(--chart-2)' },
  ayurcare: { label: 'Ayurcare', color: 'var(--chart-3)' },
  total: { label: 'Total', color: 'var(--chart-1)' },
} satisfies ChartConfig

export default function ConsultationReportsPage() {
  const [data, setData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/reports/consultation')
        if (!res.ok) throw new Error('Failed to load report')
        const json = await res.json()
        if (mounted) setData(json)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load report')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.doctorReport.map((doctor) => ({
      name: doctor.name,
      nutrition: doctor.nutrition,
      ayurcare: doctor.ayurcare,
    }))
  }, [data])

  const totalConsultations = data?.doctorReport.reduce((sum, d) => sum + d.total, 0) ?? 0

  if (loading) {
    return (
      <DashboardShell>
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border/70 p-5 shadow-sm">
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardContent className="h-[420px]">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-[1600px]">
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  if (!data) return null

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Consultation Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Doctor-wise consultation summary and service mix
          </p>
        </div>

        <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Total Consultations</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {totalConsultations.toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Doctors / Dietitians</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {data.doctorReport.length}
            </p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Nutrition Visits</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {data.doctorReport.reduce((s, d) => s + d.nutrition, 0).toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Ayurcare Visits</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {data.doctorReport.reduce((s, d) => s + d.ayurcare, 0).toLocaleString('en-IN')}
            </p>
          </Card>
        </section>


        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base">Consultation Details</CardTitle>
            <CardDescription>Doctor / Dietitian-wise breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="pb-2 font-medium">Doctor / Dietitian</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Nutrition</th>
                    <th className="pb-2 font-medium text-right">Ayurcare</th>
                  </tr>
                </thead>
                <tbody>
                  {data.doctorReport.map((doctor) => (
                    <tr key={doctor.name} className="border-b border-border/60 last:border-0">
                      <td className="py-2 font-medium text-foreground">{doctor.name}</td>
                      <td className="py-2 text-right tabular-nums">{doctor.total.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-600">{doctor.nutrition.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right tabular-nums text-amber-600">{doctor.ayurcare.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base">Consultations by Doctor / Dietitian</CardTitle>
            <CardDescription>Total visits and service mix per provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[420px] w-full">
              <BarChart data={chartData} margin={{ left: -12, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  className="text-xs"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="nutrition" fill="var(--color-nutrition)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="ayurcare" fill="var(--color-ayurcare)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        
      </div>
    </DashboardShell>
  )
}
