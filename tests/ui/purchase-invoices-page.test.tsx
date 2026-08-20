import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import PurchaseInvoicesPage from '@/app/purchase-invoices/page'

const mockSuppliers = [
  { id: 'supp-1', supplierName: 'Om Sai Medical', contactPerson: 'Rajesh', phone: '9876543210', email: 'om@test.com', address: 'Mumbai', gstNumber: 'GSTIN1234567890', openingBalance: 0, status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'supp-2', supplierName: 'HealthCare Distributors', contactPerson: 'Amit', phone: '9876543211', email: 'hc@test.com', address: 'Delhi', gstNumber: 'GSTIN0987654321', openingBalance: 0, status: 'ACTIVE', createdAt: new Date().toISOString() },
]

const mockProducts = [
  { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', purchasePrice: 10, unit: 'strip' },
  { id: 'prod-2', name: 'Face Mask', sku: 'MED002', purchasePrice: 5, unit: 'pcs' },
  { id: 'prod-3', name: 'Weight Loss Tea', sku: 'MED003', purchasePrice: 50, unit: 'packet' },
]

const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'PINV-20260820-0001',
    invoiceDate: '2026-08-20',
    supplierId: 'supp-1',
    paymentMode: 'BANK',
    dueDate: '2026-08-21',
    notes: 'Test',
    subtotal: 1000,
    tax: 120,
    grandTotal: 1120,
    paid: 0,
    balance: 1120,
    status: 'PENDING',
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    items: [
      { id: 'item-1', productId: 'prod-1', quantity: 10, purchaseRate: 100, amount: 1000, batchNumber: 'BATCH-001', expiryDate: '2026-12-31', product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' } },
    ],
  },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/purchase-invoices')) {
    if (url.includes('/api/purchase-invoices/') && !url.includes('?')) {
      return {
        ok: true,
        json: async () => ({ invoice: mockInvoices[0] }),
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ invoices: mockInvoices }),
    } as Response
  }
  if (url.includes('/api/suppliers')) {
    return {
      ok: true,
      json: async () => ({ suppliers: mockSuppliers }),
    } as Response
  }
  if (url.includes('/api/products')) {
    return {
      ok: true,
      json: async () => ({ products: mockProducts }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Purchase Invoices Page UI', () => {
  beforeEach(() => {
    render(<PurchaseInvoicesPage />)
  })

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Purchase Invoices', level: 1 })).toBeDefined()
    })
  })

  it('renders New Purchase Invoice button', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
  })

  it('shows create form when New Purchase Invoice is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Invoice Date')).toBeDefined()
    })
  })

  it('shows supplier searchable select in form', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Invoice Date')).toBeDefined()
    })
    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    expect(supplierLabel).toBeDefined()
    const form = supplierLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('shows product searchable select in form items', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Invoice Date')).toBeDefined()
    })
    const productHeader = screen.getByRole('columnheader', { name: 'Product' })
    expect(productHeader).toBeDefined()
    const table = productHeader.closest('table')
    expect(table).not.toBeNull()
    const comboboxes = table!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('renders invoice table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('PINV-20260820-0001')).toBeDefined()
    })
    expect(screen.getByText('Om Sai Medical')).toBeDefined()
    expect(screen.getByText('PENDING')).toBeDefined()
  })

  it('shows invoice count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/1 invoice\(s\) in the system/)).toBeDefined()
    })
  })

  it('opens invoice detail view when eye icon is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('PINV-20260820-0001')).toBeDefined()
    })
    const eyeButtons = screen.getAllByRole('button', { name: '' })
    act(() => {
      fireEvent.click(eyeButtons[0])
    })
    await waitFor(() => {
      expect(screen.getByText('Purchase Invoice: PINV-20260820-0001')).toBeDefined()
    })
  })
})
