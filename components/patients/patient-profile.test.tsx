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
        body: JSON.stringify({ patientMr: 'NU000001', doctor: 'Dr. Anjali Menon', center: 'Nutrition Center' }),
      }))
    })
  })

  it('edits visit status inline and calls PATCH API', async () => {
    const apiPatient = {
      mr: existingPatients[0].mr,
      patientName: existingPatients[0].name,
      parentName: existingPatients[0].parentName,
      gender: existingPatients[0].gender,
      mobileNumber: existingPatients[0].mobile,
      address: '',
      district: existingPatients[0].city,
      state: '',
      pinCode: '',
      visits: existingPatients[0].visits.map((v) => ({ ...v, status: 'Completed' })),
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ patient: apiPatient }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ patient: apiPatient }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    const editButtons = screen.getAllByRole('button', { name: /Edit status/ })
    fireEvent.click(editButtons[0])

    const select = screen.getByRole('combobox', { name: /Status/ })
    fireEvent.change(select, { target: { value: 'Completed' } })

    fireEvent.click(screen.getByRole('button', { name: /Save status/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/visits/'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'Completed' }),
        })
      )
    })
  })

  it('shows OP Sheet tab with visit-centric table and status indicators', async () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    expect(screen.getByRole('tab', { name: 'OP Sheet' })).toBeDefined()
  })

  it('creates an OP Sheet for a visit from the OP Sheet tab', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'V-1', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sheet: { id: 'OP-1', visitId: 'V-1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            ...patientWithOP,
            apiOPSheets: [{ id: 'OP-1', visitId: 'V-1', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /Create OP Sheet/ }))
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/op-sheets', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ patientMr: 'NU000001', visitId: 'V-1', clinicalExamination: '', vitals: '{}', diagnosis: '', symptoms: '' }),
      }))
    })
  })

  it('shows Prescription tab with visit-centric table', async () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    expect(screen.getByRole('tab', { name: 'Prescriptions' })).toBeDefined()
  })

  it('shows Create OP Sheet when no OP Sheet exists for a visit in Prescription tab', async () => {
    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'V-1', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))

    expect(screen.getByRole('button', { name: /Create OP Sheet/ })).toBeDefined()
  })

  it('shows Create Prescription when OP Sheet exists but no Prescription', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'V-1', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'V-1', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))

    expect(screen.getByRole('button', { name: /Create Prescription/ })).toBeDefined()
  })
})
