'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { History, HelpCircle, Info } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
}

interface InventoryTransaction {
  id: string
  productId: string
  type: string
  quantity: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
  product: { id: string; name: string; sku: string | null }
  reference: string | null
}

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    productId: '',
    type: '',
    startDate: '',
    endDate: '',
  })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  const loadTransactions = async (pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.productId) params.set('productId', filters.productId)
      if (filters.type) params.set('type', filters.type)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      params.set('page', String(pageNum))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/inventory-transactions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load transactions')
      const data = await res.json()
      setTransactions(data.transactions)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(data.page || pageNum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products?active=true')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    loadTransactions(1)
  }, [filters])

  const handlePrevPage = () => {
    if (page > 1) {
      loadTransactions(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadTransactions(page + 1)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return { label: 'Purchase', variant: 'default' as const }
      case 'SALE':
        return { label: 'Sale', variant: 'secondary' as const }
      case 'ADJUSTMENT_IN':
        return { label: 'Adjustment In', variant: 'outline' as const }
      case 'ADJUSTMENT_OUT':
        return { label: 'Adjustment Out', variant: 'destructive' as const }
      case 'RETURN_OUT':
        return { label: 'Return', variant: 'destructive' as const }
      case 'EXPIRED':
        return { label: 'Expired', variant: 'destructive' as const }
      case 'DAMAGED':
        return { label: 'Damaged', variant: 'destructive' as const }
      case 'LOST':
        return { label: 'Lost', variant: 'destructive' as const }
      default:
        return { label: type, variant: 'outline' as const }
    }
  }

  const clearFilters = () => {
    setFilters({ productId: '', type: '', startDate: '', endDate: '' })
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Stock History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View all inventory transactions and stock movements
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
                How Stock History Works
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Reading Transactions</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Every stock change creates a transaction record</li>
                  <li>Positive quantity = stock increase</li>
                  <li>Negative quantity = stock decrease</li>
                  <li>Reference shows source document or manual note</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Transaction Types</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Purchase: from purchase invoices</li>
                  <li>Sale: from billing invoices</li>
                  <li>Adjustment In/Out: manual corrections</li>
                  <li>Return/Expired/Damaged/Lost: other movements</li>
                </ul>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-blue-900">Filtering Tips</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Filter by product to see all movements for one item</li>
                  <li>Use date range to reconcile monthly stock</li>
                  <li>Type filter helps isolate purchases vs sales</li>
                  <li>This page is read-only — use the appropriate module to create transactions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="productId">Product</Label>
                <Select value={filters.productId || ''} onValueChange={(value) => setFilters({ ...filters, productId: value || '' })}>
                  <SelectTrigger id="productId">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku ? `(${product.sku})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={filters.type || ''} onValueChange={(value) => setFilters({ ...filters, type: value || '' })}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="ADJUSTMENT_IN">Adjustment In</SelectItem>
                    <SelectItem value="ADJUSTMENT_OUT">Adjustment Out</SelectItem>
                    <SelectItem value="RETURN_OUT">Return</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Transactions</CardTitle>
            <CardDescription>
              {total > 0 ? `Page ${page} of ${totalPages} (${total} total)` : `${transactions.length} transaction(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const typeInfo = getTypeBadge(transaction.type)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.product.name}
                          {transaction.product.sku && <span className="ml-2 text-xs text-muted-foreground">({transaction.product.sku})</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {transaction.reference || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{transaction.notes || '-'}</TableCell>
                        <TableCell>{new Date(transaction.createdAt).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )
                  })}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found
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
