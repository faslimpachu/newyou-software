import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PharmacySalesPage from '@/app/pharmacy-sales/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pharmacy-sales',
}))

const productsResponse = {
  products: [
    { id: 'p1', name: 'Paracetamol', sku: 'PCM', unit: 'pcs', sellingPrice: 5, currentStock: 10 },
  ],
  page: 1,
  pageSize: 100,
  total: 1,
  totalPages: 1,
}

const patientMatch = { mr: 'MR000001', patientName: 'Test Patient', mobileNumber: '9845012345', age: 30 }
const patientDetail = {
  patient: {
    mr: 'MR000001',
    patientName: 'Test Patient',
    mobileNumber: '9845012345',
    gender: 'Male',
    age: 30,
    dob: '1995-01-01',
    bloodGroup: 'B+',
    address: 'Main St',
    district: 'Kannur',
    state: 'Kerala',
    pinCode: '670001',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/products')) {
      return Promise.resolve({ ok: true, json: async () => productsResponse })
    }
    if (url.includes('/api/batches')) {
      return Promise.resolve({ ok: true, json: async () => ({ batches: [] }) })
    }
    if (url.includes('/api/patients?')) {
      return Promise.resolve({ ok: true, json: async () => ({ patients: [patientMatch] }) })
    }
    if (url.includes('/api/patients/')) {
      return Promise.resolve({ ok: true, json: async () => patientDetail })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  })
})

describe('PharmacySalesPage', () => {
  it('renders the sale form with patient fields always read-only', () => {
    render(<PharmacySalesPage />)
    expect(screen.getByRole('heading', { name: 'Pharmacy Sales' })).toBeTruthy()
    expect(screen.getByText('New Sale')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Record Sale/i })).toBeTruthy()

    const nameInput = document.getElementById('customerName') as HTMLInputElement
    expect(nameInput).toBeTruthy()
    expect(nameInput.readOnly).toBe(true)
    expect(nameInput.placeholder).toMatch(/auto-filled/i)

    expect(screen.getByRole('button', { name: /Add Item/i })).toBeTruthy()
    expect(screen.getByLabelText('Payment Reference')).toBeTruthy()
    expect(screen.getByPlaceholderText('Cheque/UTR number')).toBeTruthy()
    expect(screen.queryByLabelText('Notes')).toBeNull()
  })

  it('requires an MR number before saving', async () => {
    render(<PharmacySalesPage />)
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(await screen.findByText(/MR number is required/i)).toBeTruthy()
  })

  it('searches patients when an MR number is entered', async () => {
    render(<PharmacySalesPage />)
    const input = screen.getByPlaceholderText(/e\.g\. MR000003/i)
    fireEvent.change(input, { target: { value: 'MR000001' } })
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/patients?search='),
        expect.anything()
      )
    )
    expect(await screen.findByText(/MR000001/)).toBeTruthy()
  })

  it('selecting a patient auto-fills and locks the detail fields', async () => {
    render(<PharmacySalesPage />)
    const input = screen.getByPlaceholderText(/e\.g\. MR000003/i)
    fireEvent.change(input, { target: { value: 'MR000001' } })
    const matchButton = await screen.findByText(/MR000001/)
    fireEvent.click(matchButton)

    const nameInput = (await screen.findByDisplayValue('Test Patient')) as HTMLInputElement
    expect(nameInput).toBeTruthy()
    await waitFor(() => expect(nameInput.readOnly).toBe(true))
    const genderInput = screen.getByDisplayValue('Male') as HTMLInputElement
    expect(genderInput.readOnly).toBe(true)
    const mrInput = document.getElementById('mrNumber') as HTMLInputElement
    expect(mrInput.value).toBe('MR000001')
    expect(mrInput.readOnly).toBe(true)
    expect(screen.getByText(/Patient linked — details auto-filled and locked/i)).toBeTruthy()
  })

  it('lets the user add and remove sale item rows', async () => {
    render(<PharmacySalesPage />)

    // starts with a single row; its remove button is disabled
    let removeButtons = screen.getAllByLabelText('Remove item')
    expect(removeButtons).toHaveLength(1)
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }))

    removeButtons = screen.getAllByLabelText('Remove item')
    expect(removeButtons).toHaveLength(2)
    expect((removeButtons[1] as HTMLButtonElement).disabled).toBe(false)

    // removing one leaves a single row again (remove disabled)
    fireEvent.click(removeButtons[1])
    removeButtons = screen.getAllByLabelText('Remove item')
    expect(removeButtons).toHaveLength(1)
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('loads all active product pages for the product dropdown', async () => {
    const firstPageProducts = Array.from({ length: 100 }, (_, index) => ({
      id: `p-${index + 1}`,
      name: `Product ${index + 1}`,
      sku: `SKU-${index + 1}`,
      unit: 'pcs',
      sellingPrice: 5,
      currentStock: 10,
    }))
    const secondPageProduct = {
      id: 'p-101',
      name: 'Product 101',
      sku: 'SKU-101',
      unit: 'pcs',
      sellingPrice: 5,
      currentStock: 10,
    }
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/products') && url.includes('page=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            products: firstPageProducts,
            page: 1,
            pageSize: 100,
            total: 101,
            totalPages: 2,
          }),
        })
      }
      if (url.includes('/api/products') && url.includes('page=2')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            products: [secondPageProduct],
            page: 2,
            pageSize: 100,
            total: 101,
            totalPages: 2,
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ batches: [] }) })
    })

    render(<PharmacySalesPage />)

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products?active=true&page=2&pageSize=100'),
      ),
    )

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/products?active=true&page=2&pageSize=100'),
    )
  })
})
