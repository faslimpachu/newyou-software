import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react'
import ProductCategoriesPage from '@/app/product-categories/page'

const mockCategories = [
  {
    id: '1',
    name: 'Medicines',
    description: 'Medicine products',
    active: true,
    createdAt: new Date().toISOString(),
    _count: { products: 10 },
  },
  {
    id: '2',
    name: 'Supplements',
    description: 'Supplement products',
    active: false,
    createdAt: new Date().toISOString(),
    _count: { products: 0 },
  },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/product-categories')) {
    return {
      ok: true,
      json: async () => ({
        categories: mockCategories,
      }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Product Categories Page UI', () => {
  beforeEach(() => {
    render(<ProductCategoriesPage />)
  })

  it('renders categories in the table', async () => {
    await waitFor(() => {
      expect(screen.getByText('Medicines')).toBeDefined()
    })
    expect(screen.getByText('Supplements')).toBeDefined()
  })

  it('opens edit form with category values', async () => {
    await waitFor(() => {
      expect(screen.getByText('Medicines')).toBeDefined()
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })
    expect(screen.getByText('Update category details below')).toBeDefined()
    expect(screen.getByDisplayValue('Medicines')).toBeDefined()
    expect(screen.getByDisplayValue('Medicine products')).toBeDefined()
  })

  it('disables Edit button for deactivated categories', async () => {
    await waitFor(() => {
      expect(screen.getByText('Supplements')).toBeDefined()
    })

    const deactivatedRow = screen.getByText('Supplements').closest('tr')
    expect(deactivatedRow).not.toBeNull()

    const editButton = within(deactivatedRow!).getByRole('button', { name: 'Edit' })
    expect(editButton).toBeDisabled()
  })

  it('hides Delete button for deactivated categories', async () => {
    await waitFor(() => {
      expect(screen.getByText('Supplements')).toBeDefined()
    })

    const deactivatedRow = screen.getByText('Supplements').closest('tr')
    expect(deactivatedRow).not.toBeNull()

    const trashButtons = within(deactivatedRow!).queryAllByRole('button', { name: '' })
    expect(trashButtons).toHaveLength(0)
  })

  it('closes edit form when the category being edited is deactivated', async () => {
    const originalConfirm = window.confirm
    ;(window as any).confirm = () => true

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })
    const editButtons = screen.getAllByText('Edit')
    act(() => {
      fireEvent.click(editButtons[0])
    })

    expect(screen.getByText('Update category details below')).toBeDefined()
    expect(screen.getByDisplayValue('Medicines')).toBeDefined()

    let deleteCalled = false
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/product-categories/') && options?.method === 'DELETE') {
        deleteCalled = true
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      if (url.includes('/api/product-categories') && options?.method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            categories: [mockCategories[1]],
          }),
        } as Response
      }
      return originalFetch(url, options)
    }

    const deleteButtons = screen.getAllByRole('button', { name: '' })
    act(() => {
      fireEvent.click(deleteButtons[0])
    })

    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })

    await waitFor(() => {
      expect(screen.queryByText('Update category details below')).toBeNull()
    })
    expect(screen.queryByDisplayValue('Medicines')).toBeNull()

    ;(global as any).fetch = originalFetch
    ;(window as any).confirm = originalConfirm
  })
})
