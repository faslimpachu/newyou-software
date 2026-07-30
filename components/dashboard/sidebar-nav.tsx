'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  CalendarClock,
  HeartPulse,
  LayoutDashboard,
  Receipt,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge?: string
}

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
}

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Registrations', icon: UserPlus, href: '/register' },
      { label: 'Billing', icon: Receipt, href: '/billing' },
    ],
  },
  {
    heading: 'Clinical',
    items: [
      { label: 'Patients', icon: Users, href: '/patients' },
      { label: 'Visits', icon: Activity, href: '/visits' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Follow-ups', icon: CalendarClock, href: '/follow-ups' },
    ],
  },
]

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

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
        {navGroups.map((group) => (
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
            <p className="mt-0.5 text-xs text-muted-foreground">Dr. Kavya  on duty</p>
          </div>
        </div>
      )}
    </div>
  )
}
