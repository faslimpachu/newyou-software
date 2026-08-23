import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import InventoryAdjustmentsPage from '@/app/inventory-adjustments/page'

const mockAdjustments = [
  {
    id: 'adj-1',
    productId: 'prod-1',
    type: 'ADJUSTMENT_IN',
    quantity: 50,
    referenceType: 'ADJUSTMENT',
    notes: 'Found stock',
    createdAt: new Date().toISOString(),
    product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' },
  },
]

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Paracetamol',
    sku: 'MED001',
    currentStock: 150,
    unit: 'strip',
  },
]

const mockBatches = [
  {
    id: 'batch-1',
    batchNumber: 'BATCH-001',
    expiryDate: null,
    quantity: 100,
    status: 'OK',
  },
]

const mockSuppliers = [
  { id: 'supp-1', supplierName: 'ABC Pharma' },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/inventory-adjustments')) {
    return {
      ok: true,
      json: async () => ({ adjustments: mockAdjustments, page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    } as Response
  }
  if (url.includes('/api/products')) {
    return {
      ok: true,
      json: async () => ({ products: mockProducts }),
    } as Response
  }
  if (url.includes('/api/suppliers')) {
    return {
      ok: true,
      json: async () => ({ suppliers: mockSuppliers }),
    } as Response
  }
  if (url.includes('/api/products/') && url.includes('/batches')) {
    return {
      ok: true,
      json: async () => ({ batches: mockBatches }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Inventory Adjustments Page UI', () => {
  beforeEach(() => {
    render(<InventoryAdjustmentsPage />)
  })

  it('renders adjustment history table', async () => {
    await waitFor(() => {
      expect(screen.getByText('Adjustment History')).toBeDefined()
    })
  })

  it('displays existing adjustments', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.getByText(/Found stock/)).toBeDefined()
  })

  it('shows adjustment type badge', async () => {
    await waitFor(() => {
      expect(screen.getByText('Adjustment In')).toBeDefined()
    })
  })

  it('renders New Adjustment button', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
  })

  it('displays adjustment quantity with sign', async () => {
    await waitFor(() => {
      expect(screen.getByText('+50')).toBeDefined()
    })
  })

  it('shows product searchable select when New Adjustment is opened', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })
    const productLabels = screen.getAllByText('Product')
    const productLabel = productLabels.find((el) => el.tagName === 'LABEL')
    expect(productLabel).toBeDefined()
    const form = productLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('shows batch searchable select when New Adjustment is opened', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })
    const batchLabels = screen.getAllByText('Batch')
    const batchLabel = batchLabels.find((el) => el.tagName === 'LABEL')
    expect(batchLabel).toBeDefined()
    const form = batchLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('shows supplier searchable select when New Adjustment is opened', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })
    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    expect(supplierLabel).toBeDefined()
    const form = supplierLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('opens product search dropdown and shows search input', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })
    const productLabels = screen.getAllByText('Product')
    const productLabel = productLabels.find((el) => el.tagName === 'LABEL')
    const form = productLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    act(() => {
      fireEvent.click(comboboxes[0])
    })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeDefined()
    })
  })

  it('opens batch search dropdown and shows search input', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[0])
    })

    const paracetamolOption = await waitFor(() => screen.getByText('Paracetamol'))
    act(() => {
      fireEvent.click(paracetamolOption)
    })

    await waitFor(() => {
      const allComboboxes = screen.getAllByRole('combobox')
      expect(allComboboxes.length).toBeGreaterThanOrEqual(2)
    })

    const allComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(allComboboxes[1])
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeDefined()
    })
  })

  it('opens supplier search dropdown and shows search input', async () => {
    await waitFor(() => {
      expect(screen.getByText('New Adjustment')).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Adjustment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })
    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    const form = supplierLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    act(() => {
      fireEvent.click(comboboxes[2])
    })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeDefined()
    })
  })
})
