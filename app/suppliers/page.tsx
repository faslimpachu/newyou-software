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
import { Plus, Trash2, Eye } from 'lucide-react'

interface Supplier {
  id: string
  supplierName: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  gstNumber: string | null
  openingBalance: number
  status: string
  createdAt: string
}

interface SupplierLedger {
  supplier: Supplier
  ledger: {
    totalPurchases: number
    totalPayments: number
    outstandingBalance: number
    lastPurchaseDate: string | null
  }
  recentPurchases: {
    id: string
    invoiceNumber: string
    invoiceDate: string
    grandTotal: number
    paid: number
    balance: number
    status: string
  }[]
  recentPayments: {
    id: string
    paymentNumber: string
    paymentDate: string
    amount: number
    paymentMode: string | null
  }[]
}

const emptySupplier = {
  supplierName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  openingBalance: 0,
  status: 'ACTIVE',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptySupplier)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<SupplierLedger | null>(null)

  const loadSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed to load suppliers')
      const data = await res.json()
      setSuppliers(data.suppliers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers'
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { ...form } : form

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save supplier')
        return
      }

      await loadSuppliers()
      setForm(emptySupplier)
      setEditingId(null)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setForm({
      supplierName: supplier.supplierName,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      openingBalance: supplier.openingBalance,
      status: supplier.status,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this supplier?')) return
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadSuppliers()
    }
  }

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      if (!res.ok) throw new Error('Failed to load supplier details')
      const data = await res.json()
      setViewingSupplier(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load supplier details')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptySupplier)
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage suppliers and view supplier ledger
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit Supplier' : 'Create Supplier'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update supplier details below' : 'Add a new supplier to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name</Label>
                <Input
                  id="supplierName"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saving}>
                  <Plus className="mr-2 size-4" />
                  {saving ? 'Saving...' : editingId ? 'Update Supplier' : 'Create Supplier'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Suppliers</CardTitle>
            <CardDescription>{suppliers.length} supplier(s) in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>GST Number</TableHead>
                    <TableHead>Opening Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                      <TableCell>{supplier.contactPerson || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{supplier.gstNumber || '-'}</TableCell>
                      <TableCell>₹{supplier.openingBalance.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.status === 'ACTIVE' ? 'default' : 'destructive'}>
                          {supplier.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => handleView(supplier.id)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(supplier)}>
                            Edit
                          </Button>
                          {supplier.status === 'ACTIVE' && (
                            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {viewingSupplier && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Supplier Ledger: {viewingSupplier.supplier.supplierName}</CardTitle>
                  <CardDescription>Purchase and payment history</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewingSupplier(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                    <p className="font-display text-xl font-semibold">₹{viewingSupplier.ledger.totalPurchases.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                    <p className="font-display text-xl font-semibold">₹{viewingSupplier.ledger.totalPayments.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                    <p className="font-display text-xl font-semibold text-destructive">₹{viewingSupplier.ledger.outstandingBalance.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Last Purchase</p>
                    <p className="font-display text-xl font-semibold">
                      {viewingSupplier.ledger.lastPurchaseDate
                        ? new Date(viewingSupplier.ledger.lastPurchaseDate).toLocaleDateString('en-IN')
                        : '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-base font-semibold mb-3">Recent Purchases</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingSupplier.recentPurchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No purchases found</TableCell>
                        </TableRow>
                      ) : (
                        viewingSupplier.recentPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-medium">{purchase.invoiceNumber}</TableCell>
                            <TableCell>{new Date(purchase.invoiceDate).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell className="text-right tabular-nums">₹{purchase.grandTotal.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right tabular-nums">₹{purchase.balance.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold mb-3">Recent Payments</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingSupplier.recentPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No payments found</TableCell>
                        </TableRow>
                      ) : (
                        viewingSupplier.recentPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>{payment.paymentMode || '-'}</TableCell>
                            <TableCell className="text-right tabular-nums">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
