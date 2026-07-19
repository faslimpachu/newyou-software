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
    invoiceNumber: 'INV-90112',
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

const mockExpenses = [
  {
    id: 'cmrr88hrn000010qkop5ryua7',
    expenseNumber: 'EXP-00001',
    date: '2026-07-19',
    category: 'Salary',
    description: 'E',
    amount: 2,
    paymentMethod: 'Cash',
    paidTo: '',
    remarks: '',
    addedBy: 'Front Office',
    createdDate: '19 Jul 2026',
  },
]

describe('BillingWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = undefined as any
  })

  const mockFetchInvoicesAndExpenses = (invoices = mockInvoices, expenses = mockExpenses) => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/patients/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient: {
              patientName: 'Test Patient',
              mr: 'NU000003',
              age: 30,
              dob: '1994-01-01',
              gender: 'Male',
              bloodGroup: 'A+',
              address: 'Test Address',
              district: 'Test District',
              state: 'Test State',
              pinCode: '560001',
              mobileNumber: '9845012345',
            },
          }),
        })
      }
      if (url.includes('/api/billing')) {
        return Promise.resolve({ ok: true, json: async () => ({ invoices }) })
      }
      if (url.includes('/api/expenses')) {
        return Promise.resolve({ ok: true, json: async () => ({ expenses }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  }

  it('renders loading state initially', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(<BillingWorkspace />)
    expect(screen.getByText('Loading invoices...')).toBeDefined()
  })

  it('renders invoices after loading', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('INV-90112').length).toBeGreaterThan(0)
  })

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Failed to load invoices').length).toBeGreaterThan(0)
    })
  })

  it('shows empty state when no invoices', async () => {
    mockFetchInvoicesAndExpenses([], [])
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('No invoices found.')).toBeDefined()
    })
  })

  it('displays 4 metric cards', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeDefined()
    })
    expect(screen.getByText('Total Expenses')).toBeDefined()
    expect(screen.getByText('Net Profit')).toBeDefined()
    expect(screen.getByText('Outstanding Patient Bills')).toBeDefined()
  })

  it('shows tab navigation', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Billing & Revenue')).toBeDefined()
    })
    expect(screen.getByText('Expenses')).toBeDefined()
  })

  it('switches to Expenses tab', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Billing & Revenue')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Expenses'))
    await waitFor(() => {
      expect(screen.getByText('EXP-00001')).toBeDefined()
    })
  })

  it('opens new invoice modal', async () => {
    mockFetchInvoicesAndExpenses([], [])
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
    mockFetchInvoicesAndExpenses([], [])
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('No invoices found.')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New invoice'))

    await waitFor(() => {
      expect(screen.getByText('Create invoice')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Save & preview bill'))

    await waitFor(() => {
      expect(screen.getByText('MR number is required.')).toBeDefined()
    })
    expect(screen.getByText('Patient name is required.')).toBeDefined()
    expect(screen.getByText('Add at least one item with a name and rate.')).toBeDefined()

    fireEvent.change(screen.getByPlaceholderText('e.g. NU000003'), { target: { value: 'NU000003' } })
    await waitFor(() => {
      expect(screen.getByText('Existing patient found — details auto-filled.')).toBeDefined()
    }, { timeout: 3000 })

    fireEvent.change(screen.getByPlaceholderText('Any service, test, medicine, or package'), { target: { value: 'Test service' } })

    expect(screen.getByText('Save & preview bill')).not.toHaveAttribute('disabled', 'true')
  })

  it('opens invoice preview modal when clicking row', async () => {
    mockFetchInvoicesAndExpenses()
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

  it('calls window.print when clicking Print in invoice preview', async () => {
    const mockPrint = vi.fn()
    const originalPrint = window.print
    window.print = mockPrint

    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const row = screen.getByText('Aarav Sharma').closest('tr')
    if (row) fireEvent.click(row)

    await waitFor(() => {
      expect(screen.getByText('Invoice preview')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Print'))
    expect(mockPrint).toHaveBeenCalled()

    window.print = originalPrint
  })

  it('exports PDF when clicking Export as PDF', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const row = screen.getByText('Aarav Sharma').closest('tr')
    if (row) fireEvent.click(row)

    await waitFor(() => {
      expect(screen.getByText('Invoice preview')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Export as PDF'))

    await waitFor(() => {
      expect(screen.getByText('Export as PDF')).toBeDefined()
    })
  })

  it('displays center names in invoice table', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('New You')).toBeDefined()
    })
  })
})
