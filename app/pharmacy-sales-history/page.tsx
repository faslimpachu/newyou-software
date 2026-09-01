'use client'

import { useCallback, useEffect, useRef, useState, Fragment } from 'react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Printer, ChevronDown, ChevronRight } from 'lucide-react'
import { printReceipt, type SaleReceipt } from '@/lib/pharmacy-receipt'

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK'] as const

interface SaleItem {
  id: string
  saleNumber: string
  productId: string
  productName: string
  batchId: string
  batchNumber: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

interface PharmacySaleSummary {
  saleGroup: string
  saleNumber: string
  customerName: string
  customerPhone: string | null
  patientMr: string | null
  paymentMethod: string
  paymentReference: string | null
  createdAt: string
  itemsCount: number
  totalAmount: number
  items: SaleItem[]
}

interface SalesTotals {
  totalSaleAmount: number
  todaySaleAmount: number
}

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function PharmacySalesHistoryPage() {
  const [sales, setSales] = useState<PharmacySaleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [salesTotals, setSalesTotals] = useState<SalesTotals>({
    totalSaleAmount: 0,
    todaySaleAmount: 0,
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)

  const loadTotals = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy-sales?summary=true')
      if (!res.ok) throw new Error('Failed to load sales totals')
      const data = await res.json()
      setSalesTotals({
        totalSaleAmount: Number(data.totalSaleAmount || 0),
        todaySaleAmount: Number(data.todaySaleAmount || 0),
      })
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadSales = useCallback(
    async (pageNum = 1, showLoading = true) => {
      if (!showLoading && inFlightRef.current) return

      const requestId = ++requestIdRef.current
      inFlightRef.current = true
      if (showLoading) setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.search) params.set('search', filters.search)
        if (filters.paymentMethod)
          params.set('paymentMethod', filters.paymentMethod)
        if (filters.startDate) params.set('startDate', filters.startDate)
        if (filters.endDate) params.set('endDate', filters.endDate)
        params.set('page', String(pageNum))
        params.set('pageSize', String(pageSize))

        const res = await fetch(`/api/pharmacy-sales?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load sales')
        const data = await res.json()
        if (requestId !== requestIdRef.current) return
        setSales(data.sales || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
        setPage(data.page || pageNum)
      } catch (e) {
        if (requestId !== requestIdRef.current) return
        if (showLoading) {
          console.error(e)
        }
      } finally {
        if (requestId === requestIdRef.current) {
          inFlightRef.current = false
          if (showLoading) setLoading(false)
        }
      }
    },
    [filters, pageSize],
  )

  useEffect(() => {
    void loadSales(1)
  }, [loadSales])

  useEffect(() => {
    void loadTotals()
  }, [loadTotals])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadSales(page, false)
      void loadTotals()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [loadSales, loadTotals, page])

  const handlePrevPage = () => {
    if (page > 1) loadSales(page - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages) loadSales(page + 1)
  }

  const clearFilters = () => {
    setFilters({ search: '', paymentMethod: '', startDate: '', endDate: '' })
  }

  const toggleExpand = (saleGroup: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(saleGroup)) next.delete(saleGroup)
      else next.add(saleGroup)
      return next
    })
  }

  const reprint = (sale: PharmacySaleSummary) => {
    const receipt: SaleReceipt = {
      saleGroup: sale.saleGroup,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      lines: sale.items.map((it) => ({
        id: it.id,
        saleNumber: it.saleNumber,
        productId: it.productId,
        productName: it.productName,
        batchId: it.batchId,
        batchNumber: it.batchNumber,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalAmount: it.totalAmount,
      })),
      totalAmount: sale.totalAmount,
    }
    printReceipt(receipt)
  }

  const customerLabel = (sale: PharmacySaleSummary) =>
    sale.patientMr
      ? `${sale.customerName} (${sale.patientMr})`
      : sale.customerName

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Pharmacy Sales History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse pharmacy sales grouped by sale, reprint receipts, and filter
            by date, MR, or payment
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sale</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {money(salesTotals.totalSaleAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today Sale</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {money(salesTotals.todaySaleAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="search">MR Number / Name</Label>
                <Input
                  id="search"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="MR000003 or patient name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment</Label>
                <Select
                  value={filters.paymentMethod || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, paymentMethod: value || '' })
                  }
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="All Payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Payments</SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales</CardTitle>
            <CardDescription>
              {total > 0
                ? `Page ${page} of ${totalPages} (${total} total)`
                : `${sales.length} sale(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Sale No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer / MR</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Payment Reference</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const isOpen = expanded.has(sale.saleGroup)
                    return (
                      <Fragment key={sale.saleGroup}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={
                                isOpen ? 'Collapse sale' : 'Expand sale'
                              }
                              onClick={() => toggleExpand(sale.saleGroup)}
                            >
                              {isOpen ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {sale.saleGroup}
                          </TableCell>
                          <TableCell>
                            {new Date(sale.createdAt).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>{customerLabel(sale)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {sale.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>{sale.paymentReference || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sale.itemsCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(sale.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reprint(sale)}
                            >
                              <Printer className="mr-2 size-4" />
                              Reprint
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow
                            key={`${sale.saleGroup}-items`}
                            className="bg-muted/40"
                          >
                            <TableCell colSpan={9} className="p-0">
                              <div className="px-4 py-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Batch</TableHead>
                                      <TableHead className="text-right">
                                        Qty
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Rate
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Amount
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.productName}
                                        </TableCell>
                                        <TableCell>
                                          {item.batchNumber}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                          {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                          {money(item.unitPrice)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                          {money(item.totalAmount)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground"
                      >
                        No sales found
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
