'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useDashboardData } from './use-dashboard-data'

const fmt = (n: number) => {
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString('en-IN')
}

export function StatCards() {
  const { data, loading } = useDashboardData(3000)

  if (loading || !data) {
    return (
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3 rounded-2xl border-border/70 p-5 shadow-sm">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </Card>
        ))}
      </section>
    )
  }

  const stats = [
    { key: 'registrations', label: "Today's Registrations", value: fmt(data.stats.registrations), delta: '', trend: 'up' as const, icon: 'CalendarDays', hint: 'vs. yesterday' },
    { key: 'visits', label: "Today's Visits", value: fmt(data.stats.visits), delta: '', trend: 'up' as const, icon: 'Activity', hint: 'vs. yesterday' },
    { key: 'total-patients', label: 'Total Patients', value: fmt(data.stats.totalPatients), delta: '', trend: 'up' as const, icon: 'Users', hint: 'all time' },
    { key: 'nutrition', label: 'Nutrition Patients', value: fmt(data.stats.nutritionPatients), delta: '', trend: 'up' as const, icon: 'Leaf', hint: 'active plans' },
    { key: 'ayurcare', label: 'Ayurcare Patients', value: fmt(data.stats.ayurcarePatients), delta: '', trend: 'down' as const, icon: 'Stethoscope', hint: 'active plans' },
    { key: 'revenue', label: 'Revenue Today', value: `₹${fmt(data.stats.revenueToday)}`, delta: '', trend: 'up' as const, icon: 'IndianRupee', hint: 'vs. yesterday' },
    { key: 'pending-bills', label: 'Pending Bills', value: fmt(data.stats.pendingBills), delta: '', trend: 'down' as const, icon: 'Receipt', hint: 'awaiting payment' },
  ]

  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const isUp = stat.trend === 'up'
        return (
          <Card
            key={stat.key}
            className="flex flex-col gap-3 rounded-2xl border-border/70 p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                {stat.icon === 'CalendarDays' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                {stat.icon === 'Activity' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                {stat.icon === 'Users' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                {stat.icon === 'Leaf' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.6C14.5 4 21 4.5 21 11.5c0 4-2.5 7-5 9.5-1 1-2.5 1.5-5 1.5Z"/><path d="M11 20a7 7 0 0 1-4-8.5C7.5 7 2 9 2 14.5 2 18.5 5 22 9 23c1 .5 2.5.5 2.5-.5Z"/></svg>}
                {stat.icon === 'Stethoscope' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2.6V5a2 2 0 0 0 2 2v.5a2.5 2.5 0 0 1 5 0V7a2 2 0 0 0 2-2v-2.4a.3.3 0 1 0-.6 0V7a2 2 0 0 1-2 2v.5a2.5 2.5 0 0 1-5 0V7a2 2 0 0 0-2-2V2.6Z"/><path d="M9 14a5 5 0 0 0 10 0"/></svg>}
                {stat.icon === 'IndianRupee' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>}
                {stat.icon === 'Receipt' && <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18l-2 13-2-13H3"/><path d="M3 3l2 13"/></svg>}
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                  isUp ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
                )}
              >
                {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {stat.delta}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </div>
          </Card>
        )
      })}
    </section>
  )
}
