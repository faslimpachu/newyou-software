'use client'

import { ArrowDownRight, ArrowUpRight, CalendarClock, CalendarDays, Activity, Users, Leaf, Stethoscope, IndianRupee, Receipt, Package, Truck, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useDashboardData } from './use-dashboard-data'
import { DashboardPurchaseStats } from './use-dashboard-data'

const fmt = (n: number | undefined | null) => {
  const value = n ?? 0
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('en-IN')
}

export function StatCards() {
  const { data, loading } = useDashboardData(3000)

  if (loading || !data) {
    return (
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 11 }).map((_, i) => (
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

  const purchase: DashboardPurchaseStats = data.purchase || {
    totalSuppliers: 0,
    lowStockItems: 0,
    todayPurchase: 0,
    monthlyPurchase: 0,
    pendingPayments: 0,
  }

  const stats = [
    { key: 'registrations', label: "Today's Registrations", value: fmt(data.stats.registrations), trend: 'up' as const, icon: CalendarDays, hint: 'vs. yesterday' },
    { key: 'visits', label: "Today's Visits", value: fmt(data.stats.visits), trend: 'up' as const, icon: Activity, hint: 'vs. yesterday' },
    { key: 'total-patients', label: 'Total Patients', value: fmt(data.stats.totalPatients), trend: 'up' as const, icon: Users, hint: 'all time' },
    { key: 'nutrition', label: 'Nutrition Patients', value: fmt(data.stats.nutritionPatients), trend: 'up' as const, icon: Leaf, hint: 'active plans' },
    { key: 'ayurcare', label: 'Ayurcare Patients', value: fmt(data.stats.ayurcarePatients), trend: 'down' as const, icon: Stethoscope, hint: 'active plans' },
    { key: 'revenue', label: 'Revenue Today', value: `₹${fmt(data.stats.revenueToday)}`, trend: 'up' as const, icon: IndianRupee, hint: 'vs. yesterday' },
    { key: 'pending-bills', label: 'Cash Collected', value: fmt(data.stats.collectedRevenue), trend: 'up' as const, icon: Receipt, hint: 'total collected' },
    { key: 'followup', label: 'Follow-up Today', value: fmt(data.stats.followupToday), trend: 'up' as const, icon: CalendarClock, hint: 'scheduled' },
    { key: 'suppliers', label: 'Total Suppliers', value: fmt(purchase.totalSuppliers), trend: 'up' as const, icon: Truck, hint: 'active' },
    { key: 'low-stock', label: 'Low Stock Items', value: fmt(purchase.lowStockItems), trend: 'down' as const, icon: Package, hint: 'needs reorder' },
    { key: 'pending-payments', label: 'Pending Payments', value: `₹${fmt(purchase.pendingPayments)}`, trend: 'down' as const, icon: Wallet, hint: 'outstanding' },
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
                {stat.icon === CalendarDays && <CalendarDays className="size-5" />}
                {stat.icon === Activity && <Activity className="size-5" />}
                {stat.icon === Users && <Users className="size-5" />}
                {stat.icon === Leaf && <Leaf className="size-5" />}
                {stat.icon === Stethoscope && <Stethoscope className="size-5" />}
                {stat.icon === IndianRupee && <IndianRupee className="size-5" />}
                {stat.icon === Receipt && <Receipt className="size-5" />}
                {stat.icon === CalendarClock && <CalendarClock className="size-5" />}
                {stat.icon === Truck && <Truck className="size-5" />}
                {stat.icon === Package && <Package className="size-5" />}
                {stat.icon === Wallet && <Wallet className="size-5" />}
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
