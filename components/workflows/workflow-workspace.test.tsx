import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkflowWorkspace } from '@/components/workflows/workflow-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('WorkflowWorkspace', () => {
  it('renders followups mode', () => {
    render(<WorkflowWorkspace mode="followups" />)
    expect(screen.getByText('Follow-up Management')).toBeDefined()
    const names = screen.getAllByText('Aarav Sharma')
    expect(names.length).toBeGreaterThan(0)
    expect(screen.getByText('Open patient profile')).toBeDefined()
  })
})
