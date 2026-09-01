import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarNav } from './sidebar-nav'

describe('SidebarNav', () => {
  it('does not flash menu items before the role loads', () => {
    render(<SidebarNav />)

    expect(screen.queryByText('Billing')).toBeNull()
    expect(screen.queryByText('Patients')).toBeNull()
    expect(screen.queryByText('Pharmacy Sales')).toBeNull()
  })

  it('shows only doctor menu items for the doctor role', () => {
    render(<SidebarNav role="doctor" />)

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Patients')).toBeDefined()
    expect(screen.getByText('Visits')).toBeDefined()
    expect(screen.getByText('Follow-ups')).toBeDefined()
    expect(screen.getByText('Consultations')).toBeDefined()
    expect(screen.queryByText('Billing')).toBeNull()
    expect(screen.queryByText('Pharmacy Sales')).toBeNull()
    expect(screen.queryByText('Purchase Invoices')).toBeNull()
  })

  it('keeps the full menu for existing roles', () => {
    render(<SidebarNav role="receptionist" />)

    expect(screen.getByText('Billing')).toBeDefined()
    expect(screen.getByText('Pharmacy Sales')).toBeDefined()
    expect(screen.getByText('Purchase Invoices')).toBeDefined()
  })
})
