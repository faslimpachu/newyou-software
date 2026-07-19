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
    expect(screen.getAllByText('MR000001').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeDefined()
  })

  it('shows patient details in the Overview tab', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))

    expect(screen.getByText('Patient Information')).toBeDefined()
    expect(screen.getByText('Full name')).toBeDefined()
    expect(screen.getByText('MR Number')).toBeDefined()
    expect(screen.getByText('Primary center')).toBeDefined()
    expect(screen.getByText('Medical Information')).toBeDefined()
    expect(screen.getByText('Lifestyle')).toBeDefined()
  })

  it('defaults to prescriptions tab when justRegistered is true', () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" justRegistered />)

    expect(screen.getByRole('tab', { name: 'Prescriptions' })).toBeDefined()
    expect(screen.queryByText('Registration successful')).toBeNull()
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
        { id: 'NU000001', doctor: 'Dr. Anjali Menon', center: 'Nutrition Center', reason: 'Waiting', createdAt: new Date().toISOString() },
      ],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ visit: { id: 'NU000001', doctor: 'Dr. Anjali Menon' } }),
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
        body: JSON.stringify({ patientMr: 'MR000001', doctor: 'Dr. Anjali Menon', center: 'Nutrition Center' }),
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

    fireEvent.click(screen.getByRole('tab', { name: 'Visits' }))

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
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
    }

    const refreshedPatient = {
      ...patientWithOP,
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sheet: { id: 'OP-1', visitId: 'NU000001' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ patient: { id: 'NU000001', status: 'Active' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: refreshedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: refreshedPatient.name,
            parentName: refreshedPatient.parentName,
            gender: refreshedPatient.gender,
            mobileNumber: refreshedPatient.mobile,
            address: '',
            district: refreshedPatient.city,
            state: '',
            pinCode: '',
            visits: refreshedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
            apiOPSheets: refreshedPatient.apiOPSheets,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: refreshedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: refreshedPatient.name,
            parentName: refreshedPatient.parentName,
            gender: refreshedPatient.gender,
            mobileNumber: refreshedPatient.mobile,
            address: '',
            district: refreshedPatient.city,
            state: '',
            pinCode: '',
            visits: refreshedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
            apiOPSheets: refreshedPatient.apiOPSheets,
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
        body: JSON.stringify({ patientMr: 'MR000001', visitId: 'NU000001', clinicalExamination: '', vitals: '{}', diagnosis: '', symptoms: '' }),
      }))
    })
  })

  it('sets visit status to Active automatically when first OP Sheet is created', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
    }

    const refreshedPatient = {
      ...patientWithOP,
      visits: [{ ...patientWithOP.visits[0], status: 'Active' }],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sheet: { id: 'OP-1', visitId: 'NU000001' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ patient: { id: 'NU000001', status: 'Active' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: refreshedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: refreshedPatient.name,
            parentName: refreshedPatient.parentName,
            gender: refreshedPatient.gender,
            mobileNumber: refreshedPatient.mobile,
            address: '',
            district: refreshedPatient.city,
            state: '',
            pinCode: '',
            visits: refreshedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
            apiOPSheets: refreshedPatient.apiOPSheets,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: refreshedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: refreshedPatient.name,
            parentName: refreshedPatient.parentName,
            gender: refreshedPatient.gender,
            mobileNumber: refreshedPatient.mobile,
            address: '',
            district: refreshedPatient.city,
            state: '',
            pinCode: '',
            visits: refreshedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
            apiOPSheets: refreshedPatient.apiOPSheets,
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /Create OP Sheet/ }))
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/visits/NU000001', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'Active' }),
      }))
    })
  })

  it('shows Prescription tab with visit-centric table', async () => {
    render(<PatientProfile patient={existingPatients[0]} center="Nutrition Center" />)

    expect(screen.getByRole('tab', { name: 'Prescriptions' })).toBeDefined()
  })

  it('shows Create Prescription when no OP Sheet exists for a visit in Prescription tab', async () => {
    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))

    expect(screen.getByRole('button', { name: /Create Prescription/ })).toBeDefined()
  })

  it('shows Create Prescription when OP Sheet exists but no Prescription', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))

    expect(screen.getByRole('button', { name: /Create Prescription/ })).toBeDefined()
  })

  it('does not show Create Prescription when prescription already exists', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [{ id: 'RX-1', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet: { id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null } }],
    }

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))

    expect(screen.queryByRole('button', { name: /Create Prescription/ })).toBeNull()
    expect(screen.getByRole('button', { name: /View/ })).toBeDefined()
  })

  it('creates a prescription and refreshes the prescription list automatically', async () => {
    const opSheet = { id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [opSheet],
      apiPrescriptions: [],
    }

    const refreshedPatient = {
      ...patientWithOP,
      apiPrescriptions: [{ id: 'RX-1', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet }],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prescription: { id: 'RX-1', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: refreshedPatient.mr,
            consultationType: 'NUTRITION',
            patientName: refreshedPatient.name,
            parentName: refreshedPatient.parentName,
            gender: refreshedPatient.gender,
            mobileNumber: refreshedPatient.mobile,
            address: '',
            district: refreshedPatient.city,
            state: '',
            pinCode: '',
            age: refreshedPatient.age,
            bloodGroup: refreshedPatient.bloodGroup,
            status: refreshedPatient.tags?.[0],
            dob: refreshedPatient.dob,
            visits: refreshedPatient.visits.map((v) => ({ ...v, createdAt: new Date().toISOString() })),
            opSheets: refreshedPatient.apiOPSheets,
            prescriptions: refreshedPatient.apiPrescriptions,
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))
    fireEvent.click(screen.getByRole('button', { name: /Create Prescription/ }))
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/prescriptions', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"patientMr":"MR000001"'),
      }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/patients/MR000001')
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Prescriptions' })).toBeDefined()
    })
  })
})
