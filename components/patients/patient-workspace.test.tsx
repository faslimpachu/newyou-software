import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientWorkspace } from '@/components/patients/patient-workspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockPatient = {
  mr: 'NU000001',
  patientName: 'Aarav Sharma',
  parentName: 'Rajesh Sharma',
  gender: 'Male',
  mobileNumber: '9845012345',
  address: '123 Main St',
  district: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560001',
  dob: null,
  age: 34,
  bloodGroup: 'O+',
  status: 'Visited',
  createdAt: new Date().toISOString(),
  visits: [],
}

describe('PatientWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders choose center screen by default', () => {
    render(<PatientWorkspace />)
    expect(screen.getByText('Patient Registration')).toBeDefined()
    expect(screen.getByText('Nutrition Center')).toBeDefined()
    expect(screen.getByText('Ayurcare Center')).toBeDefined()
  })

  it('shows search screen after selecting a center', async () => {
    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })
  })

  it('searches patients via API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ patients: [mockPatient] }),
    })
    global.fetch = mockFetch

    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('e.g. NU000001 or AY000001')
    fireEvent.change(searchInput, { target: { value: 'NU000001' } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0][0] as string
      expect(call).toContain('/api/patients')
    })
  })

  it('shows form when clicking new registration', async () => {
    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New registration').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('New patient record.')).toBeDefined()
    })
  })

  it('shows validation errors on empty form submit', async () => {
    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New registration').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('New patient record.')).toBeDefined()
    })

    const saveButton = screen.getByText('Save registration')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Patient name is required.')).toBeDefined()
    })
  })

  const fillValidForm = () => {
    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Patient' } })
    fireEvent.change(screen.getByLabelText('Parent / spouse name *'), { target: { value: 'Parent Name' } })
    fireEvent.change(screen.getByLabelText('Mobile number *'), { target: { value: '9845012345' } })
    fireEvent.change(screen.getByLabelText('Street address *'), { target: { value: '123 Main St' } })
    fireEvent.change(screen.getByLabelText('District *'), { target: { value: 'Bengaluru' } })
    fireEvent.change(screen.getByLabelText('State *'), { target: { value: 'Karnataka' } })
    fireEvent.change(screen.getByLabelText('PIN code *'), { target: { value: '560001' } })
    fireEvent.change(screen.getByLabelText('Gender *'), { target: { value: 'Male' } })
  }

  it('submits registration and shows profile', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mr: 'NU000002', patient: mockPatient }),
    })
    global.fetch = mockFetch

    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New registration').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('New patient record.')).toBeDefined()
    })

    fillValidForm()
    fireEvent.click(screen.getByText('Save registration'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('OP Sheet')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('displays error on failed registration', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Mobile number already registered' }),
    })
    global.fetch = mockFetch

    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New registration').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('New patient record.')).toBeDefined()
    })

    fillValidForm()
    fireEvent.click(screen.getByText('Save registration'))

    await waitFor(() => {
      expect(screen.getByText('Mobile number already registered')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('shows stepper with 3 steps', () => {
    render(<PatientWorkspace />)
    expect(screen.getByText('1')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
  })

  it('displays MR preview in form', async () => {
    render(<PatientWorkspace />)
    fireEvent.click(screen.getByText('Nutrition Center').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Find patient')).toBeDefined()
    })

    fireEvent.click(screen.getByText('New registration').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText(/MR:/)).toBeDefined()
    })
  })
})