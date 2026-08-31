import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MedicineSelect } from '@/components/patients/medicine-select'

describe('MedicineSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with placeholder', () => {
    render(<MedicineSelect value="" onChange={() => {}} placeholder="Search medicine..." />)
    expect(screen.getByPlaceholderText('Search medicine...')).toBeDefined()
  })

  it('opens dropdown on focus and loads products', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
          { id: '2', name: 'Ibuprofen', currentStock: 50 },
        ],
      }),
    })
    global.fetch = mockFetch

    render(<MedicineSelect value="" onChange={() => {}} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.getByText('Ibuprofen')).toBeDefined()
  })

  it('shows stock quantity next to product name', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    render(<MedicineSelect value="" onChange={() => {}} />)

    fireEvent.focus(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.getByText('Qty: 100')).toBeDefined()
  })

  it('selects product and enters only name into input', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    const handleChange = vi.fn()
    render(<MedicineSelect value="" onChange={handleChange} />)

    fireEvent.focus(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Paracetamol'))

    expect(handleChange).toHaveBeenCalledWith('Paracetamol')
  })

  it('allows typing manually without selecting from dropdown', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    const handleChange = vi.fn()
    render(<MedicineSelect value="" onChange={handleChange} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Amoxicillin' } })

    expect(handleChange).toHaveBeenCalledWith('Amoxicillin')
  })

  it('filters products when searching', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
          { id: '2', name: 'Ibuprofen', currentStock: 50 },
        ],
      }),
    })
    global.fetch = mockFetch

    render(<MedicineSelect value="" onChange={() => {}} />)

    fireEvent.focus(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search product...')
    fireEvent.change(searchInput, { target: { value: 'Ibu' } })

    expect(screen.queryByText('Paracetamol')).toBeNull()
    expect(screen.getByText('Ibuprofen')).toBeDefined()
  })

  it('shows empty state when no products match search', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    render(<MedicineSelect value="" onChange={() => {}} />)

    fireEvent.focus(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search product...')
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } })

    expect(screen.getByText('No products found')).toBeDefined()
  })

  it('is disabled when disabled prop is true', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [] }),
    })
    global.fetch = mockFetch

    render(<MedicineSelect value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('clears input when clear button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    const handleChange = vi.fn()
    render(<MedicineSelect value="Paracetamol" onChange={handleChange} />)

    const clearButton = screen.getByLabelText('Clear medicine')
    fireEvent.click(clearButton)

    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('does not include quantity in input value when selecting a product', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [
          { id: '1', name: 'Paracetamol 500mg', currentStock: 100 },
        ],
      }),
    })
    global.fetch = mockFetch

    const handleChange = vi.fn()
    render(<MedicineSelect value="" onChange={handleChange} />)

    fireEvent.focus(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Paracetamol 500mg'))

    expect(handleChange).toHaveBeenCalledWith('Paracetamol 500mg')
    const calledValue = handleChange.mock.calls[0][0]
    expect(calledValue).not.toContain('Qty')
  })
})
