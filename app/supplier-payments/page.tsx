'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Plus, IndianRupee, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface Supplier {
  id: string
  supplierName: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  grandTotal: number
  paid: number
  balance: number
  status: string
  dueDate: string | null
}

interface Payment {
  id: string
  paymentNumber: string
  supplierId: string
  invoiceId: string | null
  amount: number
  paymentDate: string
  paymentMode: string | null
  reference: string | null
  notes: string | null
  createdAt: string
  supplier: { id: string; supplierName: string }
  invoice: { id: string; invoiceNumber: string; status: string } | null
}

const emptyPayment = {
  supplierId: '',
  invoiceId: '',
  amount: 0,
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMode: 'CASH',
  reference: '',
  notes: '',
}

type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  PAID: { label: 'Paid', variant: 'secondary', icon: <CheckCircle2 className="size-3" /> },
  PARTIAL: { label: 'Partial', variant: 'default', icon: <TrendingUp className="size-3" /> },
  PENDING: { label: 'Pending', variant: 'outline', icon: <Clock className="size-3" /> },
  OVERDUE: { label: 'Overdue', variant: 'destructive', icon: <AlertCircle className="size-3" /> },
}

const workflowSteps = [
  { label: 'Select Supplier', description: 'Choose the supplier to pay' },
  { label: 'Select Invoice', description: 'Pick an unpaid invoice (optional)' },
  { label: 'Enter Amount', description: 'Enter payment amount' },
  { label: 'Confirm & Save', description: 'Record the payment' },
]

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState(emptyPayment)

  const selectedInvoice = invoices.find((inv) => inv.id === form.invoiceId)

  const workflowStep = useMemo(() => {
    if (!form.supplierId) return 0
    if (!form.invoiceId && form.amount <= 0) return 1
    if (form.invoiceId && form.amount <= 0) return 2
    return 3
  }, [form.supplierId, form.invoiceId, form.amount])

  const stats = useMemo(() => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const pendingCount = payments.filter((p) => p.invoice?.status === 'PENDING').length
    const overdueCount = payments.filter((p) => p.invoice?.status === 'OVERDUE').length
    return { totalPaid, pendingCount, overdueCount }
  }, [payments])

  const loadPayments = async (pageNum = 1) => {
    try {
      const res = await fetch(`/api/supplier-payments?page=${pageNum}&pageSize=${pageSize}`)
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(data.page || pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers?active=true')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers)
      }
    } catch {
      // ignore
    }
  }

  const loadInvoices = async (supplierId: string) => {
    if (!supplierId) {
      setInvoices([])
      return
    }
    try {
      const res = await fetch(`/api/purchase-invoices?supplierId=${supplierId}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices.filter((inv: Invoice) => Number(inv.balance) > 0))
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadPayments(1)
    loadSuppliers()
  }, [])

  const handlePrevPage = () => {
    if (page > 1) {
      loadPayments(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadPayments(page + 1)
    }
  }

  useEffect(() => {
    loadInvoices(form.supplierId)
  }, [form.supplierId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const body = {
        supplierId: form.supplierId,
        invoiceId: form.invoiceId || null,
        amount: form.amount,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        reference: form.reference || null,
        notes: form.notes || null,
      }

      const res = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to record payment')
        return
      }

      setSuccess('Payment recorded successfully')
      await loadPayments()
      setShowForm(false)
      setForm(emptyPayment)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleResetForm = () => {
    setShowForm(false)
    setForm(emptyPayment)
    setError('')
    setSuccess('')
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Supplier Payments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Record and track supplier payments with workflow validation
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 size-4" />
              Record Payment
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record Supplier Payment</CardTitle>
              <CardDescription>
                Follow the workflow steps below to record a payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                        idx <= workflowStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-xs ${
                        idx <= workflowStep ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                    {idx < workflowSteps.length - 1 && (
                      <div className="mx-2 h-px w-6 bg-border" />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <SearchableSelect
                    value={form.supplierId || ''}
                    onValueChange={(value) => setForm({ ...form, supplierId: value || '', invoiceId: '' })}
                    placeholder="Select supplier"
                    renderValue={(id) => {
                      const supplier = suppliers.find((s) => s.id === id)
                      return supplier ? supplier.supplierName : 'Select supplier'
                    }}
                  >
                    {suppliers.map((supplier) => (
                      <SearchableSelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplierName}
                      </SearchableSelectItem>
                    ))}
                  </SearchableSelect>
                  {!form.supplierId && (
                    <p className="text-xs text-muted-foreground">Step 1: Select a supplier to continue</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice (Optional)</Label>
                  <SearchableSelect
                    value={form.invoiceId || ''}
                    onValueChange={(value) => setForm({ ...form, invoiceId: value || '' })}
                    placeholder="Select invoice"
                    renderValue={(id) => {
                      if (!id) return 'None'
                      const invoice = invoices.find((inv) => inv.id === id)
                      return invoice ? `${invoice.invoiceNumber} (Balance: ₹${invoice.balance.toLocaleString('en-IN')})` : 'Select invoice'
                    }}
                  >
                    <SearchableSelectItem value="">None</SearchableSelectItem>
                    {invoices.map((invoice) => (
                      <SearchableSelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} (Balance: ₹{invoice.balance.toLocaleString('en-IN')})
                      </SearchableSelectItem>
                    ))}
                  </SearchableSelect>
                  {form.supplierId && invoices.length === 0 && (
                    <p className="text-xs text-muted-foreground">No pending invoices for this supplier</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {selectedInvoice && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IndianRupee className="size-3" />
                      Outstanding: ₹{selectedInvoice.balance.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={form.paymentMode || ''} onValueChange={(value) => setForm({ ...form, paymentMode: value || '' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Cheque/UTR number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes about this payment"
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saving || !form.supplierId || form.amount <= 0}>
                    {saving ? 'Recording...' : 'Record Payment'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleResetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-600">
            <CardContent className="pt-6">
              <p className="text-sm text-green-600">{success}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">₹{stats.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{payments.length} payment(s) recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-yellow-600" />
                <span className="text-2xl font-semibold">{stats.pendingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-red-600" />
                <span className="text-2xl font-semibold">{stats.overdueCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Past due date</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>
              {total > 0 ? `Page ${page} of ${totalPages} (${total} total)` : `${payments.length} payment(s) recorded`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Invoice Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const invoiceStatus = payment.invoice?.status as PaymentStatus | undefined
                    const statusBadge = invoiceStatus ? statusConfig[invoiceStatus] : null
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{payment.supplier.supplierName}</TableCell>
                        <TableCell>{payment.invoice?.invoiceNumber || '-'}</TableCell>
                        <TableCell>
                          {statusBadge ? (
                            <Badge variant={statusBadge.variant} className="gap-1">
                              {statusBadge.icon}
                              {statusBadge.label}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.paymentMode || '-'}</Badge>
                        </TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payment.notes || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No payments found
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
