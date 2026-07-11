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
import { recentBilling, type BillStatus } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'

const statusStyles: Record<BillStatus, string> = {
  Paid: 'bg-primary/10 text-primary',
  Pending: 'bg-chart-4/15 text-chart-4',
  Overdue: 'bg-destructive/10 text-destructive',
}

export function BillingTable() {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Recent Billing</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          View all
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Invoice</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentBilling.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="pl-6">
                  <p className="text-sm font-medium text-foreground">{bill.id}</p>
                  <p className="text-xs text-muted-foreground">{bill.patient}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{bill.service}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{bill.method}</TableCell>
                <TableCell className="text-sm font-semibold text-foreground">{bill.amount}</TableCell>
                <TableCell className="pr-6 text-right">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      statusStyles[bill.status],
                    )}
                  >
                    {bill.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
