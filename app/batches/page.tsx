'use client'

import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { History, HelpCircle, Info } from 'lucide-react'

type Batch = {
  id: string
  productId: string
  product?: {
    id: string
    name: string
    sku: string | null
    unit: string | null
  }
  batchNumber: string
  expiryDate: string | null
  quantity: number
  avgCost: number | null
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'OK' | 'NO_EXPIRY'
  receipts?: {
    id: string
    supplierName: string
    purchaseInvoiceId?: string | null
    remainingQuantity: number
    purchaseRate: number
    createdAt: string
  }[]
}

type ExpiryFilter = 'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'OK' | 'NO_EXPIRY'

const emptyBatch = {
  batchNumber: '',
  expiryDate: '',
  quantity: 0,
  avgCost: 0,
  status: 'OK' as const,
  receipts: [] as any[],
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpiryFilter>('ALL')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  const loadBatches = useCallback(async (pageNum = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('expiryStatus', statusFilter.toLowerCase())
      params.set('page', String(pageNum))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/batches?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load batches')
      const data = await res.json()
      setBatches(data.batches || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(data.page || pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, pageSize])

  useEffect(() => {
    loadBatches(1)
  }, [loadBatches])

  const handlePrevPage = () => {
    if (page > 1) {
      loadBatches(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadBatches(page + 1)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return { label: 'Expired', variant: 'destructive' as const }
      case 'EXPIRING_SOON':
        return { label: 'Expiring Soon', variant: 'secondary' as const }
      case 'OK':
        return { label: 'OK', variant: 'default' as const }
      case 'NO_EXPIRY':
        return { label: 'No Expiry', variant: 'outline' as const }
      default:
        return { label: status, variant: 'outline' as const }
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Batches
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Batch-level inventory tracking and expiry monitoring
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="mr-2 size-4" />
              How to Use
            </Button>
          </div>
        </div>

        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="size-4 text-blue-600" />
                How Batches &amp; Expiry Work
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Batch Creation</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Batches are created automatically from purchase invoices</li>
                  <li>Each batch tracks quantity, expiry, and supplier</li>
                  <li>Batch number is optional but useful for medicines</li>
                  <li>Receipt layers preserve actual purchase cost per batch</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Expiry Monitoring</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>EXPIRED: past expiry date — should be written off</li>
                  <li>EXPIRING_SOON: within 30 days — consider sale or write-off</li>
                  <li>OK: valid and not expiring soon</li>
                  <li>NO_EXPIRY: no expiry tracking needed</li>
                </ul>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-blue-900">Stock &amp; Cost Behavior</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Batch quantity decreases only through sales or adjustments</li>
                  <li>Average cost is weighted by receipt quantities</li>
                  <li>Use <strong>Inventory Adjustment &gt; Decrease</strong> to write off expired stock</li>
                  <li>FIFO is used when reducing stock from multiple receipts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Search by batch number, product name, or supplier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Batch number, product, supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'ALL', label: 'All' },
                  { key: 'EXPIRED', label: 'Expired' },
                  { key: 'EXPIRING_SOON', label: 'Expiring Soon' },
                  { key: 'OK', label: 'OK' },
                  { key: 'NO_EXPIRY', label: 'No Expiry' },
                ] as { key: ExpiryFilter; label: string }[]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      statusFilter === tab.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Batches</CardTitle>
            <CardDescription>
              {total > 0 ? `Page ${page} of ${totalPages} (${total} total)` : `${batches.length} batch(es) found`}
              {statusFilter !== 'ALL' && ` · filtered by ${statusFilter.replace('_', ' ').toLowerCase()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading batches...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const statusInfo = getStatusBadge(batch.status)
                    const supplierNames = [
                      ...new Set((batch.receipts || []).map((r) => r.supplierName).filter(Boolean)),
                    ]

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">
                          {batch.product?.name || '-'}
                          {batch.product?.sku && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({batch.product.sku})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{batch.batchNumber}</TableCell>
                        <TableCell>
                          {supplierNames.length > 0 ? supplierNames.join(', ') : '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{batch.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          ₹{batch.avgCost?.toLocaleString('en-IN') || '-'}
                        </TableCell>
                        <TableCell>
                          {batch.expiryDate
                            ? new Date(batch.expiryDate).toLocaleDateString('en-IN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {batches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No batches found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function cn(...classes: (string | boolean | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
