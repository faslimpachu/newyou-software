'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useDashboardData } from './use-dashboard-data'

const chartConfig = {
  value: { label: 'Consultations' },
  general: { label: 'General', color: 'var(--chart-1)' },
  nutrition: { label: 'Nutrition', color: 'var(--chart-2)' },
  ayurcare: { label: 'Ayurcare', color: 'var(--chart-3)' },
  followup: { label: 'Follow-up', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function ConsultationPie() {
  const { data, loading } = useDashboardData(3000)
  const consultationTypes = data?.consultationTypes || []
  const total = consultationTypes.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <Card className="flex flex-col rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-base">Consultation Types</CardTitle>
          <CardDescription>Distribution across service lines this month</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="mx-auto h-[240px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-base">Consultation Types</CardTitle>
        <CardDescription>Distribution across service lines this month</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[240px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={consultationTypes}
              dataKey="value"
              nameKey="type"
              innerRadius={62}
              outerRadius={92}
              strokeWidth={4}
              stroke="var(--card)"
            >
              {consultationTypes.map((entry) => (
                <Cell key={entry.type} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-display text-2xl font-semibold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {consultationTypes.map((entry) => (
            <li key={entry.type} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-muted-foreground">{entry.type}</span>
              <span className="ml-auto font-medium text-foreground">{entry.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
