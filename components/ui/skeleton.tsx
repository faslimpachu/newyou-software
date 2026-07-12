import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return <div className={cn('space-y-2', className)}>{Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />)}</div>
}
export function SkeletonCard({ rows = 5 }: { rows?: number }) {
  return <Card className="rounded-lg shadow-sm"><CardContent className="p-4"><SkeletonText lines={rows} /></CardContent></Card>
}
