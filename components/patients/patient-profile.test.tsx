import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PatientProfile } from '@/components/patients/patient-profile'
import { existingPatients } from '@/lib/registration-data'

describe('PatientProfile', () => {
  it('renders the patient profile and visit history from demo data', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    expect(screen.getByRole('heading', { name: 'Patient profile' })).toBeDefined()
    expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
    expect(screen.getByText('NU000001')).toBeDefined()
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeDefined()
    expect(screen.getByText('Visit history')).toBeDefined()
  })

  it('shows the registration success banner when a patient was just registered', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" justRegistered />)

    expect(screen.getByText('Registration successful')).toBeDefined()
    expect(screen.getByText(/MR number/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Generate blank prescription/ })).toBeDefined()
  })

  it('keeps the workspace new visit callback wired for embedded usage', () => {
    const onNewVisit = vi.fn()
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" onNewVisit={onNewVisit} />)

    fireEvent.click(screen.getByRole('button', { name: /New visit/ }))

    expect(onNewVisit).toHaveBeenCalledTimes(1)
  })
})
