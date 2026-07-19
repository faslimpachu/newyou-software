import {
  Activity,
  CalendarClock,
  LayoutDashboard,
  Receipt,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge?: string
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Registrations', icon: UserPlus, href: '/register' },
      { label: 'Visits', icon: Activity, href: '/visits' },
    ],
  },
  {
    heading: 'Clinical',
    items: [
      { label: 'Patients', icon: Users, href: '/patients' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Follow-ups', icon: CalendarClock, href: '/follow-ups' },
      { label: 'Billing', icon: Receipt, href: '/billing' },
    ],
  },
]
