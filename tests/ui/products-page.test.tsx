import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react'
import ProductsPage from '@/app/products/page'

const mockProducts = [
  {
    id: '1',
    name: 'Paracetamol',
    code: 'PRD-001',
    sku: 'MED001',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Medicines' },
    unit: 'strip',
    purchasePrice: 10,
    sellingPrice: 15,
    gstPercent: 5,
    minimumStock: 50,
    maximumStock: 200,
    currentStock: 500,
    imageUrl: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Deactivated Product',
    code: 'PRD-002',
    sku: 'MED002',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Medicines' },
    unit: 'strip',
    purchasePrice: 10,
    sellingPrice: 15,
    gstPercent: 5,
    minimumStock: 50,
    maximumStock: 200,
    currentStock: 0,
    imageUrl: null,
    active: false,
    createdAt: new Date().toISOString(),
  },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/products')) {
    return {
      ok: true,
      json: async () => ({
        products: mockProducts,
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      }),
    } as Response
  }
  if (url.includes('/api/product-categories')) {
    return {
      ok: true,
      json: async () => ({ categories: [{ id: 'cat-1', name: 'Medicines', active: true }] }),
    } as Response
  }
  if (url.includes('/api/products/low-stock')) {
    return {
      ok: true,
      json: async () => ({ count: 0 }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Products Page UI', () => {
  beforeEach(() => {
    render(<ProductsPage />)
  })

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Products', level: 1 })).toBeDefined()
    })
  })

  it('renders products table with product data', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.getByText('PRD-001')).toBeDefined()
    expect(screen.getByText('MED001')).toBeDefined()
  })

  it('shows product count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/1 product\(s\) in the system/)).toBeDefined()
    })
  })

  it('create product form is hidden by default', async () => {
    await waitFor(() => {
      expect(screen.queryByLabelText('Product Name')).toBeNull()
    })
  })

  it('shows create product button when form is hidden', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create product/i })).toBeDefined()
    })
  })

  it('shows product form fields after clicking create button', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Product')
    act(() => {
      fireEvent.click(createButtons[0])
    })
    expect(screen.getByText('Add a new product to inventory')).toBeDefined()
    expect(screen.getByPlaceholderText('Enter product name')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g., MED-001')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g., pcs, strip, bottle')).toBeDefined()
    expect(screen.getByPlaceholderText('Auto-generated on create')).toBeDefined()
    expect(screen.getByPlaceholderText('Enter product name').closest('input')).not.toBeDisabled()
    expect(screen.getByPlaceholderText('Auto-generated on create').closest('input')).toBeDisabled()
    // Selling Price and Purchase Price fields are hidden in UI
    expect(screen.queryByLabelText('Selling Price *')).toBeNull()
    expect(screen.queryByLabelText('Purchase Price *')).toBeNull()
  })

  it('opens edit form with product values and disabled code field', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })
    expect(screen.getByText('Update product details below')).toBeDefined()
    expect(screen.getByDisplayValue('Paracetamol')).toBeDefined()
    expect(screen.getByDisplayValue('PRD-001')).toBeDefined()
    expect(screen.getByDisplayValue('PRD-001').closest('input')).toBeDisabled()
  })

  it('disables Edit button for deactivated products', async () => {
    await waitFor(() => {
      expect(screen.getByText('Deactivated Product')).toBeDefined()
    })

    const deactivatedRow = screen.getByText('Deactivated Product').closest('tr')
    expect(deactivatedRow).not.toBeNull()

    const editButton = within(deactivatedRow!).getByRole('button', { name: 'Edit' })
    expect(editButton).toBeDisabled()
  })

  it('hides Delete button for deactivated products', async () => {
    await waitFor(() => {
      expect(screen.getByText('Deactivated Product')).toBeDefined()
    })

    const deactivatedRow = screen.getByText('Deactivated Product').closest('tr')
    expect(deactivatedRow).not.toBeNull()

    const deleteButtons = within(deactivatedRow!).queryAllByRole('button', { name: 'Delete' })
    expect(deleteButtons).toHaveLength(0)
  })

  it('does not send currentStock in PATCH body when editing', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products/') && options?.method === 'PATCH') {
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            product: { ...mockProducts[0], currentStock: 500 },
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.change(screen.getByDisplayValue('Paracetamol'), { target: { value: 'Paracetamol Updated' } })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Update Product' }))
    })

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })

    expect(capturedBody.name).toBe('Paracetamol Updated')
    expect(capturedBody).not.toHaveProperty('currentStock')
    expect(capturedBody.code).toBe('PRD-001')

    ;(global as any).fetch = originalFetch
  })

  it('does not send sellingPrice or purchasePrice in PATCH body when editing', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products/') && options?.method === 'PATCH') {
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            product: { ...mockProducts[0], currentStock: 500 },
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.change(screen.getByDisplayValue('Paracetamol'), { target: { value: 'Paracetamol Updated' } })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Update Product' }))
    })

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })

    expect(capturedBody.name).toBe('Paracetamol Updated')
    expect(capturedBody).not.toHaveProperty('sellingPrice')
    expect(capturedBody).not.toHaveProperty('purchasePrice')
    expect(capturedBody.code).toBe('PRD-001')

    ;(global as any).fetch = originalFetch
  })

  it('does not send active field in PATCH body when editing', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products/') && options?.method === 'PATCH') {
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            product: { ...mockProducts[0] },
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.change(screen.getByDisplayValue('Paracetamol'), { target: { value: 'Paracetamol Updated' } })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Update Product' }))
    })

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })

    expect(capturedBody).not.toHaveProperty('active')

    ;(global as any).fetch = originalFetch
  })

  it('shows category name in select after choosing a category', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Product')
    act(() => {
      fireEvent.click(createButtons[0])
    })

    const categoryTrigger = screen.getByText('Select category').closest('button')
    expect(categoryTrigger).not.toBeNull()
    act(() => {
      fireEvent.click(categoryTrigger!)
    })

    const listbox = document.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).toContain('Medicines')

    const medicineOption = listbox?.querySelector('[data-slot="select-item"]')
    expect(medicineOption).not.toBeNull()
    act(() => {
      fireEvent.click(medicineOption!)
    })

    const categoryValues = screen.getAllByText('Medicines')
    expect(categoryValues.length).toBeGreaterThanOrEqual(1)
  })

  it('shows edit button for products', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('displays stock values in table', async () => {
    await waitFor(() => {
      expect(screen.getByText('500 strip')).toBeDefined()
    })
  })

  it('shows view button for products', async () => {
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button')
      expect(viewButtons.length).toBeGreaterThan(0)
    })
  })

  it('creates a product with a unique SKU successfully', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Product')
    act(() => {
      fireEvent.click(createButtons[0])
    })

    act(() => {
      fireEvent.change(screen.getByPlaceholderText('Enter product name'), { target: { value: 'New Product' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., MED-001'), { target: { value: 'UNIQUE-SKU-123' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., pcs, strip, bottle'), { target: { value: 'pcs' } })
    })
    // Purchase Price field hidden in UI
    // act(() => {
    //   fireEvent.change(screen.getByLabelText('Purchase Price *').closest('div')?.querySelector('input')!, { target: { value: '100' } })
    // })

    const categoryTrigger = screen.getByText('Select category').closest('button')
    act(() => {
      fireEvent.focus(categoryTrigger!)
      fireEvent.click(categoryTrigger!)
    })

    const listbox = await waitFor(() => document.querySelector('[role="listbox"]'))
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).toContain('Medicines')

    const medicineOption = listbox?.querySelector('[data-slot="select-item"]')
    expect(medicineOption).not.toBeNull()
    act(() => {
      fireEvent.click(medicineOption!)
    })

    let capturedUrl = ''
    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products') && options?.method === 'POST') {
        capturedUrl = url
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            products: mockProducts,
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    })

    expect(capturedUrl).toBe('/api/products')
    expect(capturedBody.name).toBe('New Product')
    expect(capturedBody.sku).toBe('UNIQUE-SKU-123')
    expect(capturedBody.code).toBeUndefined()
    expect(capturedBody.categoryId).toBe('cat-1')
    expect(capturedBody).not.toHaveProperty('sellingPrice')
    expect(capturedBody).not.toHaveProperty('purchasePrice')

    ;(global as any).fetch = originalFetch
  })

  it('shows error when submitting a product with a duplicate SKU', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Product')
    act(() => {
      fireEvent.click(createButtons[0])
    })

    act(() => {
      fireEvent.change(screen.getByPlaceholderText('Enter product name'), { target: { value: 'Duplicate SKU Product' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., MED-001'), { target: { value: 'MED001' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., pcs, strip, bottle'), { target: { value: 'pcs' } })
    })
    // Purchase Price field hidden in UI
    // act(() => {
    //   fireEvent.change(screen.getByLabelText('Purchase Price *').closest('div')?.querySelector('input')!, { target: { value: '100' } })
    // })

    const categoryTrigger = screen.getByText('Select category').closest('button')
    act(() => {
      fireEvent.focus(categoryTrigger!)
      fireEvent.click(categoryTrigger!)
    })

    const listbox = await waitFor(() => document.querySelector('[role="listbox"]'))
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).toContain('Medicines')

    const medicineOption = listbox?.querySelector('[data-slot="select-item"]')
    expect(medicineOption).not.toBeNull()
    act(() => {
      fireEvent.click(medicineOption!)
    })

    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products') && options?.method === 'POST') {
        capturedBody = JSON.parse(options.body)
        return {
          ok: false,
          json: async () => ({ error: 'SKU already exists' }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    })

    await waitFor(() => {
      expect(screen.getByText('SKU already exists')).toBeDefined()
    })

    expect(capturedBody.sku).toBe('MED001')
    expect(capturedBody.code).toBeUndefined()

    ;(global as any).fetch = originalFetch
  })

  it('does not send code field for create operations', async () => {
    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create Product')
    act(() => {
      fireEvent.click(createButtons[0])
    })

    act(() => {
      fireEvent.change(screen.getByPlaceholderText('Enter product name'), { target: { value: 'Test Product' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., MED-001'), { target: { value: 'TEST-SKU-999' } })
    })
    act(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., pcs, strip, bottle'), { target: { value: 'pcs' } })
    })
    // Purchase Price field hidden in UI — no longer interacts with it
    // act(() => {
    //   fireEvent.change(screen.getByLabelText('Purchase Price *').closest('div')?.querySelector('input')!, { target: { value: '100' } })
    // })

    const categoryTrigger = screen.getByText('Select category').closest('button')
    act(() => {
      fireEvent.focus(categoryTrigger!)
      fireEvent.click(categoryTrigger!)
    })

    const listbox = await waitFor(() => document.querySelector('[role="listbox"]'))
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).toContain('Medicines')

    const medicineOption = listbox?.querySelector('[data-slot="select-item"]')
    expect(medicineOption).not.toBeNull()
    act(() => {
      fireEvent.click(medicineOption!)
    })

    let capturedBody: any = null
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products') && options?.method === 'POST') {
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            products: mockProducts,
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    })

    expect(capturedBody).not.toHaveProperty('code')
    expect(capturedBody.name).toBe('Test Product')
    expect(capturedBody.sku).toBe('TEST-SKU-999')

    ;(global as any).fetch = originalFetch
  })

  it('closes edit form when the product being edited is deactivated', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    expect(screen.getByText('Update product details below')).toBeDefined()
    expect(screen.getByDisplayValue('Paracetamol')).toBeDefined()

    let deleteCalled = false
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/products/') && options?.method === 'DELETE') {
        deleteCalled = true
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      if (url.includes('/api/products') && options?.method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            products: [],
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 1,
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    act(() => {
      fireEvent.click(deleteButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText('Deactivate this product?')).toBeDefined()
    })
    const confirmButton = screen.getByRole('button', { name: 'Deactivate' })
    act(() => {
      fireEvent.click(confirmButton)
    })

    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })

    await waitFor(() => {
      expect(screen.queryByText('Update product details below')).toBeNull()
    })
    expect(screen.queryByDisplayValue('Paracetamol')).toBeNull()

    ;(global as any).fetch = originalFetch
  })

  it('shows confirm dialog when delete is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    const row = screen.getByText('Paracetamol').closest('tr')
    expect(row).not.toBeNull()
    const deleteButton = within(row!).getByRole('button', { name: 'Delete' })
    act(() => {
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this product?')).toBeDefined()
    })
    expect(screen.getByText(/This will mark Paracetamol as inactive/)).toBeDefined()
  })

  it('cancels delete and keeps product when Cancel is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    const row = screen.getByText('Paracetamol').closest('tr')
    expect(row).not.toBeNull()
    const deleteButton = within(row!).getByRole('button', { name: 'Delete' })
    act(() => {
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this product?')).toBeDefined()
    })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    act(() => {
      fireEvent.click(cancelButton)
    })
    await waitFor(() => {
      expect(screen.queryByText('Deactivate this product?')).toBeNull()
    })
    expect(screen.getByText('Paracetamol')).toBeDefined()
  })

  it('does not show Selling Price column in products table', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    expect(screen.queryByText('Selling Price')).toBeNull()
  })

  it('does not show Selling Price in product view dialog', async () => {
    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined()
    })
    const row = screen.getByText('Paracetamol').closest('tr')
    expect(row).not.toBeNull()
    const viewButton = within(row!).getByRole('button', { name: 'View' })
    act(() => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Product Details: Paracetamol')).toBeDefined()
    })
    expect(screen.queryByText('Selling Price')).toBeNull()
  })

  it('does not show Selling Price field in edit form', async () => {
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    expect(screen.getByText('Update product details below')).toBeDefined()
    expect(screen.queryByLabelText('Selling Price *')).toBeNull()
  })
})
