import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatientDirectory } from '@/components/patients/patient-directory'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('PatientDirectory', () => {
  it('renders patient rows', () => {
    render(<PatientDirectory />)
    const names = screen.getAllByText('Aarav Sharma')
    expect(names.length).toBeGreaterThan(0)
    const mrs = screen.getAllByText('NU000001')
    expect(mrs.length).toBeGreaterThan(0)
  })
})
