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

function money(value?: number | null) {
  return `Rs. ${(value || 0).toLocaleString('en-IN')}`
}

function statusStyle(status?: string | null) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'paid') return 'bg-primary/10 text-primary'
  if (normalized === 'overdue' || normalized === 'cancelled') return 'bg-destructive/10 text-destructive'
  return 'bg-chart-4/15 text-chart-4'
}

export function BillingTable() {
  const { data, loading } = useDashboardData(3000)
  const rows = data?.recentBilling ?? []

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Recent Billing</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          Last 10
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Invoice</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Center / Bill Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="pl-6">
                  <p className="text-sm font-medium text-foreground">{bill.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">#{bill.id}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{bill.patientName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{bill.patientMrNumber}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{bill.center} / {bill.billType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{bill.invoiceDate}</TableCell>
                <TableCell className="text-sm font-semibold text-foreground">{money(bill.grandTotal)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{money(bill.paid)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{money(bill.balance)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{bill.paymentMethod || 'Not recorded'}</TableCell>
                <TableCell className="pr-6 text-right">
                  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', statusStyle(bill.status))}>
                    {bill.status || 'Pending'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={9}>No invoices found.</TableCell></TableRow>
            )}
            {loading && rows.length === 0 && (
              <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={9}>Loading billing records...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
