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
import { Plus, Trash2 } from 'lucide-react'

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
  active: true,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [lowStockCount, setLowStockCount] = useState(0)

  const loadProducts = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?${new URLSearchParams({ search, categoryId: filterCategory })}`),
        fetch('/api/product-categories'),
      ])

      if (!productsRes.ok) throw new Error('Failed to load products')
      if (!categoriesRes.ok) throw new Error('Failed to load categories')

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()

      setProducts(productsData.products)
      setCategories(categoriesData.categories.filter((c: Category) => c.active))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const loadLowStockCount = async () => {
    try {
      const res = await fetch('/api/products/low-stock')
      if (res.ok) {
        const data = await res.json()
        setLowStockCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProducts()
    loadLowStockCount()
  }, [search, filterCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId
        ? { ...form, categoryId: form.categoryId || null }
        : { ...form, categoryId: form.categoryId || null }

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

      await loadProducts()
      setForm(emptyProduct)
      setEditingId(null)
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
      imageUrl: product.imageUrl || '',
      active: product.active,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this product?')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadProducts()
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyProduct)
  }

  const getStockStatus = (stock: number, minStock: number, maxStock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (stock < minStock) return { label: 'Low Stock', variant: 'secondary' as const }
    if (stock > maxStock) return { label: 'Overstock', variant: 'outline' as const }
    return { label: 'Healthy', variant: 'default' as const }
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage products and inventory
          </p>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value || '')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Product Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  disabled={!!editingId}
                  placeholder="Auto-generated on create"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select value={form.categoryId || ''} onValueChange={(value) => setForm({ ...form, categoryId: value || '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstPercent">GST %</Label>
                <Input
                  id="gstPercent"
                  type="number"
                  step="0.01"
                  value={form.gstPercent}
                  onChange={(e) => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Minimum Stock</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  value={form.minimumStock}
                  onChange={(e) => setForm({ ...form, minimumStock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumStock">Maximum Stock</Label>
                <Input
                  id="maximumStock"
                  type="number"
                  value={form.maximumStock}
                  onChange={(e) => setForm({ ...form, maximumStock: parseInt(e.target.value) || 0 })}
                />
              </div>
              {!editingId && (
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Current Stock</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    step="0.01"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={saving}>
                  <Plus className="mr-2 size-4" />
                  {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
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
            <CardTitle className="text-base">All Products</CardTitle>
            <CardDescription>{products.length} product(s) in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Stock</TableHead>
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
                        <TableCell>{product.code}</TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>{product.category?.name || '-'}</TableCell>
                        <TableCell>₹{product.purchasePrice.toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{product.sellingPrice.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="tabular-nums">{product.currentStock} {product.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">Min: {product.minimumStock} / Max: {product.maximumStock}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(product)}>
                              Edit
                            </Button>
                            {product.active && (
                              <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}>
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
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No products found
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
