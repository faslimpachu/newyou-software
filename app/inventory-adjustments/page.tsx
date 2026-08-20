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
  referenceType: string | null
  notes: string | null
  createdAt: string
  product: { id: string; name: string; sku: string | null; unit: string }
}

const emptyAdjustment = {
  productId: '',
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
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyAdjustment)

  const loadAdjustments = async () => {
    try {
      const res = await fetch('/api/inventory-adjustments')
      if (!res.ok) throw new Error('Failed to load adjustments')
      const data = await res.json()
      setAdjustments(data.adjustments)
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
      const res = await fetch(`/api/products/${productId}/batches`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAdjustments()
    loadProducts()
    loadSuppliers()
  }, [])

  useEffect(() => {
    if (form.productId) {
      loadBatches(form.productId)
    }
  }, [form.productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const isDecrease = ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST'].includes(form.type)
      const body: Record<string, unknown> = {
        productId: form.productId,
        type: form.type,
        quantity: form.quantity,
        batchId: form.batchId,
        notes: form.notes || null,
      }

      if (!isDecrease) {
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

      await loadAdjustments()
      setShowForm(false)
      setForm(emptyAdjustment)
      setBatches([])
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === form.productId)
  const isDecrease = ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST'].includes(form.type)

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

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Inventory Adjustment
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manually increase or decrease stock with audit trail
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 size-4" />
              New Adjustment
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Inventory Adjustment</CardTitle>
              <CardDescription>Manually adjust stock levels with full audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product</Label>
                  <Select value={form.productId || ''} onValueChange={(value) => setForm({ ...form, productId: value || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product">
                        {(value) => {
                          const product = products.find((p) => p.id === value)
                          return product ? `${product.name} ${product.sku ? `(${product.sku})` : ''}` : 'Select product'
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground">
                      Current Stock: {selectedProduct.currentStock} {selectedProduct.unit}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Operation</Label>
                  <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value || 'ADJUSTMENT_IN' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADJUSTMENT_IN">Increase</SelectItem>
                      <SelectItem value="ADJUSTMENT_OUT">Decrease</SelectItem>
                      <SelectItem value="SALE">Sale</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                      <SelectItem value="RETURN_OUT">Return to Supplier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={form.quantity || ''}
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchId">Batch</Label>
                  <Select value={form.batchId || ''} onValueChange={(value) => setForm({ ...form, batchId: value || '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch">
                        {(value) => {
                          const batch = batches.find((b) => b.id === value)
                          return batch ? `${batch.batchNumber} (${batch.quantity} units) ${batch.expiryDate ? `- Exp: ${new Date(batch.expiryDate).toLocaleDateString('en-IN')}` : ''}` : 'Select batch'
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batchNumber} ({batch.quantity} units) {batch.expiryDate ? `- Exp: ${new Date(batch.expiryDate).toLocaleDateString('en-IN')}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isDecrease && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="unitCost">Unit Cost</Label>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        value={form.unitCost || ''}
                        onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Supplier</Label>
                      <Select value={form.supplierId || ''} onValueChange={(value) => setForm({ ...form, supplierId: value || '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier">
                            {(value) => {
                              const supplier = suppliers.find((s) => s.id === value)
                              return supplier ? supplier.supplierName : 'Select supplier'
                            }}
                          </SelectValue>
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
                  </>
                )}
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Create Adjustment'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
                {error && <p className="mt-2 text-sm text-destructive md:col-span-2 lg:col-span-3">{error}</p>}
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adjustment History</CardTitle>
            <CardDescription>{adjustments.length} adjustment(s) in the system</CardDescription>
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
                        <TableCell>
                          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{adjustment.notes || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No adjustments found
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
