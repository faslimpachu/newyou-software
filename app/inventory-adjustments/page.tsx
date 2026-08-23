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
import { Plus, AlertTriangle, HelpCircle, Info } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Product {
  id: string
  name: string
  sku: string | null
  currentStock: number
  unit: string
}

interface Batch {
  id: string
  batchNumber: string
  expiryDate: string | null
  quantity: number
  status: string
}

interface Adjustment {
  id: string
  productId: string
  type: string
  quantity: number
  batchId: string | null
  referenceType: string | null
  notes: string | null
  createdAt: string
  product: { id: string; name: string; sku: string | null; unit: string }
  batch?: { id: string; batchNumber: string } | null
}

const emptyAdjustment = {
  productId: '',
  operation: 'increase' as 'increase' | 'decrease',
  type: 'ADJUSTMENT_IN',
  quantity: 0,
  batchId: '',
  unitCost: 0,
  supplierId: '',
  notes: '',
}

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; supplierName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState(emptyAdjustment)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<(() => Promise<void>) | null>(null)
  const [allowManualSale, setAllowManualSale] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  const loadAdjustments = async (pageNum = 1) => {
    try {
      const res = await fetch(`/api/inventory-adjustments?page=${pageNum}&pageSize=${pageSize}`)
      if (!res.ok) throw new Error('Failed to load adjustments')
      const data = await res.json()
      setAdjustments(data.adjustments)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(data.page || pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load adjustments')
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

  const loadBatches = async (productId: string) => {
    if (!productId) {
      setBatches([])
      return
    }
    try {
      const res = await fetch(`/api/batches?productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.ok ? res.json() : { allowManualSale: true })
      .then(data => setAllowManualSale(data.allowManualSale))
      .catch(() => setAllowManualSale(true))
  }, [])

  useEffect(() => {
    loadAdjustments(1)
    loadProducts()
    loadSuppliers()
  }, [])

  const handlePrevPage = () => {
    if (page > 1) {
      loadAdjustments(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadAdjustments(page + 1)
    }
  }

  useEffect(() => {
    if (form.productId) {
      loadBatches(form.productId)
    }
  }, [form.productId])

  const getAvailableReasons = () => {
    if (form.operation === 'increase') {
      return [
        { value: 'ADJUSTMENT_IN', label: 'Adjustment In (found stock)' },
        { value: 'OPENING', label: 'Opening Stock' },
      ]
    }
    return [
      { value: 'ADJUSTMENT_OUT', label: 'Adjustment Out (correction)' },
      { value: 'DAMAGED', label: 'Damaged' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'LOST', label: 'Lost' },
      { value: 'RETURN_OUT', label: 'Return to Supplier' },
      ...(allowManualSale ? [{ value: 'SALE', label: 'Sale' }] : []),
    ]
  }

  const handleOperationChange = (operation: 'increase' | 'decrease') => {
    const reasons = getAvailableReasons()
    const defaultType = reasons[0]?.value || (operation === 'increase' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT')
    setForm({
      ...form,
      operation,
      type: defaultType,
      batchId: '',
      unitCost: 0,
      supplierId: '',
    })
  }

  const handleTypeChange = (type: string) => {
    setForm({ ...form, type })
  }

  const validateForm = (): boolean => {
    setError('')

    if (!form.productId) {
      setError('Please select a product')
      return false
    }

    if (!form.quantity || form.quantity <= 0) {
      setError('Quantity must be greater than zero')
      return false
    }

    if (form.operation === 'decrease' && !form.batchId) {
      setError('Please select a batch for decrease operations')
      return false
    }

    if (form.operation === 'increase') {
      if (!form.unitCost || form.unitCost <= 0) {
        setError('Unit cost is required and must be greater than zero for increases')
        return false
      }
      if (!form.supplierId) {
        setError('Please select a supplier for stock increases')
        return false
      }
    }

    if (form.operation === 'decrease' && form.batchId) {
      const selectedBatch = batches.find(b => b.id === form.batchId)
      if (selectedBatch && form.quantity > selectedBatch.quantity) {
        setError(`Quantity cannot exceed batch stock (${selectedBatch.quantity} units)`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        productId: form.productId,
        type: form.type,
        quantity: form.quantity,
        batchId: form.batchId,
        notes: form.notes || null,
      }

      if (form.operation === 'increase') {
        body.unitCost = form.unitCost
        body.supplierId = form.supplierId
      }

      const res = await fetch('/api/inventory-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create adjustment')
        return
      }

      setSuccess('Adjustment created successfully')
      await loadAdjustments()
      setShowForm(false)
      setForm(emptyAdjustment)
      setBatches([])
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDecreaseClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const confirmMessage = `Decrease stock by ${form.quantity} units from batch ${selectedBatch?.batchNumber || ''}? This will permanently reduce stock and cannot be undone.`
    setPendingSubmit(() => async () => {
      await handleSubmit(e)
      setConfirmOpen(false)
      setPendingSubmit(null)
    })
    setError(confirmMessage)
    setConfirmOpen(true)
  }

  const confirmDecrease = async () => {
    if (pendingSubmit) {
      await pendingSubmit()
    }
  }

  const selectedProduct = products.find((p) => p.id === form.productId)
  const isDecrease = form.operation === 'decrease'
  const selectedBatch = batches.find((b) => b.id === form.batchId)
  const availableReasons = getAvailableReasons()

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

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return 'destructive'
      case 'EXPIRING_SOON':
        return 'secondary'
      case 'OK':
        return 'default'
      default:
        return 'outline'
    }
  }

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Inventory Adjustment
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manually increase or decrease stock with full audit trail. All operations target a specific batch.
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
              <Button onClick={() => { setShowForm(true); setError(''); setSuccess('') }}>
                <Plus className="mr-2 size-4" />
                New Adjustment
              </Button>
            )}
          </div>
        </div>

        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="size-4 text-blue-600" />
                How Inventory Adjustments Work
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Increase Stock</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Select product and choose <strong>Increase</strong></li>
                  <li>Select reason: Adjustment In (found stock) or Opening Stock</li>
                  <li>Select batch to update</li>
                  <li>Enter quantity and unit cost (required)</li>
                  <li>Select supplier for traceability</li>
                  <li>System creates a new BatchReceipt layer with the supplied cost</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-900">Decrease Stock</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Select product and choose <strong>Decrease</strong></li>
                  <li>Select reason: Damaged, Expired, Lost, Adjustment Out, or Sale</li>
                  <li>Select specific batch (required)</li>
                  <li>Enter quantity (cannot exceed batch quantity)</li>
                  <li>Unit cost is optional — system derives from oldest receipts if omitted</li>
                  <li>System reduces batch quantity and receipt layers using FIFO order</li>
                </ul>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-blue-900">Important Rules</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Batch selection is <strong>required</strong> for all operations — there is no batch-less adjustment</li>
                  <li>Stock updates and transaction creation happen atomically — if one fails, all changes roll back</li>
                  <li>Decreases use atomic checks to prevent negative stock</li>
                  <li><strong>Purchase Correction</strong> is not available — use the purchase invoice workflow instead</li>
                  <li>Expired batches can be written off using the <strong>Expired</strong> reason</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Inventory Adjustment</CardTitle>
              <CardDescription>
                {form.operation === 'increase' ? 'Increase stock with audit trail' : 'Decrease stock with audit trail'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={isDecrease ? handleDecreaseClick : handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product *</Label>
                  <SearchableSelect
                    value={form.productId || ''}
                    onValueChange={(value) => {
                      setForm({ ...form, productId: value || '', batchId: '' })
                    }}
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
                  {selectedProduct && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Total Stock: {selectedProduct.currentStock} {selectedProduct.unit}</p>
                      {batches.length > 0 && (
                        <p>
                          Available: {batches.filter(b => b.status === 'OK' || b.status === 'EXPIRING_SOON').reduce((sum, b) => sum + b.quantity, 0)} {selectedProduct.unit}
                          {batches.some(b => b.status === 'EXPIRED') && (
                            <span className="text-destructive ml-2">
                              ({batches.filter(b => b.status === 'EXPIRED').reduce((sum, b) => sum + b.quantity, 0)} expired)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label>Operation *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="operation"
                        value="increase"
                        checked={form.operation === 'increase'}
                        onChange={() => handleOperationChange('increase')}
                        className="size-4"
                      />
                      <span className="text-sm font-medium">Increase</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="operation"
                        value="decrease"
                        checked={form.operation === 'decrease'}
                        onChange={() => handleOperationChange('decrease')}
                        className="size-4"
                      />
                      <span className="text-sm font-medium">Decrease</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Reason *</Label>
                  <Select value={form.type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                     <SelectContent className="w-80 min-w-[var(--anchor-width)] overflow-x-visible">
                      {availableReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {form.operation === 'increase'
                      ? 'Increases require unit cost and supplier for traceability'
                      : 'Decreases require batch selection and will reduce stock atomically'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.quantity || ''}
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {isDecrease && selectedBatch && (
                    <p className="text-xs text-muted-foreground">
                      Max available: {selectedBatch.quantity} units
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchId">Batch *</Label>
                  <SearchableSelect
                    value={form.batchId || ''}
                    onValueChange={(value) => setForm({ ...form, batchId: value || '' })}
                    placeholder="Select batch"
                    renderValue={(id) => {
                      const batch = batches.find((b) => b.id === id)
                      if (!batch) return 'Select batch'
                      return (
                        <span className="flex items-center gap-2">
                          {batch.batchNumber} ({batch.quantity} units)
                          <Badge variant={getBatchStatusColor(batch.status)} className="ml-auto text-xs">
                            {batch.status}
                          </Badge>
                        </span>
                      )
                    }}
                  >
                    {batches.map((batch) => (
                      <SearchableSelectItem key={batch.id} value={batch.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{batch.batchNumber} ({batch.quantity} units)</span>
                          <Badge variant={getBatchStatusColor(batch.status)} className="text-xs">
                            {batch.status}
                          </Badge>
                        </div>
                        {batch.expiryDate && (
                          <span className="text-xs text-muted-foreground">
                            Exp: {new Date(batch.expiryDate).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </SearchableSelectItem>
                    ))}
                  </SearchableSelect>
                  {selectedBatch && (selectedBatch.status === 'EXPIRED' || selectedBatch.status === 'EXPIRING_SOON') && (
                    <div className={`flex items-center gap-1 text-xs ${selectedBatch.status === 'EXPIRED' ? 'text-destructive' : 'text-yellow-600'}`}>
                      <AlertTriangle className="size-3" />
                      {selectedBatch.status === 'EXPIRED'
                        ? 'This batch has expired. Use Expired reason to write it off.'
                        : 'This batch is expiring soon. Consider writing it off if needed.'}
                    </div>
                  )}
                </div>

                {!isDecrease && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="unitCost">Unit Cost *</Label>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.unitCost || ''}
                        onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This becomes the purchase rate for the new BatchReceipt layer
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Supplier *</Label>
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
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes || ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes explaining the adjustment"
                  />
                </div>

                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                  {isDecrease ? (
                    <Button type="button" variant="destructive" onClick={handleDecreaseClick} disabled={saving}>
                      {saving ? 'Saving...' : 'Decrease Stock'}
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Increase Stock'}
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(''); setSuccess('') }}>
                    Cancel
                  </Button>
                </div>
                {error && (
                  <div className={`md:col-span-2 lg:col-span-3 p-3 rounded-md text-sm ${isDecrease ? 'bg-destructive/10 text-destructive' : 'bg-destructive/10 text-destructive'}`}>
                    {error}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adjustment History</CardTitle>
            <CardDescription>
              {total > 0 ? `Page ${page} of ${totalPages} (${total} total)` : `${adjustments.length} adjustment(s) in the system`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adjustment) => {
                    const typeInfo = getTypeBadge(adjustment.type)
                    return (
                      <TableRow key={adjustment.id}>
                        <TableCell>{new Date(adjustment.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="font-medium">
                          {adjustment.product.name}
                          {adjustment.product.sku && <span className="ml-2 text-xs text-muted-foreground">({adjustment.product.sku})</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {adjustment.batch?.batchNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${adjustment.quantity > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{adjustment.notes || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No adjustments found
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

      {confirmOpen && (
        <ConfirmDialog
          title="Confirm Decrease"
          description={error}
          confirmLabel="Confirm Decrease"
          confirmVariant="destructive"
          onCancel={() => { setConfirmOpen(false); setPendingSubmit(null); setError('') }}
          onConfirm={confirmDecrease}
        />
      )}
    </DashboardShell>
  )
}
