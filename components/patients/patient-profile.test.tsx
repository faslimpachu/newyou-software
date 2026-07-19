import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PatientProfile } from '@/components/patients/patient-profile'
import { existingPatients } from '@/lib/registration-data'

describe('PatientProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
      apiPrescriptions: [{ id: 'RX-1', patientMr: 'MR000001', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet: { id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null } }],
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
      apiPrescriptions: [{ id: 'RX-1', patientMr: 'MR000001', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet }],
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

  it('prints OP sheet with visit center header instead of patient default', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Ayurcare Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /View/ }))
    const printButtons = screen.getAllByRole('button', { name: /Print/ })
    fireEvent.click(printButtons[printButtons.length - 1])

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')
    expect(printCalls.length).toBeGreaterThan(0)
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(false)
  })

  it('prints prescription with visit center header instead of patient default', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Ayurcare Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [{ id: 'RX-1', patientMr: 'MR000001', visitId: 'NU000001', opSheetId: 'OP-1', diagnosis: '', medicines: '[]', advice: '', followUp: '', createdAt: new Date().toISOString(), opSheet: { id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null } }],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))
    fireEvent.click(screen.getByRole('button', { name: /View/ }))
    const printButtons = screen.getAllByRole('button', { name: /Print/ })
    fireEvent.click(printButtons[printButtons.length - 1])

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')
    expect(printCalls.length).toBeGreaterThan(0)
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(false)
  })

  it('falls back to patient default center for print when visit center is missing', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: '', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /View/ }))
    const printButtons = screen.getAllByRole('button', { name: /Print/ })
    fireEvent.click(printButtons[printButtons.length - 1])

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')
    expect(printCalls.length).toBeGreaterThan(0)
    expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(true)
  })

  it('prints on the same page using a hidden iframe instead of a new tab', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /View/ }))
    const printButtons = screen.getAllByRole('button', { name: /Print/ })
    fireEvent.click(printButtons[printButtons.length - 1])

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')

    await waitFor(() => {
      expect(printCalls.length).toBeGreaterThan(0)
    })

    expect(printCalls.some((call) => call.print)).toBe(true)
  })

  it('shows Blank OP Sheet button in visit row when no OP sheet exists', async () => {
    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))

    expect(screen.getByRole('button', { name: /Blank OP Sheet/ })).toBeDefined()
  })

  it('shows Blank OP Sheet button alongside View Edit Print when OP sheet already exists', async () => {
    const patientWithOP = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [{ id: 'OP-1', visitId: 'NU000001', clinicalExamination: '', vitals: null, diagnosis: '', symptoms: '', status: null, createdAt: new Date().toISOString(), visit: undefined, prescription: null }],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithOP} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))

    expect(screen.getAllByRole('button', { name: /View/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Edit/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Print/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Blank OP Sheet/ })).toBeDefined()
  })

  it('prints blank OP Sheet with visit center header when Blank OP Sheet is clicked', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'AY000001', date: '01 Jan 2026', center: 'Ayurcare Center', doctor: 'Dr. B', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /Blank OP Sheet/ }))

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')
    expect(printCalls.length).toBeGreaterThan(0)
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(false)
    expect(printCalls.some((call) => call.write.includes('Patient:'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('MR No:'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('Clinical Examination'))).toBe(false)
    expect(printCalls.some((call) => call.write.includes('Investigations'))).toBe(false)
    expect(printCalls.some((call) => call.write.includes('Treatment Plan'))).toBe(false)
    expect(printCalls.some((call) => call.write.includes('Doctor Signature'))).toBe(false)

    await waitFor(() => {
      expect(printCalls.some((call) => call.print)).toBe(true)
    })
  })

  it('prints blank OP Sheet with Nutrition Center header for nutrition visits', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'NU000001', date: '01 Jan 2026', center: 'Nutrition Center', doctor: 'Dr. A', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'OP Sheet' }))
    fireEvent.click(screen.getByRole('button', { name: /Blank OP Sheet/ }))

    await waitFor(() => {
      expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(true)
    })
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(false)
  })

  it('shows Blank Prescription button in prescription visit row', async () => {
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

    expect(screen.getByRole('button', { name: /Blank Prescription/ })).toBeDefined()
  })

  it('prints blank Prescription with visit center header when Blank Prescription is clicked', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

    const patientWithVisit = {
      ...existingPatients[0],
      visits: [
        { id: 'AY000001', date: '01 Jan 2026', center: 'Ayurcare Center', doctor: 'Dr. B', reason: 'Checkup' },
      ],
      apiOPSheets: [],
      apiPrescriptions: [],
    }

    render(<PatientProfile patient={patientWithVisit} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }))
    fireEvent.click(screen.getByRole('button', { name: /Blank Prescription/ }))

    expect(mockCreateElement).toHaveBeenCalledWith('iframe')
    expect(printCalls.length).toBeGreaterThan(0)
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(false)
    expect(printCalls.some((call) => call.write.includes('Prescription'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('Patient:'))).toBe(true)
    expect(printCalls.some((call) => call.write.includes('Doctor Signature'))).toBe(false)

    await waitFor(() => {
      expect(printCalls.some((call) => call.print)).toBe(true)
    })
  })

  it('prints blank Prescription with Nutrition Center header for nutrition visits', async () => {
    const printCalls: { write: string; print: boolean }[] = []
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi.fn((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'iframe') {
        const doc = { open: vi.fn(), write: vi.fn((html: string) => { printCalls.push({ write: html, print: false }) }), close: vi.fn() }
        const win = { document: doc, focus: vi.fn(), print: vi.fn(() => { printCalls[printCalls.length - 1].print = true }) }
        Object.defineProperties(element, {
          contentDocument: { get: () => doc },
          contentWindow: { get: () => win },
          onload: { writable: true, value: null },
        })
        element.addEventListener('load', () => {
          if (element.onload) element.onload(new Event('load'))
        })
      }
      return element
    })
    vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement as any)

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
    fireEvent.click(screen.getByRole('button', { name: /Blank Prescription/ }))

    await waitFor(() => {
      expect(printCalls.some((call) => call.write.includes('NEW YOU'))).toBe(true)
    })
    expect(printCalls.some((call) => call.write.includes('Ayurcare Center'))).toBe(false)
  })

  it('shows patient-based follow-ups in the patient profile tab', async () => {
    const patientWithFollowUps = {
      ...existingPatients[0],
      apiFollowUps: [{
        id: 'FU-1',
        patientMr: 'MR000001',
        program: 'Weight Loss',
        reviewDate: '2026-07-20T00:00:00.000Z',
        dueDate: '2026-07-25T00:00:00.000Z',
        assignedTo: 'Dr. Neha Verma',
        priority: 'High',
        status: 'Pending',
        remarks: 'Call before visit',
      }],
    }

    render(<PatientProfile patient={patientWithFollowUps} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Follow-ups' }))

    expect(screen.getByRole('heading', { name: 'Follow-ups' })).toBeDefined()
    expect(screen.getByText('Dr. Neha Verma')).toBeDefined()
    expect(screen.queryByText('Follow-up ID')).toBeNull()
    expect(screen.queryByText('Program')).toBeNull()
    expect(screen.queryByText('Visit ID')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /View/ }))

    expect(screen.getByText('Follow-up details')).toBeDefined()
    expect(screen.getByText('FU-1')).toBeDefined()
    expect(screen.getByText('Weight Loss')).toBeDefined()
  })

  it('creates a patient follow-up from the patient profile without visitId', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          followUp: {
            id: 'FU-1',
            patientMr: 'MR000001',
            program: 'Diet review',
            reviewDate: '2026-07-20T00:00:00.000Z',
            dueDate: '2026-07-25T00:00:00.000Z',
            assignedTo: 'Dr. Neha Verma',
            priority: 'High',
            status: 'Pending',
            remarks: 'Call before visit',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: existingPatients[0].mr,
            consultationType: 'NUTRITION',
            patientName: existingPatients[0].name,
            parentName: existingPatients[0].parentName,
            gender: existingPatients[0].gender,
            mobileNumber: existingPatients[0].mobile,
            address: '',
            district: existingPatients[0].city,
            state: '',
            pinCode: '',
            visits: [],
            followUps: [],
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={{ ...existingPatients[0], apiFollowUps: [] }} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Follow-ups' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Create follow-up/ })[0])
    expect(screen.getAllByText('Create follow-up').length).toBeGreaterThan(1)
    fireEvent.change(screen.getByLabelText('Program'), { target: { value: 'Diet review' } })
    fireEvent.change(screen.getByLabelText('Assigned To'), { target: { value: 'Dr. Neha Verma' } })
    fireEvent.change(screen.getByLabelText('Review Date'), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-07-25' } })
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'High' } })
    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: 'Call before visit' } })
    fireEvent.click(screen.getByRole('button', { name: /Save follow-up/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/follow-ups', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"patientMr":"MR000001"'),
      }))
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.visitId).toBeUndefined()
    expect(body.program).toBe('Diet review')
  })

  it('updates an existing patient follow-up through PATCH', async () => {
    const patientWithFollowUps = {
      ...existingPatients[0],
      apiFollowUps: [{
        id: 'FU-1',
        patientMr: 'MR000001',
        program: 'Weight Loss',
        reviewDate: '',
        dueDate: '',
        assignedTo: '',
        priority: 'Medium',
        status: 'Pending',
        remarks: '',
      }],
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          followUp: {
            id: 'FU-1',
            patientMr: 'MR000001',
            program: 'Weight Loss',
            priority: 'Medium',
            status: 'Completed',
            remarks: 'Done',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patient: {
            mr: existingPatients[0].mr,
            consultationType: 'NUTRITION',
            patientName: existingPatients[0].name,
            parentName: existingPatients[0].parentName,
            gender: existingPatients[0].gender,
            mobileNumber: existingPatients[0].mobile,
            address: '',
            district: existingPatients[0].city,
            state: '',
            pinCode: '',
            visits: [],
            followUps: [],
          },
        }),
      })

    global.fetch = mockFetch

    render(<PatientProfile patient={patientWithFollowUps} center="Nutrition Center" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Follow-ups' }))
    const editButtons = screen.getAllByRole('button', { name: /Edit/ })
    fireEvent.click(editButtons[editButtons.length - 1])
    expect(screen.getByText('Update follow-up')).toBeDefined()
    fireEvent.change(screen.getByDisplayValue('Pending'), { target: { value: 'Completed' } })
    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: 'Done' } })
    fireEvent.click(screen.getByRole('button', { name: /Save follow-up/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/follow-ups', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"id":"FU-1"'),
      }))
    })
  })
})
