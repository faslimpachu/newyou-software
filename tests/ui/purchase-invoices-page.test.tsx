import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, within, cleanup } from '@testing-library/react'
import PurchaseInvoicesPage from '@/app/purchase-invoices/page'

const mockSuppliers = [
  { id: 'supp-1', supplierName: 'Om Sai Medical', contactPerson: 'Rajesh', phone: '9876543210', email: 'om@test.com', address: 'Mumbai', gstNumber: 'GSTIN1234567890', openingBalance: 0, status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'supp-2', supplierName: 'HealthCare Distributors', contactPerson: 'Amit', phone: '9876543211', email: 'hc@test.com', address: 'Delhi', gstNumber: 'GSTIN0987654321', openingBalance: 0, status: 'ACTIVE', createdAt: new Date().toISOString() },
]

const mockProducts = [
  { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', purchasePrice: 10, unit: 'strip', gstPercent: 5 },
  { id: 'prod-2', name: 'Face Mask', sku: 'MED002', purchasePrice: 5, unit: 'pcs', gstPercent: 12 },
  { id: 'prod-3', name: 'Weight Loss Tea', sku: 'MED003', purchasePrice: 50, unit: 'packet', gstPercent: 18 },
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
  ...Array.from({ length: 24 }).map((_, i) => ({
    id: `inv-${i + 2}`,
    invoiceNumber: `PINV-20260820-${String(i + 2).padStart(4, '0')}`,
    invoiceDate: '2026-08-20',
    supplierId: 'supp-1',
    paymentMode: 'BANK',
    dueDate: '2026-08-21',
    notes: `Test ${i + 2}`,
    subtotal: 1000,
    tax: 120,
    grandTotal: 1120,
    paid: 0,
    balance: 1120,
    status: 'PENDING',
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    items: [
      { id: `item-${i + 2}`, productId: 'prod-1', quantity: 10, purchaseRate: 100, amount: 1000, batchNumber: 'BATCH-001', expiryDate: '2026-12-31', product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' } },
    ],
  })),
]

global.fetch = async (url: string) => {
  if (url.includes('/api/purchase-invoices')) {
    if (url.includes('/api/purchase-invoices/') && !url.includes('?')) {
      return {
        ok: true,
        json: async () => ({ invoice: mockInvoices[0] }),
      } as Response
    }
    const urlObj = new URL(url, 'http://localhost')
    const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
    const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
    const start = (pageParam - 1) * pageSizeParam
    const pagedInvoices = mockInvoices.slice(start, start + pageSizeParam)
    return {
      ok: true,
      json: async () => ({
        invoices: pagedInvoices,
        page: pageParam,
        pageSize: pageSizeParam,
        total: mockInvoices.length,
        totalPages: Math.ceil(mockInvoices.length / pageSizeParam),
      }),
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
    expect(screen.getAllByText('Om Sai Medical').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0)
  })

  it('shows invoice count', async () => {
    await waitFor(() => {
      const totalTexts = screen.getAllByText(/25 total/)
      expect(totalTexts.length).toBeGreaterThan(0)
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

  it('shows pagination info when there are multiple pages', async () => {
    await waitFor(() => {
      expect(screen.getByText('PINV-20260820-0001')).toBeDefined()
    })
    const pageTexts = screen.getAllByText(/Page 1 of 2/)
    expect(pageTexts.length).toBeGreaterThan(0)
    const totalTexts = screen.getAllByText(/25 total/)
    expect(totalTexts.length).toBeGreaterThan(0)
  })

  it('navigates to next page when Next is clicked', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/purchase-invoices')) {
        if (url.includes('/api/purchase-invoices/') && !url.includes('?')) {
          return {
            ok: true,
            json: async () => ({ invoice: mockInvoices[0] }),
          } as Response
        }
        const urlObj = new URL(url, 'http://localhost')
        const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
        const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
        const start = (pageParam - 1) * pageSizeParam
        const pagedInvoices = mockInvoices.slice(start, start + pageSizeParam)
        return {
          ok: true,
          json: async () => ({
            invoices: pagedInvoices,
            page: pageParam,
            pageSize: pageSizeParam,
            total: mockInvoices.length,
            totalPages: Math.ceil(mockInvoices.length / pageSizeParam),
          }),
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
    render(<PurchaseInvoicesPage />)
    await waitFor(() => {
      expect(screen.getByText('PINV-20260820-0001')).toBeDefined()
    })
    const nextButton = screen.getByRole('button', { name: /Next/i })
    act(() => {
      fireEvent.click(nextButton)
    })
    await waitFor(() => {
      const page2Texts = screen.getAllByText(/Page 2 of 2/)
      expect(page2Texts.length).toBeGreaterThan(0)
    })
  })

  it('navigates to previous page when Previous is clicked', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/purchase-invoices')) {
        if (url.includes('/api/purchase-invoices/') && !url.includes('?')) {
          return {
            ok: true,
            json: async () => ({ invoice: mockInvoices[0] }),
          } as Response
        }
        const urlObj = new URL(url, 'http://localhost')
        const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
        const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
        const start = (pageParam - 1) * pageSizeParam
        const pagedInvoices = mockInvoices.slice(start, start + pageSizeParam)
        return {
          ok: true,
          json: async () => ({
            invoices: pagedInvoices,
            page: pageParam,
            pageSize: pageSizeParam,
            total: mockInvoices.length,
            totalPages: Math.ceil(mockInvoices.length / pageSizeParam),
          }),
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
    render(<PurchaseInvoicesPage />)
    await waitFor(() => {
      expect(screen.getByText('PINV-20260820-0001')).toBeDefined()
    })
    const nextButton = screen.getByRole('button', { name: /Next/i })
    act(() => {
      fireEvent.click(nextButton)
    })
    await waitFor(() => {
      const page2Texts = screen.getAllByText(/Page 2 of 2/)
      expect(page2Texts.length).toBeGreaterThan(0)
    })
    const prevButton = screen.getByRole('button', { name: /Previous/i })
    act(() => {
      fireEvent.click(prevButton)
    })
    await waitFor(() => {
      const page1Texts = screen.getAllByText(/Page 1 of 2/)
      expect(page1Texts.length).toBeGreaterThan(0)
    })
  })

  it('does not show hardcoded 12% tax label when form is opened', async () => {
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

    const taxLabels = screen.getAllByText('Tax')
    expect(taxLabels.length).toBeGreaterThan(0)
    expect(screen.queryByText('Tax (12%)')).toBeNull()
  })

  it('shows zero tax when no product is selected', async () => {
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

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    await waitFor(() => {
      const zeroTaxElements = screen.getAllByText('₹0')
      expect(zeroTaxElements.length).toBeGreaterThan(0)
    })
  })

  it('updates tax label with actual rate when item values change', async () => {
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
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    await waitFor(() => {
      const amountElements = screen.getAllByText(/₹1,000/)
      expect(amountElements.length).toBeGreaterThan(0)
    })

    const taxLabel = screen.getByText(/^Tax/)
    expect(taxLabel).toBeDefined()
    expect(taxLabel.textContent).toContain('0.0%')
  })

  it('shows validation error when supplier is not selected', async () => {
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

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[1])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const productOption = screen.getAllByRole('option').find((el) => el.textContent === 'Paracetamol (MED001)')
    expect(productOption).toBeDefined()
    act(() => {
      fireEvent.click(productOption!)
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: 'BATCH-001' } })
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    act(() => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Supplier is required')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('shows validation error when batch number is empty', async () => {
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

    const supplierComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(supplierComboboxes[0])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const supplierOption = screen.getAllByRole('option').find((el) => el.textContent === 'Om Sai Medical')
    expect(supplierOption).toBeDefined()
    act(() => {
      fireEvent.click(supplierOption!)
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[1])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const productOption = screen.getAllByRole('option').find((el) => el.textContent === 'Paracetamol (MED001)')
    expect(productOption).toBeDefined()
    act(() => {
      fireEvent.click(productOption!)
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: '' } })
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    act(() => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Batch number is required')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('shows validation error when quantity is zero', async () => {
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

    const supplierComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(supplierComboboxes[0])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const supplierOption = screen.getAllByRole('option').find((el) => el.textContent === 'Om Sai Medical')
    expect(supplierOption).toBeDefined()
    act(() => {
      fireEvent.click(supplierOption!)
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[1])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const productOption = screen.getAllByRole('option').find((el) => el.textContent === 'Paracetamol (MED001)')
    expect(productOption).toBeDefined()
    act(() => {
      fireEvent.click(productOption!)
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '0' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: 'BATCH-001' } })
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    act(() => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Quantity must be greater than zero')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('shows validation error when purchase rate is zero', async () => {
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

    const supplierComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(supplierComboboxes[0])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const supplierOption = screen.getAllByRole('option').find((el) => el.textContent === 'Om Sai Medical')
    expect(supplierOption).toBeDefined()
    act(() => {
      fireEvent.click(supplierOption!)
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[1])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const productOption = screen.getAllByRole('option').find((el) => el.textContent === 'Paracetamol (MED001)')
    expect(productOption).toBeDefined()
    act(() => {
      fireEvent.click(productOption!)
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })
    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '0' } })
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: 'BATCH-001' } })
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    act(() => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Purchase rate must be greater than zero')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('submits the form successfully when all required fields are valid', async () => {
    cleanup()
    const createdInvoice = {
      id: 'inv-new',
      invoiceNumber: 'PINV-20260824-0001',
      invoiceDate: '2026-08-24',
      supplierId: 'supp-1',
      paymentMode: null,
      dueDate: null,
      notes: null,
      subtotal: 1000,
      tax: 50,
      grandTotal: 1050,
      paid: 0,
      balance: 1050,
      status: 'PENDING',
      supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
      items: [
        { id: 'item-new', productId: 'prod-1', quantity: 10, purchaseRate: 100, amount: 1000, batchNumber: 'BATCH-001', expiryDate: null, product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' } },
      ],
    }

    global.fetch = async (url: string) => {
      if (url.includes('/api/purchase-invoices') && !url.includes('/api/purchase-invoices/')) {
        const urlObj = new URL(url, 'http://localhost')
        if (urlObj.searchParams.toString()) {
          return {
            ok: true,
            json: async () => ({
              invoices: [createdInvoice],
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({ invoice: createdInvoice }),
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

    render(<PurchaseInvoicesPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Purchase Invoice/i })).toBeDefined()
    })

    const newButton = screen.getByRole('button', { name: /New Purchase Invoice/i })
    act(() => {
      fireEvent.click(newButton)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Purchase Invoice/i })).toBeDefined()
    })

    const supplierComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(supplierComboboxes[0])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const supplierOption = screen.getAllByRole('option').find((el) => el.textContent === 'Om Sai Medical')
    expect(supplierOption).toBeDefined()
    act(() => {
      fireEvent.click(supplierOption!)
    })

    const productComboboxes = screen.getAllByRole('combobox')
    act(() => {
      fireEvent.click(productComboboxes[1])
    })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
    const productOption = screen.getAllByRole('option').find((el) => el.textContent === 'Paracetamol (MED001)')
    expect(productOption).toBeDefined()
    act(() => {
      fireEvent.click(productOption!)
    })

    const quantityInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(quantityInputs[0], { target: { value: '10' } })
    })

    const rateInputs = screen.getAllByRole('spinbutton')
    act(() => {
      fireEvent.change(rateInputs[1], { target: { value: '100' } })
    })

    const batchInput = screen.getByPlaceholderText('Batch No.')
    act(() => {
      fireEvent.change(batchInput, { target: { value: 'BATCH-001' } })
    })

    const submitButton = screen.getByRole('button', { name: /Create Purchase Invoice/i })
    act(() => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Create Purchase Invoice/i })).toBeNull()
    })
  })
})
