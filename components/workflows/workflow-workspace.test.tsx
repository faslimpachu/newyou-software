import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('filters follow-ups by status through the backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps: [{
          id: 'FU-STATUS-1',
          patientMr: 'MR000009',
          program: 'Diet review',
          status: 'Pending',
          patient: { patientName: 'Real Patient', mobileNumber: '9999999999', district: 'Kannur' },
        }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    })

    render(<WorkflowWorkspace />)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))

    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'Pending' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups?page=1&limit=20&status=Pending')
    })
  })

  it('filters follow-ups by review date range through the backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps: [{
          id: 'FU-DATE-1',
          patientMr: 'MR000009',
          program: 'Diet review',
          reviewDate: '2026-08-01',
          patient: { patientName: 'Real Patient', mobileNumber: '9999999999', district: 'Kannur' },
        }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    })

    render(<WorkflowWorkspace />)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))

    const fromInput = screen.getByLabelText('Review date from')
    const toInput = screen.getByLabelText('Review date to')
    fireEvent.change(fromInput, { target: { value: '2026-08-01' } })
    fireEvent.change(toInput, { target: { value: '2026-08-05' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups?page=1&limit=20&reviewDateFrom=2026-08-01&reviewDateTo=2026-08-05')
    })
  })

  it('preserves selected follow-up across polling intervals', async () => {
    const followUps = [
      {
        id: 'FU-POLL-1',
        patientMr: 'MR000001',
        program: 'Diet review',
        dueDate: '2026-07-25T00:00:00.000Z',
        assignedTo: 'Dr. Neha Verma',
        priority: 'High',
        status: 'Pending',
        remarks: 'First',
        patient: { patientName: 'First Patient', mobileNumber: '9999999991', district: 'Kannur' },
      },
      {
        id: 'FU-POLL-2',
        patientMr: 'MR000002',
        program: 'Therapy review',
        dueDate: '2026-07-26T00:00:00.000Z',
        assignedTo: 'Dr. Riya Shah',
        priority: 'Medium',
        status: 'Scheduled',
        remarks: 'Second',
        patient: { patientName: 'Second Patient', mobileNumber: '9999999992', district: 'Kozhikode' },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps,
        total: followUps.length,
        page: 1,
        limit: 20,
      }),
    })

    render(<WorkflowWorkspace />)

    await waitFor(() => expect(screen.getAllByText('First Patient').length).toBeGreaterThan(0))

    const secondRow = screen.getByText('Second Patient').closest('tr')
    expect(secondRow).toBeTruthy()
    fireEvent.click(secondRow!)

    await waitFor(() => {
      expect(screen.getByTestId('workflow-details-panel')).toHaveTextContent('Second Patient')
    })
  })

  it('opens update dialog with formatted dates from API response', async () => {
    const followUps = [
      {
        id: 'FU-UPDATE-1',
        patientMr: 'MR000001',
        program: 'Diet review',
        reviewDate: '2026-08-10T00:00:00.000Z',
        dueDate: '2026-08-15T00:00:00.000Z',
        assignedTo: 'Dr. Neha Verma',
        priority: 'High',
        status: 'Pending',
        remarks: 'Review',
        patient: { patientName: 'Update Patient', mobileNumber: '9999999991', district: 'Kannur' },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        followUps,
        total: followUps.length,
        page: 1,
        limit: 20,
      }),
    })

    render(<WorkflowWorkspace />)

    await waitFor(() => expect(screen.getAllByText('Update Patient').length).toBeGreaterThan(0))

    const tableRows = screen.getAllByRole('row').filter((row) => row.textContent?.includes('Update Patient') && row.textContent?.includes('Diet review'))
    expect(tableRows.length).toBeGreaterThan(0)
    fireEvent.click(tableRows[0])

    const updateButtons = screen.getAllByRole('button', { name: /Update follow-up/ })
    const detailsPanelButton = updateButtons.find((button) => button.closest('[data-testid="workflow-details-panel"]'))
    expect(detailsPanelButton).toBeTruthy()
    fireEvent.click(detailsPanelButton!)

    await waitFor(() => {
      expect(screen.getByLabelText('Review date')).toBeDefined()
      expect(screen.getByLabelText('Due date')).toBeDefined()
    })

    const reviewInput = screen.getByLabelText('Review date') as HTMLInputElement
    const dueInput = screen.getByLabelText('Due date') as HTMLInputElement
    expect(reviewInput.value).toBe('2026-08-10')
    expect(dueInput.value).toBe('2026-08-15')
  })

  it('refreshes details panel after follow-up is updated', async () => {
    const followUps = [
      {
        id: 'FU-REFRESH-1',
        patientMr: 'MR000001',
        program: 'Diet review',
        reviewDate: '2026-08-10T00:00:00.000Z',
        dueDate: '2026-08-15T00:00:00.000Z',
        assignedTo: 'Dr. Neha Verma',
        priority: 'High',
        status: 'Pending',
        remarks: 'Old remarks',
        patient: { patientName: 'Refresh Patient', mobileNumber: '9999999991', district: 'Kannur' },
      },
    ]

    let callCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++
      if (url.includes('/api/follow-ups') && !url.includes('PATCH') && !url.includes('POST')) {
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              followUps,
              total: followUps.length,
              page: 1,
              limit: 20,
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            followUps: [
              {
                ...followUps[0],
                status: 'Completed',
                remarks: 'Updated remarks',
              },
            ],
            total: followUps.length,
            page: 1,
            limit: 20,
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<WorkflowWorkspace />)

    await waitFor(() => expect(screen.getAllByText('Refresh Patient').length).toBeGreaterThan(0))

    const row = screen.getAllByRole('row').find((row) => row.textContent?.includes('Refresh Patient') && row.textContent?.includes('Diet review'))
    expect(row).toBeTruthy()
    fireEvent.click(row!)

    await waitFor(() => {
      expect(screen.getByTestId('workflow-details-panel')).toHaveTextContent('Pending')
    })

    const updateButtons = screen.getAllByRole('button', { name: /Update follow-up/ })
    const detailsPanelButton = updateButtons.find((button) => button.closest('[data-testid="workflow-details-panel"]'))
    expect(detailsPanelButton).toBeTruthy()
    fireEvent.click(detailsPanelButton!)

    await waitFor(() => {
      expect(screen.getByLabelText('Review date')).toBeDefined()
    })

    const dialog = screen.getByTestId('follow-up-dialog')
    expect(dialog).toBeTruthy()
    const dialogContent = dialog as HTMLElement

    const statusSelect = within(dialogContent).getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'Completed' } })

    const remarksInput = within(dialogContent).getByLabelText('Remarks')
    fireEvent.change(remarksInput, { target: { value: 'Updated remarks' } })

    fireEvent.click(within(dialogContent).getByRole('button', { name: 'Save follow-up' }))

    await waitFor(() => {
      expect(screen.getByTestId('workflow-details-panel')).toHaveTextContent('Completed')
    })
    await waitFor(() => {
      expect(screen.getByTestId('workflow-details-panel')).toHaveTextContent('Updated remarks')
    })
  })
})
