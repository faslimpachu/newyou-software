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
