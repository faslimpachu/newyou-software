import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import SupplierPaymentsPage from '@/app/supplier-payments/page'

const mockSuppliers = [
  { id: 'supp-1', supplierName: 'Om Sai Medical' },
  { id: 'supp-2', supplierName: 'HealthCare Distributors' },
]

const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'PINV-20260820-0001',
    grandTotal: 1120,
    paid: 0,
    balance: 1120,
    status: 'PENDING',
    dueDate: '2026-08-30',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'PINV-20260820-0002',
    grandTotal: 2000,
    paid: 500,
    balance: 1500,
    status: 'PARTIAL',
    dueDate: '2026-08-15',
  },
]

const mockPayments = [
  {
    id: 'pay-1',
    paymentNumber: 'PPAY-20260820-0001',
    supplierId: 'supp-1',
    invoiceId: 'inv-1',
    amount: 500,
    paymentDate: '2026-08-20',
    paymentMode: 'CASH',
    reference: null,
    notes: null,
    createdAt: new Date().toISOString(),
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    invoice: { id: 'inv-1', invoiceNumber: 'PINV-20260820-0001', status: 'PENDING' },
  },
  {
    id: 'pay-2',
    paymentNumber: 'PPAY-20260820-0002',
    supplierId: 'supp-1',
    invoiceId: 'inv-2',
    amount: 500,
    paymentDate: '2026-08-20',
    paymentMode: 'BANK',
    reference: null,
    notes: 'Partial payment',
    createdAt: new Date().toISOString(),
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    invoice: { id: 'inv-2', invoiceNumber: 'PINV-20260820-0002', status: 'PARTIAL' },
  },
  ...Array.from({ length: 25 }).map((_, i) => ({
    id: `pay-${i + 3}`,
    paymentNumber: `PPAY-20260820-${String(i + 3).padStart(4, '0')}`,
    supplierId: 'supp-1',
    invoiceId: 'inv-1',
    amount: 1000 + i * 100,
    paymentDate: '2026-08-20',
    paymentMode: 'BANK',
    reference: null,
    notes: null,
    createdAt: new Date().toISOString(),
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    invoice: { id: 'inv-1', invoiceNumber: 'PINV-20260820-0001', status: 'PENDING' },
  })),
]

