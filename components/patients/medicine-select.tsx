'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ProductOption = {
  id: string
  name: string
  currentStock: number
}

type MedicineSelectProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

function MedicineSelect({ value, onChange, disabled, placeholder = 'Search medicine...', className }: MedicineSelectProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputId = useId()
  const justSelected = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.resolve(fetch('/api/products?active=true&pageSize=200'))
      .then(async (response) => {
        if (!response || !response.ok) throw new Error('Failed to load products')
        const data = await response.json()
        const items = (data.products ?? []).map((p: { id: string; name: string; currentStock: number }) => ({
          id: p.id,
          name: p.name,
          currentStock: Number(p.currentStock ?? 0),
        }))
        if (!cancelled) setProducts(items)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (name: string) => {
    onChange(name)
    justSelected.current = true
    setOpen(false)
    setSearch('')
  }

  const handleInputFocus = () => {
    if (!disabled && !justSelected.current) {
      setOpen(true)
    }
    justSelected.current = false
  }

  const handleInputChange = (next: string) => {
    onChange(next)
    if (!open) setOpen(true)
    setSearch(next)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={handleInputFocus}
          onChange={(e) => handleInputChange(e.target.value)}
          className="h-7 pr-7"
          autoComplete="off"
          aria-label="Medicine"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear medicine"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 min-w-[320px] max-w-[520px] rounded-lg border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="flex items-center border-b px-2">
            <Search className="mr-2 size-3.5 text-muted-foreground" />
            <input
              id={searchInputId}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="h-8 w-full bg-transparent py-1.5 text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {loading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No products found</div>
            )}
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={value === product.name}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm',
                  value === product.name ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                )}
                onClick={() => handleSelect(product.name)}
              >
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Qty: {product.currentStock}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { MedicineSelect }
export type { ProductOption }
