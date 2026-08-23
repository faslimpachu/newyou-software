import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, cleanup, within } from '@testing-library/react'
import InventoryAdjustmentsPage from '@/app/inventory-adjustments/page'

const mockAdjustments = [
  {
    id: 'adj-1',
    productId: 'prod-1',
    type: 'ADJUSTMENT_IN',
    quantity: 50,
    batchId: 'batch-1',
    referenceType: 'ADJUSTMENT',
    notes: 'Found stock',
    createdAt: new Date().toISOString(),
    product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' },
    batch: { id: 'batch-1', batchNumber: 'BATCH-001' },
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

const defaultFetch = async (url: string) => {
  if (url.includes('/api/inventory-adjustments')) {
    return {
      ok: true,
      json: async () => ({ adjustments: mockAdjustments, page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    } as Response
  }
  if (url.includes('/api/products') && !url.includes('/api/products/')) {
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
  if (url.includes('/api/batches')) {
    return {
      ok: true,
      json: async () => ({ batches: mockBatches }),
    } as Response
  }
  if (url.includes('/api/config')) {
    return {
      ok: true,
      json: async () => ({ allowManualSale: true }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

beforeEach(() => {
  global.fetch = defaultFetch
})

afterEach(() => {
  cleanup()
})

function openForm() {
  render(<InventoryAdjustmentsPage />)
  const button = screen.getByRole('button', { name: /New Adjustment/i })
  act(() => {
    fireEvent.click(button)
  })
  return screen.getByText('Create Inventory Adjustment')
}

function getProductButton() {
  const form = document.querySelector('form')!
  return form.querySelector('[role="combobox"]') as HTMLElement
}

function getBatchButton() {
  const form = document.querySelector('form')!
  const comboboxes = form.querySelectorAll('[role="combobox"]')
  return comboboxes[2] as HTMLElement
}

function getSupplierButton() {
  const form = document.querySelector('form')!
  const comboboxes = form.querySelectorAll('[role="combobox"]')
  return comboboxes[3] as HTMLElement
}

async function waitForDropdownOpen(button: HTMLElement) {
  await waitFor(() => {
    const popup = document.querySelector(`[id="${button.id}-popup"]`)
    expect(popup?.hasAttribute('data-open')).toBe(true)
  })
}

async function selectOption(button: HTMLElement, pattern: RegExp | string) {
  await waitForDropdownOpen(button)
  const option = await waitFor(() => screen.getByRole('option', { name: pattern }))
  act(() => {
    fireEvent.click(option)
  })
  await waitFor(() => {
    const popup = document.querySelector(`[id="${button.id}-popup"]`)
    expect(popup?.hasAttribute('data-open')).toBe(false)
  })
}

describe('Inventory Adjustments Page UI', () => {
  describe('rendering', () => {
    it('renders adjustment history table', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('Adjustment History')).toBeDefined()
      })
    })

    it('displays existing adjustments', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeDefined()
      })
      expect(screen.getByText(/Found stock/)).toBeDefined()
    })

    it('shows adjustment type badge', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('Adjustment In')).toBeDefined()
      })
    })

    it('renders New Adjustment button', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('New Adjustment')).toBeDefined()
      })
    })

    it('displays adjustment quantity with sign', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('+50')).toBeDefined()
      })
    })
  })

  describe('form visibility and fields', () => {
    it('opens adjustment form when New Adjustment is clicked', async () => {
      openForm()
      expect(screen.getByText('Create Inventory Adjustment')).toBeDefined()
    })

    it('shows operation radio buttons in form', async () => {
      openForm()
      expect(screen.getByText('Increase')).toBeDefined()
      expect(screen.getByText('Decrease')).toBeDefined()
    })

    it('shows reason dropdown in form', async () => {
      openForm()
      expect(screen.getByText('Reason *')).toBeDefined()
    })

    it('shows quantity input in form', async () => {
      openForm()
      expect(screen.getByText('Quantity *')).toBeDefined()
    })

    it('shows batch selector in form', async () => {
      openForm()
      expect(screen.getByText('Batch *')).toBeDefined()
    })

    it('shows notes field in form', async () => {
      openForm()
      expect(screen.getByLabelText('Notes')).toBeDefined()
    })

    it('shows submit button in form', async () => {
      openForm()
      expect(screen.getByRole('button', { name: /Increase Stock/i })).toBeDefined()
    })

    it('shows cancel button in form', async () => {
      openForm()
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeDefined()
    })
  })

  describe('operation-dependent fields', () => {
    it('shows supplier field for increase operation', async () => {
      openForm()
      expect(screen.getByText('Supplier *')).toBeDefined()
    })

    it('shows unit cost field for increase operation', async () => {
      openForm()
      expect(screen.getByText('Unit Cost *')).toBeDefined()
    })

    it('hides supplier field when switching to decrease', async () => {
      openForm()
      expect(screen.getByText('Supplier *')).toBeDefined()

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      expect(screen.queryByText('Supplier *')).toBeNull()
    })

    it('hides unit cost field when switching to decrease', async () => {
      openForm()
      expect(screen.getByText('Unit Cost *')).toBeDefined()

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      expect(screen.queryByText('Unit Cost *')).toBeNull()
    })

    it('updates submit button text for decrease operation', async () => {
      openForm()
      expect(screen.getByRole('button', { name: /Increase Stock/i })).toBeDefined()

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      expect(screen.getByRole('button', { name: /Decrease Stock/i })).toBeDefined()
    })
  })

  describe('reason dropdown options', () => {
    it('shows increase reasons by default', async () => {
      openForm()
      const reasonLabel = screen.getByText('Reason *')
      const selectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(selectTrigger!)
      })

      await waitFor(() => {
        expect(screen.getByText('Adjustment In (found stock)')).toBeDefined()
        expect(screen.getByText('Opening Stock')).toBeDefined()
      })
    })

    it('shows decrease reasons when Decrease is selected', async () => {
      openForm()
      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const reasonLabel = screen.getByText('Reason *')
      const selectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(selectTrigger!)
      })

      await waitFor(() => {
        expect(screen.getByText('Adjustment Out (correction)')).toBeDefined()
        expect(screen.getByText('Damaged')).toBeDefined()
        expect(screen.getByText('Expired')).toBeDefined()
        expect(screen.getByText('Lost')).toBeDefined()
      })
    })

    it('shows SALE option for decrease when allowed', async () => {
      openForm()
      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const reasonLabel = screen.getByText('Reason *')
      const selectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(selectTrigger!)
      })

      await waitFor(() => {
        expect(screen.getByText('Sale')).toBeDefined()
      })
    })

    it('does not show SALE option when manually disabled', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/config')) {
          return {
            ok: true,
            json: async () => ({ allowManualSale: false }),
          } as Response
        }
        return defaultFetch(url)
      }

      openForm()
      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const reasonLabel = screen.getByText('Reason *')
      const selectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(selectTrigger!)
      })

      await waitFor(() => {
        expect(screen.queryByText('Sale')).toBeNull()
      })

      global.fetch = originalFetch
    })

    it('hides increase reasons when switching to decrease', async () => {
      openForm()
      const reasonLabel = screen.getByText('Reason *')
      const selectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(selectTrigger!)
      })

      await waitFor(() => {
        expect(screen.getByText('Adjustment In (found stock)')).toBeDefined()
      })

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const newSelectTrigger = reasonLabel.closest('div')?.querySelector('button')
      act(() => {
        fireEvent.click(newSelectTrigger!)
      })

      await waitFor(() => {
        expect(screen.queryByText('Adjustment In (found stock)')).toBeNull()
        expect(screen.queryByText('Opening Stock')).toBeNull()
      })
    })
  })

  describe('product selection and stock display', () => {
    it('shows total stock and available stock after product selection', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      await waitFor(() => {
        expect(screen.getByText(/Total Stock: 150 strip/)).toBeDefined()
        expect(screen.getByText(/Available: 100 strip/)).toBeDefined()
      })
    })

    it('shows expired count when batches include expired', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: [
                { id: 'batch-1', batchNumber: 'BATCH-001', expiryDate: null, quantity: 100, status: 'OK' },
                { id: 'batch-2', batchNumber: 'BATCH-002', expiryDate: new Date(Date.now() - 86400000).toISOString(), quantity: 50, status: 'EXPIRED' },
              ],
            }),
          } as Response
        }
        if (url.includes('/api/config')) {
          return { ok: true, json: async () => ({ allowManualSale: true }) } as Response
        }
        return defaultFetch(url)
      }

      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      await waitFor(() => {
        expect(screen.getByText(/Total Stock: 150 strip/)).toBeDefined()
        expect(screen.getByText(/Available: 100 strip/)).toBeDefined()
        expect(screen.getByText(/\(50 expired\)/)).toBeDefined()
      })

      global.fetch = originalFetch
    })

    it('clears batch selection when product changes', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      await waitFor(() => {
        expect(screen.getByText('BATCH-001')).toBeDefined()
      })

      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      await waitFor(() => {
        expect(screen.getByText('BATCH-001')).toBeDefined()
      })
    })
  })

  describe('batch selection and warnings', () => {
    it('loads batches when product is selected', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      await waitFor(() => {
        expect(screen.getByText('BATCH-001')).toBeDefined()
      })
    })

    it('shows batch quantity and status in dropdown', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      await waitFor(() => {
        expect(screen.getAllByText(/BATCH-001 \(100 units\)/).length).toBeGreaterThan(0)
      })
    })

    it('shows expired batch warning when expired batch is selected', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: [
                { id: 'batch-1', batchNumber: 'BATCH-001', expiryDate: new Date(Date.now() - 86400000).toISOString(), quantity: 100, status: 'EXPIRED' },
              ],
            }),
          } as Response
        }
        if (url.includes('/api/config')) {
          return { ok: true, json: async () => ({ allowManualSale: true }) } as Response
        }
        return defaultFetch(url)
      }

      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      await waitFor(() => {
        expect(screen.getByText('This batch has expired. Use Expired reason to write it off.')).toBeDefined()
      })

      global.fetch = originalFetch
    })

    it('shows expiring soon warning when batch is expiring soon', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: [
                { id: 'batch-1', batchNumber: 'BATCH-001', expiryDate: new Date(Date.now() + 86400000).toISOString(), quantity: 100, status: 'EXPIRING_SOON' },
              ],
            }),
          } as Response
        }
        if (url.includes('/api/config')) {
          return { ok: true, json: async () => ({ allowManualSale: true }) } as Response
        }
        return defaultFetch(url)
      }

      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      await waitFor(() => {
        expect(screen.getByText('This batch is expiring soon. Consider writing it off if needed.')).toBeDefined()
      })

      global.fetch = originalFetch
    })

    it('shows max available hint for decrease when batch is selected', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      await waitFor(() => {
        expect(screen.getByText('Max available: 100 units')).toBeDefined()
      })
    })
  })

  describe('form validation', () => {
    it('validates that product is required', async () => {
      openForm()
      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Please select a product')).toBeDefined()
      })
    })

    it('validates that quantity must be greater than zero', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Quantity must be greater than zero')).toBeDefined()
      })
    })

    it('validates that batch is required for decrease', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const submitButton = screen.getByRole('button', { name: /Decrease Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Please select a batch for decrease operations')).toBeDefined()
      })
    })

    it('validates that unit cost is required for increase', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Unit cost is required and must be greater than zero for increases')).toBeDefined()
      })
    })

    it('validates that quantity cannot exceed batch stock for decrease', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '200' } })
      })

      const submitButton = screen.getByRole('button', { name: /Decrease Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText(/Quantity cannot exceed batch stock/)).toBeDefined()
      })
    })
  })

  describe('decrease confirmation dialog', () => {
    it('shows confirmation dialog for decrease operations', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const submitButton = screen.getByRole('button', { name: /Decrease Stock/i })
      act(() => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getAllByText('Confirm Decrease').length).toBeGreaterThan(0)
      })
    })

    it('cancels decrease when confirmation is dismissed', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const decreaseRadio = screen.getByLabelText('Decrease')
      act(() => {
        fireEvent.click(decreaseRadio)
      })

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)

      await selectOption(batchButton, /BATCH-001/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const submitButton = screen.getByRole('button', { name: /Decrease Stock/i })
      act(() => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getAllByText('Confirm Decrease').length).toBeGreaterThan(0)
      })

      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i })
      act(() => {
        fireEvent.click(cancelButtons[cancelButtons.length - 1])
      })

      await waitFor(() => {
        expect(screen.queryByText('Confirm Decrease')).toBeNull()
      })
    })
  })

  describe('help section', () => {
    it('shows help section when How to Use is clicked', async () => {
      render(<InventoryAdjustmentsPage />)
      const helpButton = screen.getByRole('button', { name: /How to Use/i })
      act(() => {
        fireEvent.click(helpButton)
      })

      await waitFor(() => {
        expect(screen.getByText('How Inventory Adjustments Work')).toBeDefined()
      })
      expect(screen.getByText('Increase Stock')).toBeDefined()
      expect(screen.getByText('Decrease Stock')).toBeDefined()
      expect(screen.getByText('Important Rules')).toBeDefined()
    })

    it('hides help section when How to Use is clicked again', async () => {
      render(<InventoryAdjustmentsPage />)
      const helpButton = screen.getByRole('button', { name: /How to Use/i })
      act(() => {
        fireEvent.click(helpButton)
      })

      await waitFor(() => {
        expect(screen.getByText('How Inventory Adjustments Work')).toBeDefined()
      })

      act(() => {
        fireEvent.click(helpButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('How Inventory Adjustments Work')).toBeNull()
      })
    })
  })

  describe('searchable selects', () => {
    it('opens product search dropdown and shows search input', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)
    })

    it('opens batch search dropdown and shows search input', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const batchButton = getBatchButton()
      act(() => {
        fireEvent.click(batchButton)
      })

      await waitForDropdownOpen(batchButton)
    })

    it('opens supplier search dropdown and shows search input', async () => {
      openForm()
      const supplierButton = getSupplierButton()
      act(() => {
        fireEvent.click(supplierButton)
      })

      await waitForDropdownOpen(supplierButton)
    })
  })

  describe('form submission behavior', () => {
    it('shows success message and closes form after successful increase submission', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const unitCostInput = screen.getByLabelText('Unit Cost *')
      act(() => {
        fireEvent.change(unitCostInput, { target: { value: '12' } })
      })

      const supplierButton = getSupplierButton()
      act(() => {
        fireEvent.click(supplierButton)
      })

      await waitForDropdownOpen(supplierButton)

      await selectOption(supplierButton, /ABC Pharma/i)

      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Adjustment created successfully')).toBeDefined()
      })

      await waitFor(() => {
        expect(screen.queryByText('Create Inventory Adjustment')).toBeNull()
      }, { timeout: 3000 })
    })

    it('reloads adjustment history after successful submission', async () => {
      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const unitCostInput = screen.getByLabelText('Unit Cost *')
      act(() => {
        fireEvent.change(unitCostInput, { target: { value: '12' } })
      })

      const supplierButton = getSupplierButton()
      act(() => {
        fireEvent.click(supplierButton)
      })

      await waitForDropdownOpen(supplierButton)

      await selectOption(supplierButton, /ABC Pharma/i)

      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      await waitFor(() => {
        expect(screen.getByText('Adjustment created successfully')).toBeDefined()
      })

      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeDefined()
      })
    })

    it('shows API error message on failed submission', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-adjustments') && !url.includes('?')) {
          return {
            ok: false,
            json: async () => ({ error: 'Custom API error' }),
          } as Response
        }
        return defaultFetch(url)
      }

      openForm()
      const productButton = getProductButton()
      act(() => {
        fireEvent.click(productButton)
      })

      await waitForDropdownOpen(productButton)

      await selectOption(productButton, /Paracetamol/i)

      const quantityInput = screen.getByLabelText('Quantity *')
      act(() => {
        fireEvent.change(quantityInput, { target: { value: '10' } })
      })

      const unitCostInput = screen.getByLabelText('Unit Cost *')
      act(() => {
        fireEvent.change(unitCostInput, { target: { value: '12' } })
      })

      const supplierButton = getSupplierButton()
      act(() => {
        fireEvent.click(supplierButton)
      })

      await waitForDropdownOpen(supplierButton)

      await selectOption(supplierButton, /ABC Pharma/i)

      const submitButton = screen.getByRole('button', { name: /Increase Stock/i })
      const submitForm = submitButton.closest('form')
      act(() => {
        fireEvent.submit(submitForm!)
      })

      console.log('Body text after submit:', document.body.textContent?.substring(0, 800))
      console.log('Error in body:', document.body.textContent?.includes('Custom API error'))

      await waitFor(() => {
        expect(screen.getByText('Custom API error')).toBeDefined()
      }, { timeout: 5000 })

      global.fetch = originalFetch
    })
  })

  describe('pagination controls', () => {
    it('shows pagination buttons when totalPages > 1', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-adjustments')) {
          return {
            ok: true,
            json: async () => ({
              adjustments: mockAdjustments,
              page: 1,
              pageSize: 1,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return originalFetch(url)
      }

      render(<InventoryAdjustmentsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()

      global.fetch = originalFetch
    })

    it('does not show pagination buttons when totalPages is 1', async () => {
      render(<InventoryAdjustmentsPage />)
      await waitFor(() => {
        expect(screen.getByText('Adjustment History')).toBeDefined()
      })
      expect(screen.queryByRole('button', { name: /Previous/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /Next/i })).toBeNull()
    })
  })
})
