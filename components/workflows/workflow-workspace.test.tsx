import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

    render(<WorkflowWorkspace mode="followups" />)

    expect(screen.getByText('Follow-up Management')).toBeDefined()

    await waitFor(() => {
      expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('MR000009')).toBeDefined()
    expect(screen.getAllByText('Diet review').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dr. Neha Verma').length).toBeGreaterThan(0)
    expect(screen.getByText('Open patient profile')).toBeDefined()
    expect(global.fetch).toHaveBeenCalledWith('/api/follow-ups')
  })
})
