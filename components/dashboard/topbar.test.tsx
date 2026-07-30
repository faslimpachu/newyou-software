import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Topbar } from '@/components/dashboard/topbar'

describe('Topbar', () => {
  it('shows logged-in user name and role', () => {
    render(
      <Topbar
        onToggleCollapse={() => {}}
        onOpenMobile={() => {}}
        user={{ name: 'Super Admin', role: 'superadmin' }}
      />
    )

    expect(screen.getByText('Super Admin')).toBeDefined()
    expect(screen.getByText('Superadmin')).toBeDefined()
  })

  it('shows fallback when no user is provided', () => {
    render(<Topbar onToggleCollapse={() => {}} onOpenMobile={() => {}} />)

    const userTexts = screen.getAllByText('User')
    expect(userTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows initials based on user name', () => {
    render(
      <Topbar
        onToggleCollapse={() => {}}
        onOpenMobile={() => {}}
        user={{ name: 'Alice Johnson', role: 'admin' }}
      />
    )

    expect(screen.getByText('AJ')).toBeDefined()
    expect(screen.getByText('Alice Johnson')).toBeDefined()
    expect(screen.getByText('Admin')).toBeDefined()
  })

  it('calls logout API and redirects to login on logout click', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    render(
      <Topbar
        onToggleCollapse={() => {}}
        onOpenMobile={() => {}}
        user={{ name: 'Super Admin', role: 'superadmin' }}
      />
    )

    const logoutButton = screen.getByLabelText('Logout')
    await logoutButton.click()

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })

    fetchSpy.mockRestore()
  })
})
