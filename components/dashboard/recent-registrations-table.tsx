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
import { recentRegistrations, type RegStatus } from '@/lib/dashboard-data'

const statusVariant: Record<RegStatus, 'default' | 'secondary' | 'outline'> = {
  New: 'default',
  Returning: 'secondary',
  Referral: 'outline',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

export function RecentRegistrationsTable() {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Recent Registrations</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          View all
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Patient</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRegistrations.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                        {initials(reg.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-foreground">{reg.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.age}y · {reg.gender} · {reg.id}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{reg.department}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[reg.status]}>{reg.status}</Badge>
                </TableCell>
                <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                  {reg.time}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
