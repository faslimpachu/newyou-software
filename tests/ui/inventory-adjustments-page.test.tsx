import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
      json: async () => ({ adjustments: mockAdjustments }),
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
})
