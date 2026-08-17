'use client'

import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { History } from 'lucide-react'

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

  const loadBatches = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('expiryStatus', statusFilter.toLowerCase())

      const res = await fetch(`/api/batches?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load batches')
      const data = await res.json()
      setBatches(data.batches || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

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

  const filteredCounts = {
    all: batches.length,
    expired: batches.filter((b) => b.status === 'EXPIRED').length,
    expiringSoon: batches.filter((b) => b.status === 'EXPIRING_SOON').length,
    ok: batches.filter((b) => b.status === 'OK').length,
    noExpiry: batches.filter((b) => b.status === 'NO_EXPIRY').length,
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Batches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Batch-level inventory tracking and expiry monitoring
          </p>
        </div>

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
                  { key: 'ALL', label: 'All', count: filteredCounts.all },
                  { key: 'EXPIRED', label: 'Expired', count: filteredCounts.expired },
                  { key: 'EXPIRING_SOON', label: 'Expiring Soon', count: filteredCounts.expiringSoon },
                  { key: 'OK', label: 'OK', count: filteredCounts.ok },
                  { key: 'NO_EXPIRY', label: 'No Expiry', count: filteredCounts.noExpiry },
                ] as { key: ExpiryFilter; label: string; count: number }[]).map((tab) => (
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                      {tab.count}
                    </span>
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
              {batches.length} batch(es) found
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
      </div>
    </DashboardShell>
  )
}

function cn(...classes: (string | boolean | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
