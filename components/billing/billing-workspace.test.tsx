import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BillingWorkspace } from '@/components/billing/billing-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,test' })),
}))

vi.mock('jspdf', () => ({
  default: vi.fn(function MockJsPdf() { return ({
    internal: { pageSize: { getWidth: () => 210 } },
    addImage: vi.fn(),
    save: vi.fn(),
  }) }),
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

const mockInvoices = [
  {
    invoiceNumber: 'INV-90112',
    center: 'nutrition',
    billType: 'Consultation Bill',
    patientName: 'Aarav Sharma',
    patientMrNumber: 'MR000001',
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
      if (url.includes('/api/patients?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patients: [
              { mr: 'MR000003', patientName: 'Test Patient', mobileNumber: '9845012345', age: 30 },
              { mr: 'MR000031', patientName: 'Another Patient', mobileNumber: '9845012346', age: 31 },
            ],
          }),
        })
      }
      if (url.includes('/api/patients/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient: {
              patientName: 'Test Patient',
              mr: 'MR000003',
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

  it('keeps dashboard totals stable when invoice pagination changes', async () => {
    const pageOne = Array.from({ length: 20 }, (_, index) => ({
      ...mockInvoices[0],
      invoiceNumber: `INV-PAGE-1-${index + 1}`,
      patientName: `Page one patient ${index + 1}`,
    }))
    const pageTwo = Array.from({ length: 20 }, (_, index) => ({
      ...mockInvoices[0],
      invoiceNumber: `INV-PAGE-2-${index + 1}`,
      patientName: `Page two patient ${index + 1}`,
    }))

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/billing/summary') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ totalRevenue: 50000, totalExpenses: 12000, netProfit: 38000, outstandingPatientBills: 7500 }),
        })
      }
      if (url.startsWith('/api/billing?')) {
        const page = new URL(`http://localhost${url}`).searchParams.get('page')
        return Promise.resolve({
          ok: true,
          json: async () => ({ invoices: page === '2' ? pageTwo : pageOne, page: Number(page), pageSize: 20, total: 40, totalPages: 2 }),
        })
      }
      if (url.startsWith('/api/expenses?')) {
        return Promise.resolve({ ok: true, json: async () => ({ expenses: mockExpenses, page: 1, pageSize: 20, total: 1, totalPages: 1 }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<BillingWorkspace />)
    await waitFor(() => expect(screen.getByText('INV-PAGE-1-1')).toBeDefined())
    expect(screen.getByText('Rs. 50,000.00')).toBeDefined()
    expect(screen.getByText('Rs. 12,000.00')).toBeDefined()
    expect(screen.getByText('Rs. 38,000.00')).toBeDefined()
    expect(screen.getByText('Rs. 7,500.00')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(screen.getByText('INV-PAGE-2-1')).toBeDefined())
    expect(screen.queryByText('INV-PAGE-1-1')).toBeNull()
    expect(screen.getByText('Rs. 50,000.00')).toBeDefined()
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => url === '/api/billing/summary')).toHaveLength(1)
  })

  it('ignores a stale invoice-page response after a newer page request', async () => {
    const pageOne = [{ ...mockInvoices[0], invoiceNumber: 'INV-CURRENT-PAGE-1' }]
    const pageTwo = [{ ...mockInvoices[0], invoiceNumber: 'INV-STALE-PAGE-2' }]
    let resolvePageTwo!: (value: unknown) => void

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/billing/summary') return Promise.resolve({ ok: true, json: async () => ({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingPatientBills: 0 }) })
      if (url.startsWith('/api/expenses?')) return Promise.resolve({ ok: true, json: async () => ({ expenses: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }) })
      if (url.startsWith('/api/billing?')) {
        const page = new URL(`http://localhost${url}`).searchParams.get('page')
        if (page === '2') return new Promise((resolve) => { resolvePageTwo = resolve })
        return Promise.resolve({ ok: true, json: async () => ({ invoices: pageOne, page: 1, pageSize: 20, total: 40, totalPages: 2 }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<BillingWorkspace />)
    await waitFor(() => expect(screen.getByText('INV-CURRENT-PAGE-1')).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('/api/billing?page=2'))).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await waitFor(() => expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => String(url).includes('/api/billing?page=1')).length).toBe(2))

    await act(async () => {
      resolvePageTwo({ ok: true, json: async () => ({ invoices: pageTwo, page: 2, pageSize: 20, total: 40, totalPages: 2 }) })
      await Promise.resolve()
    })

    expect(screen.getByText('INV-CURRENT-PAGE-1')).toBeDefined()
    expect(screen.queryByText('INV-STALE-PAGE-2')).toBeNull()
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => String(url).includes('/api/billing?page=2'))).toHaveLength(1)
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

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000003'), { target: { value: 'MR000003' } })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /MR000003.*Test Patient/ })).toBeDefined()
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

  it('does not show Export as PDF button in invoice preview', async () => {
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

    expect(screen.queryByText('Export as PDF')).toBeNull()
  })

  it('displays center names in invoice table', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('New You')).toBeDefined()
    })
  })

  it('offers separate billing and expense exports and closes the menu after selection', async () => {
    mockFetchInvoicesAndExpenses()
    render(<BillingWorkspace />)

    await waitFor(() => expect(screen.getByText('INV-90112')).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(screen.getByText('Export Billing')).toBeDefined()
    expect(screen.getByText('Export Expense')).toBeDefined()

    fireEvent.click(screen.getByText('Export Expense'))
    await waitFor(() => expect(screen.queryByText('Export Expense')).toBeNull())
  })

  it('shows a helpful error when the selected export has no visible records', async () => {
    mockFetchInvoicesAndExpenses([], [])
    render(<BillingWorkspace />)

    await waitFor(() => expect(screen.getByText('No invoices found.')).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByText('Export Billing'))

    expect(await screen.findByRole('alert')).toHaveTextContent('There are no records to export.')
  })

  it('searches MR numbers live and shows every matching patient', async () => {
    mockFetchInvoicesAndExpenses([], [])
    render(<BillingWorkspace />)
    await waitFor(() => expect(screen.getByText('No invoices found.')).toBeDefined())
    fireEvent.click(screen.getByText('New invoice'))
    fireEvent.change(screen.getByPlaceholderText('e.g. MR000003'), { target: { value: 'MR0' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/patients?search=MR0&limit=20', expect.anything())
      expect(screen.getByRole('option', { name: /MR000003.*Test Patient/ })).toBeDefined()
      expect(screen.getByRole('option', { name: /MR000031.*Another Patient/ })).toBeDefined()
    }, { timeout: 10000 })
  }, 10000)

  it('loads a selected patient and locks the auto-filled patient fields', async () => {
    mockFetchInvoicesAndExpenses([], [])
    render(<BillingWorkspace />)
    await waitFor(() => expect(screen.getByText('No invoices found.')).toBeDefined())
    fireEvent.click(screen.getByText('New invoice'))
    fireEvent.change(screen.getByPlaceholderText('e.g. MR000003'), { target: { value: 'MR000003' } })

    fireEvent.click(await screen.findByRole('option', { name: /MR000003.*Test Patient/ }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/patients/MR000003', expect.anything())
      expect(screen.getByDisplayValue('Test Patient')).toHaveAttribute('readonly')
      expect(screen.getByDisplayValue('9845012345')).toHaveAttribute('readonly')
      expect(screen.getByDisplayValue('Test Address, Test District, Test State, 560001')).toHaveAttribute('readonly')
      expect(screen.getByDisplayValue('Male')).toBeDisabled()
    })
  })

  it('shows an empty state when no patients match the MR number', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/patients?')) return Promise.resolve({ ok: true, json: async () => ({ patients: [] }) })
      if (url.includes('/api/billing')) return Promise.resolve({ ok: true, json: async () => ({ invoices: [] }) })
      if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: async () => ({ expenses: [] }) })
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    render(<BillingWorkspace />)
    await waitFor(() => expect(screen.getByText('No invoices found.')).toBeDefined())
    fireEvent.click(screen.getByText('New invoice'))
    fireEvent.change(screen.getByPlaceholderText('e.g. MR000003'), { target: { value: 'UNKNOWN' } })
    expect(await screen.findByText('No matching patients found.')).toBeDefined()
  })

  it('renders invoices with missing patient fields without crashing', async () => {
    const partialInvoices = [
      {
        invoiceNumber: 'INV-PARTIAL',
        center: 'ayurcare',
        billType: 'Consultation Bill',
        patientName: '',
        patientMrNumber: '',
        patientAge: null,
        patientDob: null,
        patientGender: '',
        patientBloodGroup: '',
        patientAddress: '',
        patientContact: '',
        invoiceDate: '01 Jun 2026',
        discount: 0,
        tax: 0,
        paid: 0,
        paymentMethod: '',
        items: null,
      },
    ]
    mockFetchInvoicesAndExpenses(partialInvoices, [])
    render(<BillingWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('INV-PARTIAL')).toBeDefined()
    })
    expect(screen.getByText('Ayurcare Center')).toBeDefined()
  })

  it('opens invoice preview with missing fields and falls back to nutrition letterhead', async () => {
    const partialInvoices = [
      {
        invoiceNumber: 'INV-PREVIEW',
        center: 'unknown-center',
        billType: 'Lab Test Bill',
        patientName: 'Partial Patient',
        patientMrNumber: 'MR000099',
        patientAge: '25',
        patientDob: '2001-05-01',
        patientGender: 'Female',
        patientBloodGroup: 'A-',
        patientAddress: 'Kannur',
        patientContact: '9847000000',
        invoiceDate: '05 Jun 2026',
        discount: 0,
        tax: 0,
        paid: 0,
        paymentMethod: 'Cash',
        items: [],
      },
    ]
    mockFetchInvoicesAndExpenses(partialInvoices, [])
    render(<BillingWorkspace />)

    await waitFor(() => expect(screen.getByText('INV-PREVIEW')).toBeDefined())
    const row = screen.getByText('INV-PREVIEW').closest('tr')
    if (row) fireEvent.click(row)

    await waitFor(() => expect(screen.getByText('Invoice preview')).toBeDefined())
    expect(screen.getByText('New You')).toBeDefined()
  })

  it('renders partial expenses with missing fields without crashing', async () => {
    const partialExpenses = [
      {
        id: 'exp-partial',
        expenseNumber: '',
        date: '',
        category: '',
        description: '',
        amount: null,
        paymentMethod: null,
        paidTo: null,
        remarks: null,
        addedBy: '',
        createdDate: '',
      },
    ]
    mockFetchInvoicesAndExpenses([], partialExpenses)
    render(<BillingWorkspace />)

    await waitFor(() => expect(screen.getByText('Expenses')).toBeDefined())
    fireEvent.click(screen.getByText('Expenses'))

    await waitFor(() => {
      expect(screen.getByText('Expense ID')).toBeDefined()
    })
  })
})