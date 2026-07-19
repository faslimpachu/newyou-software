import {
  Activity,
  CalendarClock,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Receipt,
  BarChart3,
  Settings,
  Stethoscope,
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
      { label: 'Registrations', icon: UserPlus, href: '/register', badge: '128' },
      { label: 'Visits', icon: Activity, href: '/visits' },
    ],
  },
  {
    heading: 'Clinical',
    items: [
      { label: 'Patients', icon: Users, href: '/patients' },
      { label: 'Nutrition', icon: Leaf, href: '/nutrition' },
      { label: 'Ayurcare', icon: FlaskConical, href: '/ayurcare' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Follow-ups', icon: CalendarClock, href: '/follow-ups', badge: '54' },
      { label: 'Billing', icon: Receipt, href: '/billing' },
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
]
