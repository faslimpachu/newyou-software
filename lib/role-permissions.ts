export const USER_ROLES = ['superadmin', 'admin', 'receptionist', 'doctor'] as const

export type UserRole = (typeof USER_ROLES)[number]

export type NavPermissionId =
  | 'dashboard'
  | 'registrations'
  | 'billing'
  | 'patients'
  | 'visits'
  | 'followUps'
  | 'suppliers'
  | 'categories'
  | 'products'
  | 'purchaseInvoices'
  | 'supplierPayments'
  | 'inventoryAdjustment'
  | 'stockHistory'
  | 'batches'
  | 'pharmacySales'
  | 'pharmacySalesHistory'
  | 'consultations'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
}

export const ROLE_MENU_PERMISSIONS: Record<UserRole, NavPermissionId[] | 'all'> = {
  superadmin: 'all',
  admin: 'all',
  receptionist: 'all',
  doctor: ['dashboard', 'patients', 'visits', 'followUps', 'consultations'],
}

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole)
}

export function canViewNavItem(role: string | undefined, itemId: NavPermissionId): boolean {
  if (!role) return false
  if (!isUserRole(role)) return true

  const permissions = ROLE_MENU_PERMISSIONS[role]
  return permissions === 'all' || permissions.includes(itemId)
}