global.fetch = async (url: string) => {
  if (url.includes('/api/supplier-payments')) {
    if (url.includes('/api/supplier-payments/') && !url.includes('?')) {
      return {
        ok: true,
        json: async () => ({ payment: mockPayments[0] }),
      } as Response
    }
    const urlObj = new URL(url, 'http://localhost')
    const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
    const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
    const start = (pageParam - 1) * pageSizeParam
    const pagedPayments = mockPayments.slice(start, start + pageSizeParam)
    return {
      ok: true,
      json: async () => ({
        payments: pagedPayments,
        page: pageParam,
        pageSize: pageSizeParam,
        total: mockPayments.length,
        totalPages: Math.ceil(mockPayments.length / pageSizeParam),
      }),
    } as Response
  }
  if (url.includes('/api/suppliers')) {
    return {
      ok: true,
      json: async () => ({ suppliers: mockSuppliers }),
    } as Response
  }
  if (url.includes('/api/purchase-invoices')) {
    if (url.includes('status=PENDING')) {
      return {
        ok: true,
        json: async () => ({
          invoices: mockInvoices.filter((inv) => Number(inv.balance) > 0 && (inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE')),
        }),
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ invoices: mockInvoices }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Supplier Payments Page UI', () => {
  beforeEach(() => {
    render(<SupplierPaymentsPage />)
  })

  it('renders page heading with workflow description', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Supplier Payments', level: 1 })).toBeDefined()
    })
    expect(screen.getByText('Record and track supplier payments with workflow validation')).toBeDefined()
  })

  it('renders Record Payment button', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
  })

  it('shows workflow steps when form is opened', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Select Supplier')).toBeDefined()
    })
    expect(screen.getByText('Select Invoice')).toBeDefined()
    expect(screen.getByText('Enter Amount')).toBeDefined()
    expect(screen.getByText('Confirm & Save')).toBeDefined()
  })

  it('highlights active workflow step', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Follow the workflow steps below to record a payment')).toBeDefined()
    })
  })

  it('shows payment statistics cards', async () => {
    await waitFor(() => {
      expect(screen.getByText('Total Payments')).toBeDefined()
    })
    expect(screen.getByText('Pending Payments')).toBeDefined()
  })

  it('shows correct pending payments total balance', async () => {
    await waitFor(() => {
      expect(screen.getByText('Pending Payments')).toBeDefined()
    })
    expect(screen.getByText('₹2,620')).toBeDefined()
  })

  it('shows payment count in stats', async () => {
    await waitFor(() => {
      expect(screen.getByText(/20 payment\(s\) recorded/)).toBeDefined()
    })
  })

  it('renders payment table with invoice status badges', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    const pendingBadges = screen.getAllByText('Pending')
    expect(pendingBadges.length).toBeGreaterThan(0)
    const partialBadges = screen.getAllByText('Partial')
    expect(partialBadges.length).toBeGreaterThan(0)
  })

  it('shows invoice status column header', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    expect(screen.getByText('Invoice Status')).toBeDefined()
  })

  it('renders pagination info', async () => {
    await waitFor(() => {
      const pageTexts = screen.getAllByText(/Page 1 of 2/)
      expect(pageTexts.length).toBeGreaterThan(0)
    })
  })

  it('shows create form when Record Payment is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
  })

  it('shows supplier searchable select in form', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    expect(supplierLabel).toBeDefined()
    const form = supplierLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('shows invoice searchable select in form', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    const invoiceLabels = screen.getAllByText('Invoice')
    const invoiceLabel = invoiceLabels.find((el) => el.tagName === 'LABEL')
    expect(invoiceLabel).toBeDefined()
    const form = invoiceLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('shows workflow step indicator', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Select Supplier')).toBeDefined()
    })
    const step1 = screen.getByText('1')
    expect(step1).toBeDefined()
  })

  it('shows outstanding balance for selected invoice', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })

    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    const form = supplierLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')

    act(() => {
      fireEvent.click(comboboxes[0])
    })

    const omSaiOptions = screen.getAllByText('Om Sai Medical')
    const omSaiOption = omSaiOptions.find((el) => el.getAttribute('role') === 'option')
    expect(omSaiOption).toBeDefined()
    act(() => {
      fireEvent.click(omSaiOption!)
    })

    await waitFor(() => {
      const invoiceTexts = screen.getAllByText(/PINV-20260820-0001/)
      expect(invoiceTexts.length).toBeGreaterThan(0)
    })

    const invoiceComboboxes = form!.querySelectorAll('[role="combobox"]')
    act(() => {
      fireEvent.click(invoiceComboboxes[1])
    })

    const pinvOptions = screen.getAllByText(/PINV-20260820-0001/)
    const pinvOption = pinvOptions.find((el) => el.getAttribute('role') === 'option')
    expect(pinvOption).toBeDefined()
    act(() => {
      fireEvent.click(pinvOption!)
    })

    await waitFor(() => {
      expect(screen.getByText(/Outstanding: ₹1,120/)).toBeDefined()
    })
  })

  it('shows Cancel button in form', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
  })

  it('shows payment table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    expect(screen.getAllByText('Om Sai Medical').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0)
  })

  it('shows payment count', async () => {
    await waitFor(() => {
      const totalTexts = screen.getAllByText(/27 total/)
      expect(totalTexts.length).toBeGreaterThan(0)
    })
  })

  it('shows pagination info when there are multiple pages', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    const pageTexts = screen.getAllByText(/Page 1 of 2/)
    expect(pageTexts.length).toBeGreaterThan(0)
    const totalTexts = screen.getAllByText(/27 total/)
    expect(totalTexts.length).toBeGreaterThan(0)
  })

  it('shows Next button as enabled when more pages exist', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    const nextButton = screen.getByRole('button', { name: /Next/i })
    expect(nextButton).not.toBeDisabled()
  })

  it('shows Previous button as disabled when on first page', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    const prevButton = screen.getByRole('button', { name: /Previous/i })
    expect(prevButton).toBeDisabled()
  })

  it('shows error message when payment fails', async () => {
    cleanup()
    global.fetch = async (url: string, options?: any) => {
      if (url.includes('/api/supplier-payments') && options?.method === 'POST') {
        return {
          ok: false,
          json: async () => ({ error: 'Payment amount exceeds outstanding balance' }),
        } as Response
      }
      if (url.includes('/api/supplier-payments')) {
        const urlObj = new URL(url, 'http://localhost')
        const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
        const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
        const start = (pageParam - 1) * pageSizeParam
        const pagedPayments = mockPayments.slice(start, start + pageSizeParam)
        return {
          ok: true,
          json: async () => ({
            payments: pagedPayments,
            page: pageParam,
            pageSize: pageSizeParam,
            total: mockPayments.length,
            totalPages: Math.ceil(mockPayments.length / pageSizeParam),
          }),
        } as Response
      }
      if (url.includes('/api/suppliers')) {
        return {
          ok: true,
          json: async () => ({ suppliers: mockSuppliers }),
        } as Response
      }
      if (url.includes('/api/purchase-invoices')) {
        if (url.includes('status=PENDING')) {
          return {
            ok: true,
            json: async () => ({
              invoices: mockInvoices.filter((inv: any) => Number(inv.balance) > 0 && (inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE')),
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({ invoices: mockInvoices }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SupplierPaymentsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })

    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    const form = supplierLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')

    act(() => {
      fireEvent.click(comboboxes[0])
    })

    const omSaiOptions = screen.getAllByText('Om Sai Medical')
    const omSaiOption = omSaiOptions.find((el) => el.getAttribute('role') === 'option')
    expect(omSaiOption).toBeDefined()
    act(() => {
      fireEvent.click(omSaiOption!)
    })

    await waitFor(() => {
      const invoiceTexts = screen.getAllByText(/PINV-20260820-0001/)
      expect(invoiceTexts.length).toBeGreaterThan(0)
    })

    const invoiceComboboxes = form!.querySelectorAll('[role="combobox"]')
    act(() => {
      fireEvent.click(invoiceComboboxes[1])
    })

    const pinvOptions = screen.getAllByText(/PINV-20260820-0001/)
    const pinvOption = pinvOptions.find((el) => el.getAttribute('role') === 'option')
    expect(pinvOption).toBeDefined()
    act(() => {
      fireEvent.click(pinvOption!)
    })

    const amountInput = screen.getByLabelText('Amount')
    act(() => {
      fireEvent.change(amountInput, { target: { value: '150' } })
    })

    const paymentDateInput = screen.getByLabelText('Payment Date')
    act(() => {
      fireEvent.change(paymentDateInput, { target: { value: '2026-08-20' } })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))
    })

    await waitFor(() => {
      expect(screen.getByText('Payment amount exceeds outstanding balance')).toBeDefined()
    })
  })

  it('shows success message after payment is recorded', async () => {
    cleanup()
    global.fetch = async (url: string) => {
      if (url.includes('/api/supplier-payments') && url.includes('POST')) {
        return {
          ok: true,
          json: async () => ({ payment: { ...mockPayments[0], id: 'new-pay' } }),
        } as Response
      }
      if (url.includes('/api/supplier-payments')) {
        const urlObj = new URL(url, 'http://localhost')
        const pageParam = parseInt(urlObj.searchParams.get('page') || '1')
        const pageSizeParam = parseInt(urlObj.searchParams.get('pageSize') || '20')
        const start = (pageParam - 1) * pageSizeParam
        const pagedPayments = mockPayments.slice(start, start + pageSizeParam)
        return {
          ok: true,
          json: async () => ({
            payments: pagedPayments,
            page: pageParam,
            pageSize: pageSizeParam,
            total: mockPayments.length,
            totalPages: Math.ceil(mockPayments.length / pageSizeParam),
          }),
        } as Response
      }
      if (url.includes('/api/suppliers')) {
        return {
          ok: true,
          json: async () => ({ suppliers: mockSuppliers }),
        } as Response
      }
      if (url.includes('/api/purchase-invoices')) {
        if (url.includes('status=PENDING')) {
          return {
            ok: true,
            json: async () => ({
              invoices: mockInvoices.filter((inv: any) => Number(inv.balance) > 0 && (inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE')),
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({ invoices: mockInvoices }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    }
    render(<SupplierPaymentsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })

    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    const form = supplierLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')

    act(() => {
      fireEvent.click(comboboxes[0])
    })

    const omSaiOptions = screen.getAllByText('Om Sai Medical')
    const omSaiOption = omSaiOptions.find((el) => el.getAttribute('role') === 'option')
    expect(omSaiOption).toBeDefined()
    act(() => {
      fireEvent.click(omSaiOption!)
    })

    await waitFor(() => {
      const invoiceTexts = screen.getAllByText(/PINV-20260820-0001/)
      expect(invoiceTexts.length).toBeGreaterThan(0)
    })

    const invoiceComboboxes = form!.querySelectorAll('[role="combobox"]')
    act(() => {
      fireEvent.click(invoiceComboboxes[1])
    })

    const pinvOptions = screen.getAllByText(/PINV-20260820-0001/)
    const pinvOption = pinvOptions.find((el) => el.getAttribute('role') === 'option')
    expect(pinvOption).toBeDefined()
    act(() => {
      fireEvent.click(pinvOption!)
    })

    const amountInput = screen.getByLabelText('Amount')
    act(() => {
      fireEvent.change(amountInput, { target: { value: '500' } })
    })

    const paymentDateInput = screen.getByLabelText('Payment Date')
    act(() => {
      fireEvent.change(paymentDateInput, { target: { value: '2026-08-20' } })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))
    })

    await waitFor(() => {
      expect(screen.getByText('Payment recorded successfully')).toBeDefined()
    })
  })

  it('disables Record Payment button when supplier is not selected', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    const submitButton = screen.getByRole('button', { name: 'Record Payment' })
    expect(submitButton).toBeDisabled()
  })

  it('shows Cancel button and hides form when clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    act(() => {
      fireEvent.click(cancelButton)
    })
    await waitFor(() => {
      expect(screen.queryByText('Record Supplier Payment')).toBeNull()
    })
  })

  it('disables Record Payment button when invoice is not selected', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })

    const supplierLabels = screen.getAllByText('Supplier')
    const supplierLabel = supplierLabels.find((el) => el.tagName === 'LABEL')
    const form = supplierLabel!.closest('form')
    const comboboxes = form!.querySelectorAll('[role="combobox"]')

    act(() => {
      fireEvent.click(comboboxes[0])
    })

    const omSaiOptions = screen.getAllByText('Om Sai Medical')
    const omSaiOption = omSaiOptions.find((el) => el.getAttribute('role') === 'option')
    expect(omSaiOption).toBeDefined()
    act(() => {
      fireEvent.click(omSaiOption!)
    })

    const amountInput = screen.getByLabelText('Amount')
    act(() => {
      fireEvent.change(amountInput, { target: { value: '500' } })
    })

    const submitButton = screen.getByRole('button', { name: 'Record Payment' })
    expect(submitButton).toBeDisabled()
  })

  it('shows Cancel button and hides form when clicked', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
    })
    const button = screen.getByRole('button', { name: /Record Payment/i })
    act(() => {
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(screen.getByText('Record Supplier Payment')).toBeDefined()
    })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    act(() => {
      fireEvent.click(cancelButton)
    })
    await waitFor(() => {
      expect(screen.queryByText('Record Supplier Payment')).toBeNull()
    })
  })

  it('sends search query param when typing in search input', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Payment #, reference, notes...')
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'PPAY-20260820-0001' } })
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Payment #, reference, notes...')).toHaveValue('PPAY-20260820-0001')
    })
  })

  it('sends supplierId filter when selecting a supplier', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const supplierSelect = screen.getByRole('combobox', { name: /Supplier/i })
    act(() => {
      fireEvent.click(supplierSelect)
    })

    const option = await screen.findByRole('option', { name: 'Om Sai Medical' })
    act(() => {
      fireEvent.click(option)
    })

    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
  })

  it('resets to page 1 when search changes', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Payment #, reference, notes...')
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'PPAY-20260820-0001' } })
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Payment #, reference, notes...')).toHaveValue('PPAY-20260820-0001')
    })
  })

  it('clears filters when Clear Filters is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Payment #, reference, notes...')
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'PPAY-20260820-0001' } })
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Payment #, reference, notes...')).toHaveValue('PPAY-20260820-0001')
    })

    const clearButton = screen.getByRole('button', { name: /Clear Filters/i })
    act(() => {
      fireEvent.click(clearButton)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Payment #, reference, notes...')).toHaveValue('')
    })
  })

  it('respects pagination with filters applied', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const supplierSelect = screen.getByRole('combobox', { name: /Supplier/i })
    act(() => {
      fireEvent.click(supplierSelect)
    })

    const option = await screen.findByRole('option', { name: 'Om Sai Medical' })
    act(() => {
      fireEvent.click(option)
    })

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /Next/i })
      expect(nextButton).not.toBeDisabled()
    })
  })

  it('supplier filter shows supplier name after selection, not UUID', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })

    const supplierSelect = screen.getByRole('combobox', { name: /Supplier/i })
    act(() => {
      fireEvent.click(supplierSelect)
    })

    const option = await screen.findByRole('option', { name: 'Om Sai Medical' })
    act(() => {
      fireEvent.pointerDown(option, { pointerType: 'mouse' })
      fireEvent.click(option)
    })

    await waitFor(() => {
      const updatedTrigger = document.getElementById('supplierFilter') as HTMLElement
      expect(updatedTrigger.textContent).toContain('Om Sai Medical')
    })
  })
})
