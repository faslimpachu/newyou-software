import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatientProfile } from '@/components/patients/patient-profile'
import { existingPatients } from '@/lib/registration-data'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

describe('PatientProfile', () => {
  it('renders patient details', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" generatedMR={existingPatients[0].mr} />)
    expect(screen.getByText(existingPatients[0].name)).toBeDefined()
    expect(screen.getByText(existingPatients[0].mr)).toBeDefined()
  })
})
