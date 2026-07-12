import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisitsWorkspace } from '@/components/visits/visits-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('VisitsWorkspace', () => {
  it('renders visit list and details', () => {
    render(<VisitsWorkspace />)
    const names = screen.getAllByText('Aarav Sharma')
    expect(names.length).toBeGreaterThan(0)
    expect(screen.getByText('09:30 AM')).toBeDefined()
    expect(screen.getByText('Open patient profile')).toBeDefined()
  })
})
