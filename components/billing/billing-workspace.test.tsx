import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BillingWorkspace } from '@/components/billing/billing-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,test' })),
}))

vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    internal: { pageSize: { getWidth: () => 210 } },
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}))

const mockInvoices = [
  {
    invoiceNumber: 'INV-00001',
    center: 'nutrition',
    billType: 'Consultation Bill',
    patientName: 'Aarav Sharma',
    patientMrNumber: 'NU000001',
    patientAge: '34',
    patientDob: '1992-03-12',
    patientGender: 'Male',
    patientBloodGroup: 'B+',
    patientAddress: 'Thalassery, Kannur',
    patientContact: '9847012345',
    invoiceDate: '02 Jun 2026',
    discount: 0,
    tax: 0,
    paid: 0,
    paymentMethod: 'Cash',
    items: [{ id: '1', name: 'Nutrition consultation', quantity: 1, rate: 1800 }],
  },
]

describe('BillingWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = undefined as any
  })

  const mockFetchInvoices = (invoices = mockInvoices) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invoices, total: invoices.length, page: 1, limit: 100 }),
    })
  }

  it('renders loading state initially', () => {
    mockFetchInvoices()
    render(<BillingWorkspace />)
    expect(screen.getByText('Loading invoices...')).toBeDefined()
  })

  it('renders invoices after loading', async () => {
    mockFetchInvoices()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('INV-00001').length).toBeGreaterThan(0)
  })

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices')).toBeDefined()
    })
  })

  it('shows empty state when no invoices', async () => {
    mockFetchInvoices([])
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('No invoices found.')).toBeDefined()
    })
  })

  it('displays metrics', async () => {
    mockFetchInvoices()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Today collected')).toBeDefined()
    })
    expect(screen.getByText('Outstanding')).toBeDefined()
    expect(screen.getByText('Open invoices')).toBeDefined()
  })

  it('opens new invoice modal', async () => {
    mockFetchInvoices([])
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('No invoices found.')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New invoice'))

    await waitFor(() => {
      expect(screen.getByText('Create invoice')).toBeDefined()
    })
  })

  it('creates a new invoice', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/billing') && url.includes('limit=100')) {
        return Promise.resolve({ ok: true, json: async () => ({ invoices: [], total: 0, page: 1, limit: 100 }) })
      }
      if (url.includes('/api/patients/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient: {
              mr: 'NU000003',
              patientName: 'Test Patient',
              mobileNumber: '9845012345',
              gender: 'Male',
              dob: '1994-01-01',
              age: 30,
              bloodGroup: 'A+',
              address: 'Test Address',
              district: 'Test District',
              state: 'Test State',
              pinCode: '560001',
            },
          }),
        })
      }
      if (url.includes('/api/billing') && !url.includes('limit=100')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            invoice: {
              invoiceNumber: 'INV-00003',
              center: 'nutrition',
              billType: 'Consultation Bill',
              patientName: 'Test Patient',
              patientMrNumber: 'NU000003',
              patientAge: '30',
              patientDob: '1994-01-01',
              patientGender: 'Male',
              patientBloodGroup: 'A+',
              patientAddress: 'Test Address, Test District, Test State, 560001',
              patientContact: '9845012345',
              invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              discount: 0,
              tax: 0,
              paid: 0,
              paymentMethod: 'Cash',
              items: [{ id: '1', name: 'Test service', quantity: 1, rate: 1000 }],
            },
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ invoices: [], total: 0, page: 1, limit: 100 }) })
    })

    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('No invoices found.')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New invoice'))

    await waitFor(() => {
      expect(screen.getByText('Create invoice')).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. NU000003'), { target: { value: 'NU000003' } })
    await waitFor(() => {
      expect(screen.getByText('Existing patient found — details auto-filled.')).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText('Any service, test, medicine, or package'), { target: { value: 'Test service' } })

    const rateInputs = screen.getAllByRole('textbox')
    const rateInput = rateInputs.find((input) => (input as HTMLInputElement).inputMode === 'decimal')
    if (rateInput) fireEvent.change(rateInput, { target: { value: '1000' } })

    fireEvent.click(screen.getByText('Save & preview bill'))

    await waitFor(() => {
      expect(screen.getByText('Invoice preview')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('opens invoice preview modal when clicking row', async () => {
    mockFetchInvoices()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const row = screen.getByText('Aarav Sharma').closest('tr')
    if (row) fireEvent.click(row)

    await waitFor(() => {
      expect(screen.getByText('Invoice preview')).toBeDefined()
    })
  })

  it('displays center names', async () => {
    mockFetchInvoices()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('New You')).toBeDefined()
    })
  })
})
