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
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))

    mockFetch.mockRestore()
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
})
