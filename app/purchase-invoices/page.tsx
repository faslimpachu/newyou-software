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
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Plus, Trash2, Eye, HelpCircle, Info } from 'lucide-react'

interface Supplier {
  id: string
  supplierName: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
  gstPercent: number
}

interface InvoiceItem {
  productId: string
  quantity: number
  purchaseRate: number
  amount: number
  batchNumber: string
  expiryDate: string
  gstPercent: number
}

type FormFieldError = {
  supplierId?: string
  items?: {
    productId?: string
    quantity?: string
    purchaseRate?: string
    batchNumber?: string
  }[]
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
    batchNumber: string | null
    expiryDate: string | null
    product: { id: string; name: string; sku: string | null; unit: string }
  }[]
}

const emptyItem: InvoiceItem = {
  productId: '',
  quantity: 0,
  purchaseRate: 0,
  amount: 0,
  batchNumber: '',
  expiryDate: '',
  gstPercent: 0,
}

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FormFieldError>({})
  const [showForm, setShowForm] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterSupplierId, setFilterSupplierId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [form, setForm] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    paymentMode: '',
    dueDate: '',
    notes: '',
    items: [emptyItem],
  })

  const loadInvoices = async (pageNum = 1) => {
    try {
      const params = new URLSearchParams({
        search,
        supplierId: filterSupplierId,
        status: filterStatus,
        page: String(pageNum),
        pageSize: String(pageSize),
      })
      const res = await fetch(`/api/purchase-invoices?${params}`)
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      setInvoices(data.invoices)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(data.page || pageNum)
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
    setPage(1)
    setLoading(true)
    loadInvoices(1)
    loadSuppliers()
    loadProducts()
  }, [search, filterSupplierId, filterStatus])

  const handlePrevPage = () => {
    if (page > 1) {
      loadInvoices(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadInvoices(page + 1)
    }
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...form.items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'productId') {
      const product = products.find((p) => p.id === (value as string))
      newItems[index].gstPercent = product ? product.gstPercent : 0
    }

    if (field === 'quantity' || field === 'purchaseRate') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].purchaseRate || 0)
    }

    setForm({ ...form, items: newItems })

    const clearableFields: (keyof InvoiceItem)[] = ['productId', 'batchNumber', 'quantity', 'purchaseRate']
    if (clearableFields.includes(field)) {
      setFieldErrors((prev) => {
        const updated = { ...prev }
        if (!updated.items) updated.items = form.items.map(() => ({}))
        if (updated.items[index]) {
          const itemErr = { ...updated.items[index] }
          delete itemErr.productId
          delete itemErr.batchNumber
          if (field === 'quantity') delete itemErr.quantity
          if (field === 'purchaseRate') delete itemErr.purchaseRate
          updated.items[index] = itemErr
        }
        return updated
      })
    }
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
    const tax = form.items.reduce((sum, item) => sum + (item.amount || 0) * (item.gstPercent || 0) / 100, 0)
    const grandTotal = subtotal + tax
    return { subtotal, tax, grandTotal }
  }

  const validate = (): boolean => {
    const errors: FormFieldError = {}

    if (!form.supplierId) {
      errors.supplierId = 'Supplier is required'
    }

    const itemErrors = form.items.map((item) => {
      const itemError: { productId?: string; quantity?: string; purchaseRate?: string; batchNumber?: string } = {}
      if (!item.productId) {
        itemError.productId = 'Product is required'
      }
      if (!item.quantity || item.quantity <= 0) {
        itemError.quantity = 'Quantity must be greater than zero'
      }
      if (!item.purchaseRate || item.purchaseRate <= 0) {
        itemError.purchaseRate = 'Purchase rate must be greater than zero'
      }
      if (!item.batchNumber || !item.batchNumber.trim()) {
        itemError.batchNumber = 'Batch number is required'
      }
      return itemError
    })

    const hasItemErrors = itemErrors.some((err) => Object.keys(err).length > 0)
    if (hasItemErrors) {
      errors.items = itemErrors
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!validate()) return

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
          batchNumber: item.batchNumber?.trim() || null,
          expiryDate: item.expiryDate || null,
          gstPercent: item.gstPercent,
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
      setFieldErrors({})
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="mr-2 size-4" />
              How to Use
            </Button>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 size-4" />
                New Purchase Invoice
              </Button>
            )}
          </div>
        </div>

        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="size-4 text-blue-600" />
                How Purchase Invoices Work
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-blue-900">Creating an Invoice</h3>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Select a supplier from the dropdown (required)</li>
                    <li>Set invoice date (required)</li>
                    <li>Add one or more products (required)</li>
                    <li>Enter quantity greater than zero (required)</li>
                    <li>Enter purchase rate greater than zero (required)</li>
                    <li>Batch number is required for each item</li>
                    <li>Expiry date is optional but recommended for medicines</li>
                    <li>GST is auto-calculated from product settings</li>
                    <li>Submit creates the invoice and stock entries atomically</li>
                  </ul>
                </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Stock &amp; Batch Behavior</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Each line item can create or update a batch</li>
                  <li>If batch number exists, quantity is added to existing batch</li>
                  <li>If new, a batch is created with expiry tracking</li>
                  <li>Batch receipt layers preserve the actual purchase cost</li>
                  <li>Average cost is updated automatically</li>
                </ul>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-blue-900">Important Rules</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Invoice number must be unique per supplier</li>
                  <li>Balance = grand total - paid amount</li>
                  <li>Payment mode can be updated later from supplier payments</li>
                  <li>You cannot delete an invoice with payments; mark it void instead</li>
                  <li>Use <strong>Inventory Adjustment</strong> for stock corrections, not invoices</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <SearchableSelect
                      value={form.supplierId || ''}
                      onValueChange={(value) => setForm({ ...form, supplierId: value || '' })}
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
                    {fieldErrors.supplierId && (
                      <p className="text-sm text-destructive">{fieldErrors.supplierId}</p>
                    )}
                  </div>
                  {/* <div className="space-y-2">
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
                  </div> */}
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
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Purchase Rate</TableHead>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="w-[300px]">
                            <SearchableSelect
                              value={item.productId || ''}
                              onValueChange={(value) => handleItemChange(index, 'productId', value || '')}
                              placeholder="Select product"
                              renderValue={(id) => {
                                const product = products.find((p) => p.id === id)
                                return product ? `${product.name} ${product.sku ? `(${product.sku})` : ''}` : 'Select product'
                              }}
                            >
                              {products.map((product) => (
                                <SearchableSelectItem key={product.id} value={product.id}>
                                  {product.name} {product.sku ? `(${product.sku})` : ''}
                                </SearchableSelectItem>
                              ))}
                            </SearchableSelect>
                            {fieldErrors.items?.[index]?.productId && (
                              <p className="text-sm text-destructive mt-1">{fieldErrors.items[index]!.productId}</p>
                            )}
                          </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               step="0.01"
                               value={item.quantity || ''}
                               onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                               className="w-24"
                             />
                             {fieldErrors.items?.[index]?.quantity && (
                               <p className="text-sm text-destructive mt-1">{fieldErrors.items[index]!.quantity}</p>
                             )}
                           </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               step="0.01"
                               value={item.purchaseRate || ''}
                               onChange={(e) => handleItemChange(index, 'purchaseRate', parseFloat(e.target.value) || 0)}
                               className="w-32"
                             />
                             {fieldErrors.items?.[index]?.purchaseRate && (
                               <p className="text-sm text-destructive mt-1">{fieldErrors.items[index]!.purchaseRate}</p>
                             )}
                           </TableCell>
                           <TableCell>
                             <Input
                               value={item.batchNumber || ''}
                               onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                               placeholder="Batch No."
                               className="w-32"
                             />
                             {fieldErrors.items?.[index]?.batchNumber && (
                               <p className="text-sm text-destructive mt-1">{fieldErrors.items[index]!.batchNumber}</p>
                             )}
                           </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                              className="w-40"
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
                       <span>{subtotal > 0 ? `Tax (${(tax / subtotal * 100).toFixed(1)}%)` : 'Tax'}</span>
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
            <CardDescription>
              {total > 0 ? `Page ${page} of ${totalPages} (${total} total)` : `${invoices.length} invoice(s) in the system`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterSupplierId || undefined} onValueChange={(value) => setFilterSupplierId(value || '')}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Suppliers">
                    {(value) => {
                      if (!value) return 'All Suppliers'
                      const supplier = suppliers.find((s) => s.id === value)
                      return supplier ? supplier.supplierName : 'All Suppliers'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus || undefined} onValueChange={(value) => setFilterStatus(value || '')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses">
                    {(value) => {
                      const map: Record<string, string> = {
                        '': 'All Statuses',
                        PENDING: 'Pending',
                        PARTIAL: 'Partial',
                        PAID: 'Paid',
                        OVERDUE: 'Overdue',
                      }
                      return map[value || ''] || 'All Statuses'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingInvoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell>{item.quantity} {item.product.unit}</TableCell>
                      <TableCell>₹{item.purchaseRate.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{item.batchNumber || '-'}</TableCell>
                      <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : '-'}</TableCell>
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
