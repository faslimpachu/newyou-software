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
import { upcomingFollowups, type FollowupStatus } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'

const statusStyles: Record<FollowupStatus, string> = {
  Confirmed: 'bg-primary/10 text-primary',
  Pending: 'bg-chart-4/15 text-chart-4',
  Missed: 'bg-destructive/10 text-destructive',
}

export function FollowupTable() {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Upcoming Follow-ups</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          View all
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcomingFollowups.map((fu) => (
              <TableRow key={fu.id}>
                <TableCell className="pl-6">
                  <p className="text-sm font-medium text-foreground">{fu.patient}</p>
                  <p className="text-xs text-muted-foreground">{fu.department}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fu.doctor}</TableCell>
                <TableCell className="text-sm font-medium text-foreground">{fu.slot}</TableCell>
                <TableCell className="pr-6 text-right">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      statusStyles[fu.status],
                    )}
                  >
                    {fu.status}
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
