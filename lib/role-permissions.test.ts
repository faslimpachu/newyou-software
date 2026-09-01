import { describe, expect, it } from 'vitest'
import { canViewNavItem, ROLE_LABELS, USER_ROLES } from './role-permissions'

describe('role permissions', () => {
  it('includes doctor as a manageable user role', () => {
    expect(USER_ROLES).toContain('doctor')
    expect(ROLE_LABELS.doctor).toBe('Doctor')
  })

  it('keeps existing roles on the full menu', () => {
    expect(canViewNavItem('superadmin', 'pharmacySalesHistory')).toBe(true)
    expect(canViewNavItem('admin', 'purchaseInvoices')).toBe(true)
    expect(canViewNavItem('receptionist', 'billing')).toBe(true)
  })

  it('hides menu items while the role is still loading', () => {
    expect(canViewNavItem(undefined, 'billing')).toBe(false)
    expect(canViewNavItem(undefined, 'patients')).toBe(false)
  })

  it('limits doctor to clinical menu items only', () => {
    expect(canViewNavItem('doctor', 'patients')).toBe(true)
    expect(canViewNavItem('doctor', 'visits')).toBe(true)
    expect(canViewNavItem('doctor', 'pharmacySales')).toBe(false)
    expect(canViewNavItem('doctor', 'purchaseInvoices')).toBe(false)
  })
})
