'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  CalendarClock,
  FolderOpen,
  HeartPulse,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  ReceiptText,
  SlidersHorizontal,
  Stethoscope,
  Truck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { canViewNavItem, type NavPermissionId } from '@/lib/role-permissions'

interface NavItem {
  id: NavPermissionId
  label: string
  icon: LucideIcon
  href: string
  badge?: string
}

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
  role?: string
}

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { id: 'registrations', label: 'Registrations', icon: UserPlus, href: '/register' },
      { id: 'billing', label: 'Billing', icon: Receipt, href: '/billing' },
    ],
  },
  {
    heading: 'Clinical',
    items: [
      { id: 'patients', label: 'Patients', icon: Users, href: '/patients' },
      { id: 'visits', label: 'Visits', icon: Activity, href: '/visits' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { id: 'followUps', label: 'Follow-ups', icon: CalendarClock, href: '/follow-ups' },
    ],
  },
  {
    heading: 'Purchase & Inventory',
    items: [
      { id: 'suppliers', label: 'Suppliers', icon: Truck, href: '/suppliers' },
      { id: 'categories', label: 'Categories', icon: FolderOpen, href: '/product-categories' },
      { id: 'products', label: 'Products', icon: Package, href: '/products' },
      { id: 'purchaseInvoices', label: 'Purchase Invoices', icon: ReceiptText, href: '/purchase-invoices' },
      { id: 'supplierPayments', label: 'Supplier Payments', icon: Wallet, href: '/supplier-payments' },
      { id: 'inventoryAdjustment', label: 'Inventory Adjustment', icon: SlidersHorizontal, href: '/inventory-adjustments' },
      { id: 'stockHistory', label: 'Stock History', icon: History, href: '/inventory-transactions' },
      { id: 'batches', label: 'Batches', icon: Package, href: '/batches' },
      { id: 'pharmacySales', label: 'Pharmacy Sales', icon: Stethoscope, href: '/pharmacy-sales' },
      { id: 'pharmacySalesHistory', label: 'Pharmacy Sales History', icon: ReceiptText, href: '/pharmacy-sales-history' },
    ],
  },
  {
    heading: 'Reports',
    items: [
      { id: 'consultations', label: 'Consultations', icon: BarChart3, href: '/reports/consultation' },
    ],
  },
]

export function SidebarNav({ collapsed = false, onNavigate, role }: SidebarNavProps) {
  const pathname = usePathname()
  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewNavItem(role, item.id)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground" suppressHydrationWarning>
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold text-foreground">New You</p>
              <p className="text-xs text-muted-foreground">Center for Weight Management</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleNavGroups.map((group) => (
          <div key={group.heading} className="mb-5">
            {!collapsed && (
              <p className="px-2 pb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon className="size-[1.15rem] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )

                return (
                  <li key={item.label}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer card */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-xl bg-accent/60 p-3">
            <p className="text-xs font-semibold text-accent-foreground">Shift: Morning</p>
            <p className="mt-0.5 text-xs text-muted-foreground">NewYou</p>
          </div>
        </div>
      )}
    </div>
  )
}
