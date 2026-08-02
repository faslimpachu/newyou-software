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
import { Plus } from 'lucide-react'

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
  invoice: { id: string; invoiceNumber: string } | null
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

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyPayment)

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/supplier-payments')
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments)
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
    loadPayments()
    loadSuppliers()
  }, [])

  useEffect(() => {
    loadInvoices(form.supplierId)
  }, [form.supplierId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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

      await loadPayments()
      setShowForm(false)
      setForm(emptyPayment)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const selectedInvoice = invoices.find((inv) => inv.id === form.invoiceId)

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Supplier Payments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Record payments to suppliers
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
              <CardDescription>Record a payment to a supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select value={form.supplierId || ''} onValueChange={(value) => setForm({ ...form, supplierId: value || '', invoiceId: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice (Optional)</Label>
                  <Select value={form.invoiceId || ''} onValueChange={(value) => setForm({ ...form, invoiceId: value || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} (Balance: ₹{invoice.balance.toLocaleString('en-IN')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {selectedInvoice && (
                    <p className="text-xs text-muted-foreground">
                      Outstanding: ₹{selectedInvoice.balance.toLocaleString('en-IN')}
                    </p>
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
                  />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Recording...' : 'Record Payment'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>{payments.length} payment(s) recorded</CardDescription>
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
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{payment.supplier.supplierName}</TableCell>
                      <TableCell>{payment.invoice?.invoiceNumber || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.paymentMode || '-'}</Badge>
                      </TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{payment.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No payments found
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
