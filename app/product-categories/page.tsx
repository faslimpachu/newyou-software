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
  description: string | null
  active: boolean
  createdAt: string
  _count: { products: number }
}

const emptyCategory = {
  name: '',
  description: '',
}

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyCategory)
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/product-categories')
      if (!res.ok) throw new Error('Failed to load categories')
      const data = await res.json()
      setCategories(data.categories)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const url = editingId ? `/api/product-categories/${editingId}` : '/api/product-categories'
      const method = editingId ? 'PATCH' : 'POST'
      const { active: _active, ...rest } = form
      const body = editingId
        ? { ...rest, name: form.name }
        : rest

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save category')
        return
      }

      await loadCategories()
      setForm(emptyCategory)
      setEditingId(null)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description || '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this category?')) return
    const res = await fetch(`/api/product-categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadCategories()
      if (editingId === id) {
        handleCancel()
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyCategory)
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Product Categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product categories for inventory
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit Category' : 'Create Category'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update category details below' : 'Add a new product category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>
                  <Plus className="mr-2 size-4" />
                  {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
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
            <CardTitle className="text-base">All Categories</CardTitle>
            <CardDescription>{categories.length} category(ies) in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell>{category._count.products}</TableCell>
                      <TableCell>
                        <Badge variant={category.active ? 'default' : 'destructive'}>
                          {category.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(category)} disabled={!category.active}>
                            Edit
                          </Button>
                          {category.active && (
                            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(category.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No categories found
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
