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
}

interface Product {
  id: string
  name: string
  sku: string | null
  purchasePrice: number
  unit: string
}

interface InvoiceItem {
  productId: string
  quantity: number
  purchaseRate: number
  amount: number
}

interface PurchaseInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  supplierId: string
  paymentMode: string | null
  dueDate: string | null
  notes: string | null
  subtotal: number
  tax: number
  grandTotal: number
  paid: number
  balance: number
  status: string
  createdAt: string
  supplier: { id: string; supplierName: string }
  items: {
    id: string
    productId: string
    quantity: number
    purchaseRate: number
    amount: number
    product: { id: string; name: string; sku: string | null; unit: string }
  }[]
}

const emptyItem: InvoiceItem = {
  productId: '',
  quantity: 0,
  purchaseRate: 0,
  amount: 0,
}

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null)

  const [form, setForm] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    paymentMode: '',
    dueDate: '',
    notes: '',
    items: [emptyItem],
  })

  const loadInvoices = async () => {
    try {
      const res = await fetch('/api/purchase-invoices')
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      setInvoices(data.invoices)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices')
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
    loadInvoices()
    loadSuppliers()
    loadProducts()
  }, [])

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...form.items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'quantity' || field === 'purchaseRate') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].purchaseRate || 0)
    }

    setForm({ ...form, items: newItems })
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, emptyItem] })
  }

  const removeItem = (index: number) => {
    if (form.items.length === 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const tax = subtotal * 0.12
    const grandTotal = subtotal + tax
    return { subtotal, tax, grandTotal }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { subtotal, tax, grandTotal } = calculateTotals()

      const body = {
        invoiceDate: form.invoiceDate,
        supplierId: form.supplierId,
        paymentMode: form.paymentMode || null,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          purchaseRate: item.purchaseRate,
        })),
      }

      const res = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create purchase invoice')
        return
      }

      await loadInvoices()
      setShowForm(false)
      setForm({
        invoiceDate: new Date().toISOString().split('T')[0],
        supplierId: '',
        paymentMode: '',
        dueDate: '',
        notes: '',
        items: [emptyItem],
      })
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase-invoices/${id}`)
      if (!res.ok) throw new Error('Failed to load invoice details')
      const data = await res.json()
      setViewingInvoice(data.invoice)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice details')
    }
  }

  const { subtotal, tax, grandTotal } = calculateTotals()

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Purchase Invoices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Record purchases from suppliers
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 size-4" />
              New Purchase Invoice
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Purchase Invoice</CardTitle>
              <CardDescription>Record a new purchase from a supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={form.invoiceDate}
                      onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierId">Supplier</Label>
                    <Select value={form.supplierId || ''} onValueChange={(value) => setForm({ ...form, supplierId: value || '' })}>
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
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select value={form.paymentMode || ''} onValueChange={(value) => setForm({ ...form, paymentMode: value || '' })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
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
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-2 size-4" />
                      Add Item
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Purchase Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select value={item.productId || ''} onValueChange={(value) => handleItemChange(index, 'productId', value || '')}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} {product.sku ? `(${product.sku})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.purchaseRate || ''}
                              onChange={(e) => handleItemChange(index, 'purchaseRate', parseFloat(e.target.value) || 0)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (12%)</span>
                      <span className="tabular-nums">₹{tax.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Grand Total</span>
                      <span className="tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || form.items.length === 0}>
                    {saving ? 'Creating...' : 'Create Purchase Invoice'}
                  </Button>
                </div>
              </form>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchase Invoices</CardTitle>
            <CardDescription>{invoices.length} invoice(s) in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{invoice.supplier.supplierName}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{invoice.grandTotal.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{invoice.paid.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{invoice.balance.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === 'PAID' ? 'default' : invoice.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => handleView(invoice.id)}>
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No purchase invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {viewingInvoice && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Purchase Invoice: {viewingInvoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    {new Date(viewingInvoice.invoiceDate).toLocaleDateString('en-IN')} · {viewingInvoice.supplier.supplierName}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewingInvoice(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Mode</p>
                  <p className="font-medium">{viewingInvoice.paymentMode || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{viewingInvoice.dueDate ? new Date(viewingInvoice.dueDate).toLocaleDateString('en-IN') : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewingInvoice.status === 'PAID' ? 'default' : viewingInvoice.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                    {viewingInvoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{viewingInvoice.notes || '-'}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purchase Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingInvoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell>{item.quantity} {item.product.unit}</TableCell>
                      <TableCell>₹{item.purchaseRate.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{item.amount.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end mt-4">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₹{viewingInvoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span className="tabular-nums">₹{viewingInvoice.tax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Grand Total</span>
                    <span className="tabular-nums">₹{viewingInvoice.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span className="tabular-nums">₹{viewingInvoice.paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Balance</span>
                    <span className="tabular-nums">₹{viewingInvoice.balance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
