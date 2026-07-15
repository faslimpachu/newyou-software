import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PatientProfile } from '@/components/patients/patient-profile'
import { existingPatients } from '@/lib/registration-data'

describe('PatientProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('opens new visit dialog when clicking New visit without callback', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('button', { name: /New visit/ }))

    expect(screen.getByText('New Visit')).toBeDefined()
    expect(screen.getByText('Select center and doctor for this visit.')).toBeDefined()
    expect(screen.getByRole('combobox', { name: /Center/ })).toBeDefined()
    expect(screen.getByRole('combobox', { name: /Doctor/ })).toBeDefined()
  })

  it('creates a visit when center and doctor are selected and confirmed', async () => {
    const updatedPatient = {
      ...existingPatients[0],
      visits: [
        ...existingPatients[0].visits,
        { id: 'V-1234', doctor: 'Dr. Anjali Menon', center: 'Nutrition Center', reason: 'Waiting', createdAt: new Date().toISOString() },
      ],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ visit: { id: 'V-1234', doctor: 'Dr. Anjali Menon' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: updatedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: updatedPatient.name,
            parentName: updatedPatient.parentName,
            gender: updatedPatient.gender,
            mobileNumber: updatedPatient.mobile,
            address: '',
            district: updatedPatient.city,
            state: '',
            pinCode: '',
            visits: updatedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('button', { name: /New visit/ }))

    const centerSelect = screen.getByRole('combobox', { name: /Center/ })
    fireEvent.change(centerSelect, { target: { value: 'nutrition' } })

    const doctorSelect = screen.getByRole('combobox', { name: /Doctor/ })
    fireEvent.change(doctorSelect, { target: { value: 'Dr. Anjali Menon' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Visit/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/visits', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ patientMr: 'NU000001', doctor: 'Dr. Anjali Menon' }),
      }))
    })
  })
})
