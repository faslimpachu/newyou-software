import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import ProductsPage from '@/app/products/page'

const mockProducts = [
  {
    id: '1',
    name: 'Paracetamol',
    code: 'PRD-001',
    sku: 'MED001',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Medicines' },
    unit: 'strip',
    purchasePrice: 10,
    sellingPrice: 15,
    gstPercent: 5,
    minimumStock: 50,
    maximumStock: 200,
    currentStock: 500,
    imageUrl: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/products')) {
    return {
      ok: true,
      json: async () => ({ products: mockProducts }),
    } as Response
  }
  if (url.includes('/api/product-categories')) {
    return {
      ok: true,
      json: async () => ({ categories: [{ id: 'cat-1', name: 'Medicines', active: true }] }),
    } as Response
  }
  if (url.includes('/api/products/low-stock')) {
    return {
      ok: true,
      json: async () => ({ count: 0 }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Products Page UI', () => {
  beforeEach(() => {
    render(<ProductsPage />)
  })

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Products', level: 1 })).toBeDefined()
    })
  })

  it('renders products table with product data', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.getByText('PRD-001')).toBeDefined()
    expect(screen.getByText('MED001')).toBeDefined()
  })

  it('shows product count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/1 product\(s\) in the system/)).toBeDefined()
    })
  })

  it('renders create product form title', async () => {
    await waitFor(() => {
      const elements = screen.getAllByText('Create Product')
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows product form fields', async () => {
    await waitFor(() => {
      expect(screen.getByLabelText('Product Name')).toBeDefined()
    })
    expect(screen.getByLabelText('SKU')).toBeDefined()
    expect(screen.getByLabelText('GST %')).toBeDefined()
  })

  it('shows edit button for products', async () => {
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeDefined()
    })
  })

  it('displays stock values in table', async () => {
    await waitFor(() => {
      expect(screen.getByText('500 strip')).toBeDefined()
    })
  })
})
