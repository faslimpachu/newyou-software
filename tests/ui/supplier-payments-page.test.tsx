import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
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
]

global.fetch = async (url: string) => {
  if (url.includes('/api/supplier-payments')) {
    if (url.includes('/api/supplier-payments/') && !url.includes('?')) {
      return {
        ok: true,
        json: async () => ({ payment: mockPayments[0] }),
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ payments: mockPayments }),
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
      expect(screen.getByText(/PINV-20260820-0001/)).toBeDefined()
    })
  })

  it('renders payment table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('PPAY-20260820-0001')).toBeDefined()
    })
    expect(screen.getByText('Om Sai Medical')).toBeDefined()
    expect(screen.getByText('₹500')).toBeDefined()
  })

  it('shows payment count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/1 payment\(s\) recorded/)).toBeDefined()
    })
  })
})
