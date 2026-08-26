import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkflowWorkspace } from '@/components/workflows/workflow-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('WorkflowWorkspace', () => {
  it('renders followups mode with real API data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps: [{
          id: 'FU-REAL-1',
          patientMr: 'MR000009',
          program: 'Diet review',
          dueDate: '2026-07-25T00:00:00.000Z',
          assignedTo: 'Dr. Neha Verma',
          priority: 'High',
          status: 'Pending',
          remarks: 'Call first',
          patient: {
            patientName: 'Real Patient',
            mobileNumber: '9999999999',
            district: 'Kannur',
          },
        }],
      }),
    })

    render(<WorkflowWorkspace />)

    expect(screen.getByText('Follow-up Management')).toBeDefined()

    await waitFor(() => {
      expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('MR000009').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Diet review').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dr. Neha Verma').length).toBeGreaterThan(0)
    expect(screen.getByText('Open patient profile')).toBeDefined()
    expect(screen.getByTestId('workflow-details-panel')).toHaveClass('xl:sticky', 'xl:top-24', 'xl:self-start')
    expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups?page=1&limit=20')
  })

  it('moves to the next backend page with simple pagination controls', async () => {
    const firstPage = [{
      id: 'FU-PAGE-1',
      patientMr: 'MR000001',
      program: 'Diet review',
      patient: { patientName: 'First Patient', mobileNumber: '9999999991', district: 'Kannur' },
    }]
    const secondPage = [{
      id: 'FU-PAGE-2',
      patientMr: 'MR000002',
      program: 'Therapy review',
      patient: { patientName: 'Second Patient', mobileNumber: '9999999992', district: 'Kannur' },
    }]
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const page = new URL(`http://localhost${url}`).searchParams.get('page')
      return Promise.resolve({
        ok: true,
        json: async () => ({ followUps: page === '2' ? secondPage : firstPage, total: 21, page: Number(page), limit: 20 }),
      })
    })

    render(<WorkflowWorkspace />)

    await waitFor(() => expect(screen.getAllByText('First Patient').length).toBeGreaterThan(0))
    expect(screen.getByText('Page 1 of 2')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups?page=2&limit=20')
      expect(screen.getAllByText('Second Patient').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Page 2 of 2')).toBeDefined()
  })

  it('searches follow-ups through the paginated backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps: [{
          id: 'FU-SEARCH-1',
          patientMr: 'MR000009',
          program: 'Diet review',
          patient: { patientName: 'Real Patient', mobileNumber: '9999999999', district: 'Kannur' },
        }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    })

    render(<WorkflowWorkspace />)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByPlaceholderText('Search MR, patient, reference'), { target: { value: 'MR000009' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups?page=1&limit=20&search=MR000009')
    })
  })
})
