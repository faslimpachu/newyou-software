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
})
