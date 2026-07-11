'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { monthlyRegistrations } from '@/lib/dashboard-data'

const chartConfig = {
  registrations: { label: 'Registrations', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function RegistrationChart() {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-base">Monthly Registrations</CardTitle>
        <CardDescription>New patient registrations over the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={monthlyRegistrations} margin={{ left: -12, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} maxBarSize={38} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
