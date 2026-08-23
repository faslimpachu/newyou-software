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
    invoice: { id: 'inv-1', invoiceNumber: 'PINV-20260820-0001' },
  },
  ...Array.from({ length: 24 }).map((_, i) => ({
    id: `pay-${i + 2}`,
    paymentNumber: `PPAY-20260820-${String(i + 2).padStart(4, '0')}`,
    supplierId: 'supp-1',
    invoiceId: 'inv-1',
    amount: 1000 + i * 100,
    paymentDate: '2026-08-20',
    paymentMode: 'BANK',
    reference: null,
    notes: null,
    createdAt: new Date().toISOString(),
    supplier: { id: 'supp-1', supplierName: 'Om Sai Medical' },
    invoice: { id: 'inv-1', invoiceNumber: 'PINV-20260820-0001' },
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

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Supplier Payments', level: 1 })).toBeDefined()
    })
  })

  it('renders Record Payment button', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
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
    const invoiceLabels = screen.getAllByText('Invoice (Optional)')
    const invoiceLabel = invoiceLabels.find((el) => el.tagName === 'LABEL')
    expect(invoiceLabel).toBeDefined()
    const form = invoiceLabel!.closest('form')
    expect(form).not.toBeNull()
    const comboboxes = form!.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBeGreaterThan(0)
  })

  it('loads invoices when supplier is selected', async () => {
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
  })

  it('renders payment table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    expect(screen.getAllByText('Om Sai Medical').length).toBeGreaterThan(0)
    expect(screen.getByText('₹500')).toBeDefined()
  })

  it('shows payment count', async () => {
    await waitFor(() => {
      const totalTexts = screen.getAllByText(/25 total/)
      expect(totalTexts.length).toBeGreaterThan(0)
    })
  })

  it('shows pagination info when there are multiple pages', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    const pageTexts = screen.getAllByText(/Page 1 of 2/)
    expect(pageTexts.length).toBeGreaterThan(0)
    const totalTexts = screen.getAllByText(/25 total/)
    expect(totalTexts.length).toBeGreaterThan(0)
  })

  it('navigates to next page when Next is clicked', async () => {
    cleanup()
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
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
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
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
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
})
