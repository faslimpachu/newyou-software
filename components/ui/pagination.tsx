import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null
  const prev = () => onChange(Math.max(1, page - 1))
  const next = () => onChange(Math.min(totalPages, page + 1))
  return <div className={cn('flex items-center justify-between gap-2', className)}><p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-1"><Button variant="outline" size="sm" onClick={prev} disabled={page === 1}>Previous</Button>{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => onChange(p)}>{p}</Button>)}<Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}>Next</Button></div></div>
}
