import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react'
import UsersPage from '@/app/admin/users/page'

const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    role: 'superadmin',
    phone: '9876543210',
    centerType: 'both',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Inactive User',
    username: 'inactive',
    role: 'receptionist',
    phone: null,
    centerType: 'nutrition',
    active: false,
    createdAt: new Date().toISOString(),
  },
]

global.fetch = async (url: string) => {
  if (url.includes('/api/admin/users')) {
    return {
      ok: true,
      json: async () => ({ users: mockUsers }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

describe('Admin Users Page UI', () => {
  beforeEach(() => {
    render(<UsersPage />)
  })

  it('renders page heading', async () => {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'User Management', level: 1 })).toBeDefined()
    })
  })

  it('renders users table with data', async () => {
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeDefined()
    })
    expect(screen.getByText('admin')).toBeDefined()
    expect(screen.getByText('superadmin')).toBeDefined()
  })

  it('shows user count', async () => {
    await waitFor(() => {
      expect(screen.getByText(/2 user\(s\) in the system/)).toBeDefined()
    })
  })

  it('shows create form when Create User is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeDefined()
    })
    const createButtons = screen.getAllByText('Create User')
    const createButton = createButtons.find((el) => el.tagName === 'BUTTON')
    expect(createButton).toBeDefined()
    act(() => {
      fireEvent.click(createButton!)
    })
    expect(screen.getByText('Add a new user to the system')).toBeDefined()
    expect(screen.getByLabelText('Name')).toBeDefined()
  })

  it('includes Doctor in the role picker', async () => {
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeDefined()
    })

    const roleCombobox = screen.getAllByRole('combobox')[0]
    act(() => {
      fireEvent.click(roleCombobox)
    })

    await waitFor(() => {
      expect(screen.getByText('Doctor')).toBeDefined()
    })
  })

  it('shows confirm dialog when delete is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeDefined()
    })
    const row = screen.getByText('Admin User').closest('tr')
    expect(row).not.toBeNull()
    const deleteButton = within(row!).getByRole('button', { name: '' })
    act(() => {
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this user?')).toBeDefined()
    })
    expect(screen.getByText(/This will mark Admin User as inactive/)).toBeDefined()
  })

  it('cancels delete and keeps user when Cancel is clicked', async () => {
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeDefined()
    })
    const row = screen.getByText('Admin User').closest('tr')
    expect(row).not.toBeNull()
    const deleteButton = within(row!).getByRole('button', { name: '' })
    act(() => {
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this user?')).toBeDefined()
    })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    act(() => {
      fireEvent.click(cancelButton)
    })
    await waitFor(() => {
      expect(screen.queryByText('Deactivate this user?')).toBeNull()
    })
    expect(screen.getByText('Admin User')).toBeDefined()
  })

  it('deletes user when confirm is clicked', async () => {
    let deleteCalled = false
    const originalFetch = (global as any).fetch
    ;(global as any).fetch = async (url: string, options?: any) => {
      if (url.includes('/api/admin/users/') && options?.method === 'DELETE') {
        deleteCalled = true
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      if (url.includes('/api/admin/users')) {
        return {
          ok: true,
          json: async () => ({ users: [mockUsers[1]] }),
        } as Response
      }
      return originalFetch(url, options)
    }

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeDefined()
    })
    const row = screen.getByText('Admin User').closest('tr')
    expect(row).not.toBeNull()
    const deleteButton = within(row!).getByRole('button', { name: '' })
    act(() => {
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(screen.getByText('Deactivate this user?')).toBeDefined()
    })
    const confirmButton = screen.getByRole('button', { name: 'Deactivate' })
    act(() => {
      fireEvent.click(confirmButton)
    })
    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })
    await waitFor(() => {
      expect(screen.queryByText('Deactivate this user?')).toBeNull()
    })
    expect(screen.queryByText('Admin User')).toBeNull()

    ;(global as any).fetch = originalFetch
  })
})
