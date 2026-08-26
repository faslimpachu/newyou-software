import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { VisitsWorkspace } from '@/components/visits/visits-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockVisits = [
  { id: '1', patientMr: 'MR000001', doctor: 'Dr. Neha Verma', center: 'Nutrition Center', appointmentTimeSlot: '09:30 AM', status: 'Active', createdAt: '2026-07-19T04:30:00.000Z', patient: { patientName: 'Aarav Sharma', mr: 'MR000001' } },
  { id: '2', patientMr: 'MR000002', doctor: 'Dr. Arjun Das', center: 'Ayurcare Center', appointmentTimeSlot: '10:00 AM', status: 'Waiting', createdAt: '2026-07-19T05:00:00.000Z', patient: { patientName: 'Rohan Mehta', mr: 'MR000002' } },
  { id: '3', patientMr: 'MR000003', doctor: 'Dr. Neha Verma', center: 'Nutrition Center', appointmentTimeSlot: '10:30 AM', status: 'Completed', createdAt: '2026-07-19T05:30:00.000Z', patient: { patientName: 'Priya Nair', mr: 'MR000003' } },
]

describe('VisitsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = undefined as any
  })

  const mockFetchVisits = (visits = mockVisits, total = visits.length) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ visits, total, page: 1, limit: 20 }),
    })
  }

  it('renders loading state initially', () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)
    expect(screen.getByText('Loading visits...')).toBeDefined()
  })

  it('renders visit rows after loading', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(global.fetch).toHaveBeenCalledWith('/api/visits?page=1&limit=20')
  })

  it('searches visits through the paginated backend', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search visit ID, MR or patient')
    fireEvent.change(searchInput, { target: { value: 'Rohan' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/visits?page=1&limit=20&search=Rohan')
    })
  })

  it('filters visits by center through the paginated backend', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const centerSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(centerSelect, { target: { value: 'Ayurcare Center' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/visits?page=1&limit=20&center=Ayurcare+Center')
    })
  })

  it('filters visits by status through the paginated backend', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const statusSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(statusSelect, { target: { value: 'Active' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/visits?page=1&limit=20&status=Active')
    })
  })

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load visits')).toBeDefined()
    })
  })

  it('displays status cards', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
  })

  it('moves to the next backend page with simple pagination controls', async () => {
    const firstPage = [mockVisits[0]]
    const secondPage = [mockVisits[1]]
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const page = new URL(`http://localhost${url}`).searchParams.get('page')
      return Promise.resolve({
        ok: true,
        json: async () => ({ visits: page === '2' ? secondPage : firstPage, total: 21, page: Number(page), limit: 20 }),
      })
    })

    render(<VisitsWorkspace />)

    await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeDefined())
    expect(screen.getByText('Page 1 of 2')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/visits?page=2&limit=20')
      expect(screen.getByText('Rohan Mehta')).toBeDefined()
    })
    expect(screen.getByText('Page 2 of 2')).toBeDefined()
  })

  it('opens patient profile when clicking Open patient profile', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const tableRows = screen.getAllByRole('row').filter((row) => row.querySelector('td'))
    if (tableRows.length > 0) fireEvent.click(tableRows[0])

    await waitFor(() => {
      expect(screen.getByText('Open patient profile')).toBeDefined()
    })
    expect(screen.getByTestId('visit-details-panel')).toHaveClass('xl:sticky', 'xl:top-24', 'xl:self-start')
  })
})
