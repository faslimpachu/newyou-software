'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { useDashboardData } from './use-dashboard-data'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export function RecentRegistrationsTable() {
  const { data, loading } = useDashboardData(3000)
  const rows = data?.recentRegistrations ?? []

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Recent Registrations</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          Last 10
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Patient</TableHead>
              <TableHead>MR No.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="pr-6 text-right">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((reg) => (
              <TableRow key={reg.mr}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                        {initials(reg.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-foreground">{reg.patientName}</p>
                      <p className="text-xs text-muted-foreground">{reg.age || '-'}y / {reg.gender || '-'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{reg.mr}</TableCell>
                <TableCell><Badge variant="secondary">{reg.consultationType}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{reg.mobileNumber || 'Not recorded'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{[reg.district, reg.state].filter(Boolean).join(', ') || 'Not recorded'}</TableCell>
                <TableCell className="pr-6 text-right text-sm text-muted-foreground">{formatDateTime(reg.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={6}>No registrations found.</TableCell></TableRow>
            )}
            {loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={6}>Loading registrations...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
