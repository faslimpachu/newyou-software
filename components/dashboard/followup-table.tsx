'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useDashboardData } from './use-dashboard-data'

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusStyle(status?: string | null) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed') return 'bg-primary/10 text-primary'
  if (normalized === 'cancelled' || normalized === 'missed') return 'bg-destructive/10 text-destructive'
  return 'bg-chart-4/15 text-chart-4'
}

export function FollowupTable() {
  const { data, loading } = useDashboardData(3000)
  const rows = data?.upcomingFollowUps ?? []

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Upcoming Follow-ups</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          Last 10
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Patient</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Review Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((fu) => (
              <TableRow key={fu.id}>
                <TableCell className="pl-6">
                  <p className="text-sm font-medium text-foreground">{fu.patient?.patientName || 'Unknown patient'}</p>
                  <p className="text-xs text-muted-foreground">{fu.patientMr} / {fu.patient?.mobileNumber || 'No phone'}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fu.program || 'Not recorded'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(fu.reviewDate)}</TableCell>
                <TableCell className="text-sm font-medium text-foreground">{formatDate(fu.dueDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fu.assignedTo || 'Unassigned'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fu.priority || 'Medium'}</TableCell>
                <TableCell className="pr-6 text-right">
                  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', statusStyle(fu.status))}>
                    {fu.status || 'Pending'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={7}>No follow-ups found.</TableCell></TableRow>
            )}
            {loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={7}>Loading follow-ups...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
