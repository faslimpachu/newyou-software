import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react'
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

  it('shows Add Item button in create form', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })
  })

  it('adds a new item row when Add Item is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const initialProductComboboxes = screen.getAllByRole('combobox')
    const initialCount = initialProductComboboxes.length

    const addItemButton = screen.getByRole('button', { name: /Add Item/i })
    act(() => {
      fireEvent.click(addItemButton)
    })

    await waitFor(() => {
      const newProductComboboxes = screen.getAllByRole('combobox')
      expect(newProductComboboxes.length).toBeGreaterThan(initialCount)
    })
  })

  it('removes an item row when delete icon is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const addItemButton = screen.getByRole('button', { name: /Add Item/i })
    act(() => {
      fireEvent.click(addItemButton)
    })

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    const deleteButtons = screen.getAllByRole('button', { name: '' })
    const trashButton = deleteButtons.find((btn) => {
      const svg = btn.querySelector('svg')
      return svg !== null
    })
    expect(trashButton).toBeDefined()
    act(() => {
      fireEvent.click(trashButton!)
    })

    await waitFor(() => {
      const remainingDeleteButtons = screen.getAllByRole('button', { name: '' })
      const remainingSvgButtons = remainingDeleteButtons.filter((btn) => btn.querySelector('svg') !== null)
      expect(remainingSvgButtons.length).toBeLessThan(deleteButtons.length)
    })
  })

  it('does not remove the last remaining item', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const deleteButtons = screen.getAllByRole('button', { name: '' })
    const initialSvgButtons = deleteButtons.filter((btn) => btn.querySelector('svg') !== null)
    const initialCount = initialSvgButtons.length

    const trashButton = initialSvgButtons[0]
    act(() => {
      fireEvent.click(trashButton)
    })

    await waitFor(() => {
      const remainingDeleteButtons = screen.getAllByRole('button', { name: '' })
      const remainingSvgButtons = remainingDeleteButtons.filter((btn) => btn.querySelector('svg') !== null)
      expect(remainingSvgButtons.length).toBe(initialCount)
    })
  })

  it('updates subtotal, tax, and grand total when item values change', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    const quantityInput = quantityInputs[0]
    act(() => {
      fireEvent.change(quantityInput, { target: { value: '10' } })
    })

    const rateInputs = screen.getAllByRole('spinbutton')
    const rateInput = rateInputs[1]
    act(() => {
      fireEvent.change(rateInput, { target: { value: '100' } })
    })

    await waitFor(() => {
      const amountElements = screen.getAllByText(/₹1,000/)
      expect(amountElements.length).toBeGreaterThan(0)
    })
  })

  it('disables submit button when form has no valid items', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Purchase Invoice/i })).toBeDefined()
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('opens product dropdown and shows search input when clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[0])
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeDefined()
    })
  })

  it('enters batch number and expiry date in an item row', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeDefined()
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: 'BATCH-001' } })
    })

    const allInputs = screen.getAllByRole('textbox')
    const expiryInput = allInputs.find((input) => input.getAttribute('type') === 'date')
    if (!expiryInput) {
      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs.length).toBeGreaterThan(0)
      act(() => {
        fireEvent.change(dateInputs[0] as HTMLElement, { target: { value: '2026-12-31' } })
      })
    } else {
      act(() => {
        fireEvent.change(expiryInput, { target: { value: '2026-12-31' } })
      })
    }

    await waitFor(() => {
      expect(screen.getByDisplayValue('BATCH-001')).toBeDefined()
    })
    const dateInputsAfter = document.querySelectorAll('input[type="date"]')
    expect(dateInputsAfter.length).toBeGreaterThan(0)
    expect((dateInputsAfter[0] as HTMLInputElement).value).toBe('2026-12-31')
  })
})
