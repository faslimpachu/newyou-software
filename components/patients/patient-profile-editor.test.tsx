import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PatientProfileEditor } from '@/components/patients/patient-profile-editor'
import { existingPatients } from '@/lib/registration-data'

describe('PatientProfileEditor', () => {
  const patient = {
    ...existingPatients[0],
    address: '123 Main St',
    state: 'Karnataka',
    postalCode: '560001',
    mobile: '9845012345',
    doctor: 'Dr. Anjali Menon',
    dob: '1988-11-22',
  }
  const center = 'Nutrition Center'
  const onCancel = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    onSaved.mockClear()
  })

  it('renders edit form pre-filled with patient data', () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    expect(screen.getByText('Edit Patient Profile')).toBeDefined()
    expect(screen.getByDisplayValue('Aarav')).toBeDefined()
    expect(screen.getByDisplayValue('9845012345')).toBeDefined()
    expect(screen.getByDisplayValue('123 Main St')).toBeDefined()
    expect(screen.getByDisplayValue('Bengaluru')).toBeDefined()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const cancelButtons = screen.getAllByRole('button', { name: /Cancel/ })
    fireEvent.click(cancelButtons[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls PATCH and onSaved on successful save', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ patient: { ...patient, consultationType: 'NUTRITION' } }),
    } as Response)

    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(`/api/patients/${encodeURIComponent(patient.mr)}`, expect.objectContaining({
      method: 'PATCH',
    })))

    const callArgs = mockFetch.mock.calls[0][1] as any
    const body = JSON.parse(callArgs.body)
    expect(body.patientName).toBe('Aarav Sharma')
    expect(body.mobileNumber).toBe('9845012345')
    expect(body.email).toBeUndefined()
    expect(body.center).toBe('Nutrition Center')

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))

    mockFetch.mockRestore()
  })

  it('validates email format before saving', async () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const emailInput = screen.getByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address.')).toBeDefined()
    })
  })

  it('sends email when provided in edit form', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ patient: { ...patient, consultationType: 'NUTRITION' } }),
    } as Response)

    render(<PatientProfileEditor patient={{ ...patient, email: 'old@example.com' } as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const emailInput = screen.getByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const callArgs = mockFetch.mock.calls[0][1] as any
    const body = JSON.parse(callArgs.body)
    expect(body.email).toBe('new@example.com')

    mockFetch.mockRestore()
  })

  it('renders emergency contact, medical history, and lifestyle sections', () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    expect(screen.getByText('Emergency Contact')).toBeDefined()
    expect(screen.getByText('Medical History')).toBeDefined()
    expect(screen.getByText('Lifestyle')).toBeDefined()
    expect(screen.getByText('Document known conditions before consultation')).toBeDefined()
  })

  it('shows error on failed save', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => expect(screen.getByText('Server error')).toBeDefined())
    expect(onSaved).not.toHaveBeenCalled()

    mockFetch.mockRestore()
  })

  it('validates doctor selection before saving', async () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    const doctorSelect = screen.getByLabelText('Consulting doctor *')
    fireEvent.change(doctorSelect, { target: { value: '' } })

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Please select a consulting doctor.')).toBeDefined()
    })
  })

  it('renders center badge', () => {
    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    expect(screen.getByText('Center:')).toBeDefined()
    expect(screen.getByText('Nutrition Center')).toBeDefined()
  })

  it('pre-fills and saves date of birth', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ patient: { ...patient, consultationType: 'NUTRITION' } }),
    } as Response)

    render(<PatientProfileEditor patient={patient as any} center={center} onCancel={onCancel} onSaved={onSaved} />)

    expect(screen.getByLabelText('Date of birth')).toHaveValue('1988-11-22')

    fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '1995-08-10' } })

    const saveButton = screen.getByRole('button', { name: /Save changes/ })
    fireEvent.click(saveButton)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const callArgs = mockFetch.mock.calls[0][1] as any
    const body = JSON.parse(callArgs.body)
    expect(body.dob).toBe('1995-08-10')

    mockFetch.mockRestore()
  })
})
