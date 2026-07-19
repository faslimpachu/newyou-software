import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { VisitsWorkspace } from '@/components/visits/visits-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockVisits = [
  { id: '1', patientMr: 'MR000001', doctor: 'Dr. Neha Verma', center: 'Nutrition Center', appointmentTimeSlot: '09:30 AM', status: 'Active', createdAt: '2026-07-19T04:30:00.000Z', patient: { patientName: 'Aarav Sharma', mr: 'MR000001' } },
  { id: '2', patientMr: 'MR000002', doctor: 'Dr. Arjun Das', center: 'Ayurcare Center', appointmentTimeSlot: '10:00 AM', status: 'Waiting', createdAt: '2026-07-19T05:00:00.000Z', patient: { patientName: 'Rohan Mehta', mr: 'MR000002' } },
]

describe('VisitsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = undefined as any
  })

  const mockFetchVisits = (visits = mockVisits) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ visits }),
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
    expect(screen.getByText('09:30 AM')).toBeDefined()
  })

  it('filters visits by search query', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search patient or OP no.')
    ;(searchInput as HTMLInputElement).value = 'Rohan'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitFor(() => {
      expect(screen.getByText('Rohan Mehta')).toBeDefined()
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
      expect(screen.getByText('Waiting')).toBeDefined()
    })
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByText('Completed')).toBeDefined()
    expect(screen.getByText('Cancelled')).toBeDefined()
  })

  it('opens patient profile when clicking Open patient profile', async () => {
    mockFetchVisits()
    render(<VisitsWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const firstRow = screen.getByText('09:30 AM').closest('tr')
    if (firstRow) fireEvent.click(firstRow)

    await waitFor(() => {
      expect(screen.getByText('Open patient profile')).toBeDefined()
    })
  })
})
