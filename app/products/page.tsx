'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Plus, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  active: boolean
}

interface Product {
  id: string
  name: string
  code: string
  sku: string | null
  categoryId: string | null
  category: { id: string; name: string } | null
  unit: string
  purchasePrice: number
  sellingPrice: number
  gstPercent: number
  minimumStock: number
  maximumStock: number
  currentStock: number
  imageUrl: string | null
  active: boolean
  createdAt: string
}

type FieldError = {
  name?: string
  code?: string
  sku?: string
  categoryId?: string
  unit?: string
  purchasePrice?: string
  sellingPrice?: string
  gstPercent?: string
  minimumStock?: string
  maximumStock?: string
  currentStock?: string
  imageUrl?: string
}

const emptyProduct = {
  name: '',
  code: '',
  sku: '',
  categoryId: '',
  unit: 'pcs',
  purchasePrice: 0,
  sellingPrice: 0,
  gstPercent: 0,
  minimumStock: 10,
  maximumStock: 200,
  currentStock: 0,
  imageUrl: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [lowStockCount, setLowStockCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const loadProducts = useCallback(async (pageNum: number) => {
    try {
      const params = new URLSearchParams({
        search,
        categoryId: filterCategory,
        page: String(pageNum),
        pageSize: String(pageSize),
      })
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?${params}`),
        fetch('/api/product-categories'),
      ])

      if (!productsRes.ok) throw new Error('Failed to load products')
      if (!categoriesRes.ok) throw new Error('Failed to load categories')

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()

      setProducts(productsData.products || [])
      setTotalPages(productsData.totalPages || 1)
      setTotal(productsData.total || 0)
      setPage(productsData.page || pageNum)
      setCategories(categoriesData.categories.filter((c: Category) => c.active))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory, pageSize])

  const loadLowStockCount = useCallback(async () => {
    try {
      const res = await fetch('/api/products/low-stock')
      if (res.ok) {
        const data = await res.json()
        setLowStockCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    loadProducts(1)
    loadLowStockCount()
  }, [search, filterCategory, loadProducts, loadLowStockCount])

  const validate = useCallback((): boolean => {
    const errors: FieldError = {}

    if (!form.name.trim()) {
      errors.name = 'Product name is required'
    }

    if (form.sku && !/^[A-Z0-9\-]+$/i.test(form.sku.trim())) {
      errors.sku = 'SKU must contain only letters, numbers, and hyphens'
    }

    if (!form.categoryId) {
      errors.categoryId = 'Category is required'
    }

    if (!form.unit.trim()) {
      errors.unit = 'Unit is required'
    }

    if (form.purchasePrice < 0) {
      errors.purchasePrice = 'Purchase price cannot be negative'
    }

    if (form.sellingPrice < 0) {
      errors.sellingPrice = 'Selling price cannot be negative'
    }

    if (form.sellingPrice > 0 && form.purchasePrice > 0 && form.sellingPrice < form.purchasePrice) {
      errors.sellingPrice = 'Selling price should be at least equal to purchase price'
    }

    if (form.gstPercent < 0 || form.gstPercent > 100) {
      errors.gstPercent = 'GST must be between 0 and 100'
    }

    if (form.minimumStock < 0) {
      errors.minimumStock = 'Minimum stock cannot be negative'
    }

    if (form.maximumStock < 0) {
      errors.maximumStock = 'Maximum stock cannot be negative'
    }

    if (form.minimumStock > 0 && form.maximumStock > 0 && form.minimumStock > form.maximumStock) {
      errors.maximumStock = 'Maximum stock must be greater than or equal to minimum stock'
    }

    if (form.currentStock < 0) {
      errors.currentStock = 'Current stock cannot be negative'
    }

    if (form.imageUrl && !isValidUrl(form.imageUrl)) {
      errors.imageUrl = 'Enter a valid URL (e.g., https://example.com/image.jpg)'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [form, editingId])

  const isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!validate()) return

    setSaving(true)
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PATCH' : 'POST'
      const { code: _code, currentStock: _currentStock, active: _active, ...rest } = form
      const body = editingId
        ? { ...rest, categoryId: form.categoryId || null, code: form.code }
        : { ...rest, categoryId: form.categoryId || null }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save product')
        return
      }

      await loadProducts(page)
      await loadLowStockCount()
      setForm(emptyProduct)
      setEditingId(null)
      setShowForm(false)
      setFieldErrors({})
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      code: product.code,
      sku: product.sku || '',
      categoryId: product.categoryId || '',
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      gstPercent: product.gstPercent,
      minimumStock: product.minimumStock,
      maximumStock: product.maximumStock,
      currentStock: product.currentStock,
      imageUrl: product.imageUrl || '',
    })
    setShowForm(true)
    setFieldErrors({})
    setError('')
  }

  const handleView = (product: Product) => {
    setViewingProduct(product)
  }

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    setDeleteTarget(product)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadProducts(page)
      await loadLowStockCount()
      if (editingId === id || viewingProduct?.id === id) {
        handleCancel()
        setViewingProduct(null)
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyProduct)
    setShowForm(false)
    setFieldErrors({})
    setError('')
  }

  const handleNewProduct = () => {
    setEditingId(null)
    setForm(emptyProduct)
    setShowForm(true)
    setFieldErrors({})
    setError('')
  }

  const handlePrevPage = () => {
    if (page > 1) {
      loadProducts(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadProducts(page + 1)
    }
  }

  const getStockStatus = (stock: number, minStock: number, maxStock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (stock < minStock) return { label: 'Low Stock', variant: 'secondary' as const }
    if (stock > maxStock) return { label: 'Overstock', variant: 'outline' as const }
    return { label: 'Healthy', variant: 'default' as const }
  }

  const formatPrice = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [page, totalPages])

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Products
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage products and inventory
            </p>
          </div>
          {!showForm && !editingId && (
            <Button onClick={handleNewProduct}>
              <Plus className="mr-2 size-4" />
              Create Product
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingId ? 'Edit Product' : 'Create Product'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update product details below' : 'Add a new product to inventory'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product name"
                    className={fieldErrors.name ? 'border-destructive' : ''}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Product Code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    disabled
                    placeholder={editingId ? 'Cannot be changed' : 'Auto-generated on create'}
                    className={fieldErrors.code ? 'border-destructive' : ''}
                  />
                  {fieldErrors.code && (
                    <p className="text-xs text-destructive">{fieldErrors.code}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g., MED-001"
                    className={fieldErrors.sku ? 'border-destructive' : ''}
                  />
                  {fieldErrors.sku && (
                    <p className="text-xs text-destructive">{fieldErrors.sku}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category *</Label>
                  {(categories.length > 0 || editingId) ? (
                    <Select
                      value={form.categoryId || ''}
                      onValueChange={(value) => setForm({ ...form, categoryId: value || '' })}
                    >
                      <SelectTrigger className={fieldErrors.categoryId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select category">
                          {(value) => {
                            const category = categories.find((c) => c.id === value)
                            return category ? category.name : 'Select category'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <SelectTrigger disabled className={fieldErrors.categoryId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Loading categories..." />
                    </SelectTrigger>
                  )}
                  {fieldErrors.categoryId && (
                    <p className="text-xs text-destructive">{fieldErrors.categoryId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="e.g., pcs, strip, bottle"
                    className={fieldErrors.unit ? 'border-destructive' : ''}
                  />
                  {fieldErrors.unit && (
                    <p className="text-xs text-destructive">{fieldErrors.unit}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className={fieldErrors.purchasePrice ? 'border-destructive' : ''}
                  />
                  {fieldErrors.purchasePrice && (
                    <p className="text-xs text-destructive">{fieldErrors.purchasePrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className={fieldErrors.sellingPrice ? 'border-destructive' : ''}
                  />
                  {fieldErrors.sellingPrice && (
                    <p className="text-xs text-destructive">{fieldErrors.sellingPrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstPercent">GST % *</Label>
                  <Input
                    id="gstPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.gstPercent}
                    onChange={(e) => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
                    className={fieldErrors.gstPercent ? 'border-destructive' : ''}
                  />
                  {fieldErrors.gstPercent && (
                    <p className="text-xs text-destructive">{fieldErrors.gstPercent}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Minimum Stock *</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    min="0"
                    value={form.minimumStock}
                    onChange={(e) => setForm({ ...form, minimumStock: parseInt(e.target.value) || 0 })}
                    className={fieldErrors.minimumStock ? 'border-destructive' : ''}
                  />
                  {fieldErrors.minimumStock && (
                    <p className="text-xs text-destructive">{fieldErrors.minimumStock}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maximumStock">Maximum Stock *</Label>
                  <Input
                    id="maximumStock"
                    type="number"
                    min="0"
                    value={form.maximumStock}
                    onChange={(e) => setForm({ ...form, maximumStock: parseInt(e.target.value) || 0 })}
                    className={fieldErrors.maximumStock ? 'border-destructive' : ''}
                  />
                  {fieldErrors.maximumStock && (
                    <p className="text-xs text-destructive">{fieldErrors.maximumStock}</p>
                  )}
                </div>
                {!editingId && (
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.currentStock}
                      onChange={(e) => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                      className={fieldErrors.currentStock ? 'border-destructive' : ''}
                    />
                    {fieldErrors.currentStock && (
                      <p className="text-xs text-destructive">{fieldErrors.currentStock}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className={fieldErrors.imageUrl ? 'border-destructive' : ''}
                  />
                  {fieldErrors.imageUrl && (
                    <p className="text-xs text-destructive">{fieldErrors.imageUrl}</p>
                  )}
                </div>
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
                  <Button type="submit" disabled={saving}>
                    <Plus className="mr-2 size-4" />
                    {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}

        {lowStockCount > 0 && (
          <Card className="border-destructive/40">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">
                {lowStockCount} product(s) are below reorder level
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">All Products</CardTitle>
                <CardDescription>
                  {loading ? 'Loading...' : `${total} product(s) in the system`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading products...</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Purchase Price</TableHead>
                        <TableHead className="text-right">Selling Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Min / Max</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const stockStatus = getStockStatus(product.currentStock, product.minimumStock, product.maximumStock)
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="font-mono text-xs">{product.code}</TableCell>
                            <TableCell>{product.sku || '-'}</TableCell>
                            <TableCell>{product.category?.name || '-'}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(product.purchasePrice)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(product.sellingPrice)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {product.currentStock.toLocaleString('en-IN')} {product.unit}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                Min: {product.minimumStock} / Max: {product.maximumStock}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="icon-sm" variant="ghost" onClick={() => handleView(product)} title="View">
                                  <Eye className="size-4" />
                                </Button>
                              <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(product)} title="Edit" disabled={!product.active}>
                                Edit
                              </Button>
                              {product.active && (
                                <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)} title="Delete">
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {products.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                            {search || filterCategory ? 'No products match your search criteria' : 'No products found'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({total} total)
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="mr-1 size-4" />
                        Previous
                      </Button>
                      {pageNumbers.map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => loadProducts(p as number)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {viewingProduct && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Product Details: {viewingProduct.name}</CardTitle>
                  <CardDescription>Product information and inventory status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewingProduct(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Product Code</p>
                  <p className="font-mono text-sm">{viewingProduct.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="text-sm">{viewingProduct.sku || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">{viewingProduct.category?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Unit</p>
                  <p className="text-sm">{viewingProduct.unit}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Purchase Price</p>
                  <p className="text-sm font-medium tabular-nums">{formatPrice(viewingProduct.purchasePrice)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Selling Price</p>
                  <p className="text-sm font-medium tabular-nums">{formatPrice(viewingProduct.sellingPrice)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">GST %</p>
                  <p className="text-sm font-medium">{viewingProduct.gstPercent}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Current Stock</p>
                  <p className="text-sm font-medium tabular-nums">
                    {viewingProduct.currentStock.toLocaleString('en-IN')} {viewingProduct.unit}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Minimum Stock</p>
                  <p className="text-sm tabular-nums">{viewingProduct.minimumStock}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Maximum Stock</p>
                  <p className="text-sm tabular-nums">{viewingProduct.maximumStock}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={getStockStatus(viewingProduct.currentStock, viewingProduct.minimumStock, viewingProduct.maximumStock).variant}>
                    {getStockStatus(viewingProduct.currentStock, viewingProduct.minimumStock, viewingProduct.maximumStock).label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Image URL</p>
                  <p className="text-sm break-all">{viewingProduct.imageUrl || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Deactivate this product?"
          description={`This will mark ${deleteTarget.name} as inactive. This action can be reversed later.`}
          confirmLabel="Deactivate"
          confirmVariant="destructive"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </DashboardShell>
  )
}
