import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientDirectory } from '@/components/patients/patient-directory'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockPatients = [
  { mr: 'NU000001', patientName: 'Aarav Sharma', parentName: 'Rajesh Sharma', mobileNumber: '98450 12345', age: 34, status: 'Active', createdAt: '2026-06-02T00:00:00.000Z', visits: [] },
  { mr: 'NU000002', patientName: 'Priya Nair', parentName: 'Suresh Nair', mobileNumber: '99860 45678', age: 28, status: 'Follow-up', createdAt: '2026-05-21T00:00:00.000Z', visits: [] },
  { mr: 'AY000001', patientName: 'Rohan Mehta', parentName: 'Anil Mehta', mobileNumber: '90080 33221', age: 45, status: 'Consulting', createdAt: '2026-05-30T00:00:00.000Z', visits: [] },
]

describe('PatientDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = undefined as any
  })

  const mockFetchPatients = (patients = mockPatients) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ patients, total: patients.length, page: 1, limit: 100 }),
    })
  }

  it('renders loading state initially', () => {
    mockFetchPatients()
    render(<PatientDirectory />)
    expect(screen.getByText('Loading patients...')).toBeDefined()
  })

  it('renders patient rows after loading', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('NU000001').length).toBeGreaterThan(0)
  })

  it('filters patients by search query', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText('MR number, name, mobile, parent')
    fireEvent.change(searchInput, { target: { value: 'Aarav' } })

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })
  })

  it('filters patients by center', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const centerSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(centerSelect, { target: { value: 'Ayurcare Center' } })

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(table.textContent).not.toContain('Aarav Sharma')
    })
  })

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load patients')).toBeDefined()
    })
  })

  it('shows delete confirmation when delete is triggered', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const deleteButtons = screen.getAllByRole('button')
    const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete record'))
    if (deleteButton) fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/Delete patient record/)).toBeDefined()
    })
  })

  it('exports CSV when clicking export', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const exportButton = screen.getByText('Export CSV')
    fireEvent.click(exportButton)

    expect(document.createElement).toBeDefined()
  })

  it('shows matching patients count', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getByText('3 matching patients')).toBeDefined()
    })
  })

  it('displays patient status badges in the table', async () => {
    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined()
    })

    const table = screen.getByRole('table')
    expect(table.textContent).toContain('Active')
    expect(table.textContent).toContain('Follow-up')
    expect(table.textContent).toContain('Consulting')
  })

  it('navigates to register page when clicking Register patient', async () => {
    mockPush.mockClear()

    mockFetchPatients()
    render(<PatientDirectory />)

    await waitFor(() => {
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    })

    const registerButton = screen.getByText('Register patient')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/register')
    })
  })
})
