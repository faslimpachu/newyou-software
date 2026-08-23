import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react'
import { within } from '@testing-library/react'
import SuppliersPage from '@/app/suppliers/page'

const mockSuppliers = [
  {
    id: '1',
    supplierName: 'ABC Pharma',
    contactPerson: 'Rajesh Kumar',
    phone: '9876543210',
    email: 'rajesh@abcpharma.com',
    address: '123 Industrial Area, Mumbai',
    gstNumber: 'GSTIN1234567890',
    openingBalance: 15000,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
]

const mockLedger = {
  supplier: mockSuppliers[0],
  ledger: {
    totalPurchases: 2500,
    totalPayments: 2800,
    outstandingBalance: 14700,
    lastPurchaseDate: new Date().toISOString(),
  },
  recentPurchases: [],
  recentPayments: [],
}

const defaultFetch = async (url: string) => {
  if (url.includes('/api/suppliers')) {
    if (url.includes('/api/suppliers/1')) {
      return {
        ok: true,
        json: async () => mockLedger,
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ suppliers: mockSuppliers, page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Suppliers Page UI', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    global.fetch = defaultFetch
    render(<SuppliersPage />)
  })

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Suppliers', level: 1 })).toBeDefined()
    })
  })

  it('renders create supplier button', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Supplier')).toBeDefined()
    })
  })

  it('shows empty state when no suppliers', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/suppliers')) {
        return {
          ok: true,
          json: async () => ({ suppliers: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('No suppliers found')).toBeDefined()
    })
  })

  it('renders suppliers table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    expect(screen.getByText('Rajesh Kumar')).toBeDefined()
    expect(screen.getByText('98765 43210')).toBeDefined()
    expect(screen.getByText('rajesh@abcpharma.com')).toBeDefined()
    expect(screen.getByText('GSTIN1234567890')).toBeDefined()
  })

  it('shows supplier count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/1 supplier/)).toBeDefined()
    })
  })

  it('shows create form when Create Supplier is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Supplier')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Supplier')
    fireEvent.click(createButtons[createButtons.length - 1])
    expect(screen.getByText('Add a new supplier to the system')).toBeDefined()
    expect(screen.getByLabelText('Supplier Name *')).toBeDefined()
    expect(screen.getByLabelText('Opening Balance')).toBeDefined()
  })

  it('allows entering opening balance value', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Supplier')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Supplier')
    fireEvent.click(createButtons[createButtons.length - 1])
    const openingBalanceInput = screen.getByLabelText('Opening Balance')
    fireEvent.change(openingBalanceInput, { target: { value: '5000' } })
    expect(openingBalanceInput).toHaveValue(5000)
  })

  it('shows validation error for empty supplier name on submit', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Supplier')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Supplier')
    fireEvent.click(createButtons[createButtons.length - 1])
    const submitButton = screen.getByRole('button', { name: 'Create Supplier' })
    fireEvent.click(submitButton)
    expect(screen.getByText('Supplier name is required')).toBeDefined()
  })

  it('displays formatted opening balance', async () => {
    await waitFor(() => {
      expect(screen.getByText('₹15,000')).toBeDefined()
    })
  })

  it('displays ACTIVE badge', async () => {
    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeDefined()
    })
  })

  it('shows view edit and delete actions for supplier', async () => {
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    expect(screen.getByText('Edit')).toBeDefined()
  })

  it('hides pagination when there is only one page', async () => {
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    expect(screen.queryByText('Previous')).toBeNull()
    expect(screen.queryByText('Next')).toBeNull()
  })

  it('shows pagination controls when there are multiple pages', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/suppliers')) {
        return {
          ok: true,
          json: async () => ({ suppliers: mockSuppliers, page: 1, pageSize: 20, total: 25, totalPages: 2 }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeDefined()
    })
    expect(screen.getByText('Next')).toBeDefined()
    expect(screen.getByText('Page 1 of 2 (25 total)')).toBeDefined()
  })

  it('disables Previous button on page 1', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/suppliers')) {
        return {
          ok: true,
          json: async () => ({ suppliers: mockSuppliers, page: 1, pageSize: 20, total: 25, totalPages: 2 }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeDefined()
    })
    const prevButton = screen.getByText('Previous')
    expect(prevButton).toHaveProperty('disabled', true)
  })

  it('navigates to next page when Next is clicked', async () => {
    cleanup()
    let callCount = 0
    global.fetch = async (url: string) => {
      callCount++
      if (url.includes('/api/suppliers')) {
        const pageNum = url.includes('page=2') ? 2 : 1
        return {
          ok: true,
          json: async () => ({ suppliers: mockSuppliers, page: pageNum, pageSize: 20, total: 25, totalPages: 2 }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeDefined()
    })
    fireEvent.click(screen.getByText('Next'))
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 2 (25 total)')).toBeDefined()
    })
  })

  it('shows confirm dialog when delete is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    const row = screen.getByText('ABC Pharma').closest('tr')
    expect(row).not.toBeNull()
    const iconButtons = within(row!).getAllByRole('button', { name: '' })
    act(() => {
      fireEvent.click(iconButtons[1])
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this supplier?')).toBeDefined()
    })
    expect(screen.getByText(/This will mark ABC Pharma as inactive/)).toBeDefined()
  })

  it('cancels delete and keeps supplier when Cancel is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    const row = screen.getByText('ABC Pharma').closest('tr')
    expect(row).not.toBeNull()
    const iconButtons = within(row!).getAllByRole('button', { name: '' })
    act(() => {
      fireEvent.click(iconButtons[1])
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this supplier?')).toBeDefined()
    })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    act(() => {
      fireEvent.click(cancelButton)
    })
    await waitFor(() => {
      expect(screen.queryByText('Deactivate this supplier?')).toBeNull()
    })
    expect(screen.getByText('ABC Pharma')).toBeDefined()
  })

  it('deletes supplier when confirm is clicked', async () => {
    let deleteCalled = false
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/suppliers/') && options?.method === 'DELETE') {
        deleteCalled = true
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      if (url.startsWith('/api/suppliers') && !url.includes('/api/suppliers/')) {
        return {
          ok: true,
          json: async () => ({ suppliers: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }),
        } as Response
      }
      return originalFetch(url, options)
    }

    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
    const row = screen.getByText('ABC Pharma').closest('tr')
    expect(row).not.toBeNull()
    const iconButtons = within(row!).getAllByRole('button', { name: '' })
    act(() => {
      fireEvent.click(iconButtons[1])
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this supplier?')).toBeDefined()
    })
    const confirmButton = screen.getByRole('button', { name: 'Deactivate' })
    act(() => {
      fireEvent.click(confirmButton)
    })
    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })
    await waitFor(() => {
      expect(screen.queryByText('Deactivate this supplier?')).toBeNull()
    })
    expect(screen.queryByText('ABC Pharma')).toBeNull()

    ;(global as any).fetch = originalFetch
  })

  it('filters suppliers by search term', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/suppliers')) {
        const urlObj = new URL(url, 'http://localhost')
        const search = urlObj.searchParams.get('search') || ''
        const filtered = mockSuppliers.filter((s) =>
          search ? s.supplierName.toLowerCase().includes(search.toLowerCase()) : true,
        )
        return {
          ok: true,
          json: async () => ({ suppliers: filtered, page: 1, pageSize: 20, total: filtered.length, totalPages: 1 }),
        } as Response
      }
      if (url.includes('/api/suppliers/1')) {
        return {
          ok: true,
          json: async () => mockLedger,
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search suppliers...')
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'ABC Pharma' } })
    })

    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })
  })

  it('filters suppliers by status', async () => {
    cleanup()
    const multiStatusSuppliers = [
      { ...mockSuppliers[0], status: 'ACTIVE' },
      { ...mockSuppliers[0], id: '2', supplierName: 'Inactive Supplier', status: 'INACTIVE' },
    ]
    global.fetch = async (url: string) => {
      if (url.includes('/api/suppliers')) {
        const urlObj = new URL(url, 'http://localhost')
        const status = urlObj.searchParams.get('status') || ''
        const filtered = status ? multiStatusSuppliers.filter((s) => s.status === status) : multiStatusSuppliers
        return {
          ok: true,
          json: async () => ({ suppliers: filtered, page: 1, pageSize: 20, total: filtered.length, totalPages: 1 }),
        } as Response
      }
      if (url.includes('/api/suppliers/1')) {
        return {
          ok: true,
          json: async () => mockLedger,
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SuppliersPage />)
    await waitFor(() => {
      expect(screen.getByText('ABC Pharma')).toBeDefined()
    })

    const statusSelect = screen.getByRole('combobox')
    act(() => {
      fireEvent.click(statusSelect)
    })
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeDefined()
    })
    act(() => {
      fireEvent.click(screen.getByText('Inactive'))
    })

    await waitFor(() => {
      expect(screen.getByText('Inactive Supplier')).toBeDefined()
    })
  })
})
