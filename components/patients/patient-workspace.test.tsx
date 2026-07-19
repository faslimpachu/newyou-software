import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientWorkspace } from '@/components/patients/patient-workspace'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('PatientWorkspace registration flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
    mockPush.mockClear()
  })

  it('starts on Patient lookup by default', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    expect(screen.getByText('Find patient')).toBeDefined()
    expect(screen.getByText('Patient lookup')).toBeDefined()
    expect(screen.queryByText('Choose center and doctor for this visit.')).toBeNull()
  })

  it('shows stepper in Patient lookup -> Consultation -> Registration order', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    expect(screen.getByText('Patient lookup')).toBeDefined()
    expect(screen.getByText('Consultation')).toBeDefined()
    expect(screen.getAllByText('Registration').length).toBeGreaterThan(0)
  })

  it('moves to Consultation after clicking New registration from lookup', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    const searchInput = screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001')
    fireEvent.change(searchInput, { target: { value: 'zzzz-no-match' } })

    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))

    await waitFor(() => {
      expect(screen.getByText('Nutrition Center')).toBeDefined()
      expect(screen.getByText('Ayurcare Center')).toBeDefined()
    })
  })

  it('moves to Registration after selecting a center in Consultation', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))

    await waitFor(() => {
      expect(screen.getByText('Consulting Doctor')).toBeDefined()
      expect(screen.getByText('Personal Information')).toBeDefined()
    })
  })

  it('goes back from Consultation to Patient lookup', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))

    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })
  })

  it('goes back from Registration to Consultation', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))
    await waitFor(() => expect(screen.getByText('Consulting Doctor')).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))

    await waitFor(() => {
      expect(screen.getByText('Nutrition Center')).toBeDefined()
      expect(screen.queryByText('Consulting Doctor')).toBeNull()
    })
  })

  it('shows registration form after selecting a center', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))

    await waitFor(() => {
      expect(screen.getByText('Consulting Doctor')).toBeDefined()
      expect(screen.getByText('Personal Information')).toBeDefined()
      expect(screen.getByRole('button', { name: /Save & create visit/ })).toBeDefined()
    })
  })

  it('validates email format in registration form', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [] }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))

    await waitFor(() => expect(screen.getByText('Consulting Doctor')).toBeDefined())

    const emailInput = screen.getByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(screen.getByRole('button', { name: /Save & create visit/ }))

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address.')).toBeDefined()
    })
  })

  it('submits registration with email', async () => {
    const mobile = `${Date.now()}`.slice(-10)
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ patients: [] }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mr: `MR00000${mobile.slice(-1)}`, patient: { mr: `MR00000${mobile.slice(-1)}`, patientName: 'Test', consultationType: 'NUTRITION' } }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))

    await waitFor(() => expect(screen.getByText('Consulting Doctor')).toBeDefined())

    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Parent / spouse name'), { target: { value: 'Parent' } })
    fireEvent.change(screen.getByLabelText('Gender *'), { target: { value: 'Male' } })
    fireEvent.change(screen.getByLabelText('Mobile number *'), { target: { value: mobile } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Street address *'), { target: { value: '123 Test St' } })
    fireEvent.change(screen.getByLabelText('District *'), { target: { value: 'TestCity' } })
    fireEvent.change(screen.getByLabelText('State *'), { target: { value: 'Karnataka' } })
    fireEvent.change(screen.getByLabelText('PIN code *'), { target: { value: '560001' } })

    const doctorSelects = screen.getAllByRole('combobox')
    const doctorSelect = doctorSelects.find((el) => (el as HTMLSelectElement).value === '' || el.textContent?.includes('Select a doctor'))
    if (doctorSelect) {
      fireEvent.change(doctorSelect, { target: { value: 'Dr. Anjali Menon' } })
    }

    fireEvent.click(screen.getByRole('button', { name: /Save & create visit/ }))

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const registerCall = calls.find((call: any[]) => call[0] === '/api/register')
      expect(registerCall).toBeDefined()
      const body = JSON.parse(registerCall![1].body)
      expect(body.email).toBe('test@example.com')
      expect(body.center).toBe('Nutrition Center')
    })
  })

  it('submits registration with date of birth', async () => {
    const mobile = `${Date.now()}`.slice(-10)
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ patients: [] }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mr: `MR00000${mobile.slice(-1)}`, patient: { mr: `MR00000${mobile.slice(-1)}`, patientName: 'DOB Test', consultationType: 'NUTRITION' } }),
    })

    render(<PatientWorkspace />)

    fireEvent.change(screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001'), { target: { value: 'zzzz-no-match' } })
    await waitFor(() => expect(screen.getByText('New registration')).toBeDefined())

    fireEvent.click(screen.getByText('New registration'))
    await waitFor(() => expect(screen.getByText('Nutrition Center')).toBeDefined())

    fireEvent.click(screen.getByText('Nutrition Center'))

    await waitFor(() => expect(screen.getByText('Consulting Doctor')).toBeDefined())

    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'DOB' } })
    fireEvent.change(screen.getByLabelText('Parent / spouse name'), { target: { value: 'Parent' } })
    fireEvent.change(screen.getByLabelText('Gender *'), { target: { value: 'Male' } })
    fireEvent.change(screen.getByLabelText('Mobile number *'), { target: { value: mobile } })
    fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '1990-05-15' } })
    fireEvent.change(screen.getByLabelText('Street address *'), { target: { value: '123 Test St' } })
    fireEvent.change(screen.getByLabelText('District *'), { target: { value: 'TestCity' } })
    fireEvent.change(screen.getByLabelText('State *'), { target: { value: 'Karnataka' } })
    fireEvent.change(screen.getByLabelText('PIN code *'), { target: { value: '560001' } })

    const doctorSelects = screen.getAllByRole('combobox')
    const doctorSelect = doctorSelects.find((el) => (el as HTMLSelectElement).value === '' || el.textContent?.includes('Select a doctor'))
    if (doctorSelect) {
      fireEvent.change(doctorSelect, { target: { value: 'Dr. Anjali Menon' } })
    }

    fireEvent.click(screen.getByRole('button', { name: /Save & create visit/ }))

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const registerCall = calls.find((call: any[]) => call[0] === '/api/register')
      expect(registerCall).toBeDefined()
      const body = JSON.parse(registerCall![1].body)
      expect(body.dob).toBe('1990-05-15')
      expect(body.center).toBe('Nutrition Center')
    })
  })

  it('searches patients by MR prefix', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [{ mr: 'MR000001', patientName: 'Test', consultationType: 'NUTRITION', mobileNumber: '9845012345', district: 'City', state: 'Karnataka', address: 'Addr', pinCode: '560001', gender: 'Male' }] }),
    })

    render(<PatientWorkspace />)

    const searchInput = screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001')
    fireEvent.change(searchInput, { target: { value: 'MR000001' } })

    await waitFor(() => expect(screen.getByText('Test')).toBeDefined())
  })

  it('searches patients by NU visit prefix', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [{ mr: 'MR000001', patientName: 'Test', consultationType: 'NUTRITION', mobileNumber: '9845012345', district: 'City', state: 'Karnataka', address: 'Addr', pinCode: '560001', gender: 'Male', visits: [{ id: 'NU000001' }] }] }),
    })

    render(<PatientWorkspace />)

    const searchInput = screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001')
    fireEvent.change(searchInput, { target: { value: 'NU000001' } })

    await waitFor(() => expect(screen.getByText('Test')).toBeDefined())
  })

  it('searches patients by AY visit prefix', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [{ mr: 'MR000001', patientName: 'Test', consultationType: 'AYURCARE', mobileNumber: '9845012345', district: 'City', state: 'Karnataka', address: 'Addr', pinCode: '560001', gender: 'Male', visits: [{ id: 'AY000001' }] }] }),
    })

    render(<PatientWorkspace />)

    const searchInput = screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001')
    fireEvent.change(searchInput, { target: { value: 'AY000001' } })

    await waitFor(() => expect(screen.getByText('Test')).toBeDefined())
  })

  it('searches patients by exact AY visit ID even when MR differs', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [{ mr: 'MR000024', patientName: 'Muhammad Muhsin', consultationType: 'AYURCARE', mobileNumber: '0989529163', district: 'City', state: 'Karnataka', address: 'Addr', pinCode: '560001', gender: 'Male', visits: [{ id: 'AY000012' }] }] }),
    })

    render(<PatientWorkspace />)

    const searchInput = screen.getByPlaceholderText('e.g. MR000001 or NU000001 / AY000001')
    fireEvent.change(searchInput, { target: { value: 'AY000012' } })

    await waitFor(() => expect(screen.getByText('Muhammad Muhsin')).toBeDefined())
  })
})
