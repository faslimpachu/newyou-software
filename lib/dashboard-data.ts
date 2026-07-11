import {
  Activity,
  CalendarClock,
  CalendarDays,
  IndianRupee,
  Leaf,
  Receipt,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type Trend = 'up' | 'down' | 'neutral'

export interface StatItem {
  key: string
  label: string
  value: string
  delta: string
  trend: Trend
  icon: LucideIcon
  hint: string
}

export const stats: StatItem[] = [
  {
    key: 'registrations',
    label: "Today's Registrations",
    value: '128',
    delta: '+12.4%',
    trend: 'up',
    icon: CalendarDays,
    hint: 'vs. yesterday',
  },
  {
    key: 'visits',
    label: "Today's Visits",
    value: '342',
    delta: '+6.1%',
    trend: 'up',
    icon: Activity,
    hint: 'vs. yesterday',
  },
  {
    key: 'total-patients',
    label: 'Total Patients',
    value: '18,204',
    delta: '+2.3%',
    trend: 'up',
    icon: Users,
    hint: 'all time',
  },
  {
    key: 'nutrition',
    label: 'Nutrition Patients',
    value: '1,542',
    delta: '+4.8%',
    trend: 'up',
    icon: Leaf,
    hint: 'active plans',
  },
  {
    key: 'ayurcare',
    label: 'Ayurcare Patients',
    value: '976',
    delta: '-1.2%',
    trend: 'down',
    icon: Stethoscope,
    hint: 'active plans',
  },
  {
    key: 'revenue',
    label: 'Revenue Today',
    value: '₹4.82L',
    delta: '+9.7%',
    trend: 'up',
    icon: IndianRupee,
    hint: 'vs. yesterday',
  },
  {
    key: 'pending-bills',
    label: 'Pending Bills',
    value: '37',
    delta: '+5',
    trend: 'down',
    icon: Receipt,
    hint: 'awaiting payment',
  },
  {
    key: 'followup',
    label: 'Follow-up Today',
    value: '54',
    delta: '+8.0%',
    trend: 'up',
    icon: CalendarClock,
    hint: 'scheduled',
  },
]

export const monthlyRegistrations = [
  { month: 'Jan', registrations: 2140 },
  { month: 'Feb', registrations: 2380 },
  { month: 'Mar', registrations: 2610 },
  { month: 'Apr', registrations: 2490 },
  { month: 'May', registrations: 2870 },
  { month: 'Jun', registrations: 3120 },
  { month: 'Jul', registrations: 2990 },
  { month: 'Aug', registrations: 3340 },
  { month: 'Sep', registrations: 3510 },
  { month: 'Oct', registrations: 3280 },
  { month: 'Nov', registrations: 3720 },
  { month: 'Dec', registrations: 3960 },
]

export const monthlyRevenue = [
  { month: 'Jan', revenue: 82, expenses: 51 },
  { month: 'Feb', revenue: 91, expenses: 55 },
  { month: 'Mar', revenue: 104, expenses: 60 },
  { month: 'Apr', revenue: 98, expenses: 58 },
  { month: 'May', revenue: 121, expenses: 66 },
  { month: 'Jun', revenue: 134, expenses: 71 },
  { month: 'Jul', revenue: 128, expenses: 69 },
  { month: 'Aug', revenue: 147, expenses: 74 },
  { month: 'Sep', revenue: 156, expenses: 79 },
  { month: 'Oct', revenue: 143, expenses: 76 },
  { month: 'Nov', revenue: 168, expenses: 82 },
  { month: 'Dec', revenue: 182, expenses: 88 },
]

export const consultationTypes = [
  { type: 'General', value: 420, fill: 'var(--color-general)' },
  { type: 'Nutrition', value: 260, fill: 'var(--color-nutrition)' },
  { type: 'Ayurcare', value: 180, fill: 'var(--color-ayurcare)' },
  { type: 'Follow-up', value: 140, fill: 'var(--color-followup)' },
]

export type RegStatus = 'New' | 'Returning' | 'Referral'

export interface Registration {
  id: string
  name: string
  age: number
  gender: 'M' | 'F'
  department: string
  status: RegStatus
  time: string
}

export const recentRegistrations: Registration[] = [
  { id: 'REG-24817', name: 'Aarav Sharma', age: 34, gender: 'M', department: 'General Medicine', status: 'New', time: '09:12 AM' },
  { id: 'REG-24816', name: 'Priya Nair', age: 28, gender: 'F', department: 'Nutrition', status: 'Returning', time: '09:03 AM' },
  { id: 'REG-24815', name: 'Rohan Mehta', age: 45, gender: 'M', department: 'Ayurcare', status: 'Referral', time: '08:54 AM' },
  { id: 'REG-24814', name: 'Sana Kapoor', age: 31, gender: 'F', department: 'General Medicine', status: 'New', time: '08:41 AM' },
  { id: 'REG-24813', name: 'Vikram Rao', age: 52, gender: 'M', department: 'Cardiology', status: 'Returning', time: '08:33 AM' },
  { id: 'REG-24812', name: 'Meera Iyer', age: 26, gender: 'F', department: 'Nutrition', status: 'New', time: '08:20 AM' },
]

export type FollowupStatus = 'Confirmed' | 'Pending' | 'Missed'

export interface Followup {
  id: string
  patient: string
  doctor: string
  department: string
  slot: string
  status: FollowupStatus
}

export const upcomingFollowups: Followup[] = [
  { id: 'FU-5521', patient: 'Aditya Menon', doctor: 'Dr. Kavya Reddy', department: 'Ayurcare', slot: '10:30 AM', status: 'Confirmed' },
  { id: 'FU-5522', patient: 'Ishaan Gupta', doctor: 'Dr. Neha Verma', department: 'Nutrition', slot: '11:00 AM', status: 'Pending' },
  { id: 'FU-5523', patient: 'Lakshmi Pillai', doctor: 'Dr. Arjun Das', department: 'General', slot: '11:45 AM', status: 'Confirmed' },
  { id: 'FU-5524', patient: 'Karan Singh', doctor: 'Dr. Kavya Reddy', department: 'Cardiology', slot: '12:15 PM', status: 'Missed' },
  { id: 'FU-5525', patient: 'Ananya Bose', doctor: 'Dr. Neha Verma', department: 'Nutrition', slot: '01:00 PM', status: 'Confirmed' },
]

export type BillStatus = 'Paid' | 'Pending' | 'Overdue'

export interface Bill {
  id: string
  patient: string
  service: string
  amount: string
  method: string
  status: BillStatus
}

export const recentBilling: Bill[] = [
  { id: 'INV-90231', patient: 'Aarav Sharma', service: 'Consultation + Lab', amount: '₹2,450', method: 'UPI', status: 'Paid' },
  { id: 'INV-90230', patient: 'Rohan Mehta', service: 'Ayurcare Package', amount: '₹8,900', method: 'Card', status: 'Pending' },
  { id: 'INV-90229', patient: 'Sana Kapoor', service: 'Diagnostics', amount: '₹3,120', method: 'Cash', status: 'Paid' },
  { id: 'INV-90228', patient: 'Vikram Rao', service: 'Cardiac Screening', amount: '₹6,700', method: 'Insurance', status: 'Overdue' },
  { id: 'INV-90227', patient: 'Meera Iyer', service: 'Nutrition Plan', amount: '₹1,800', method: 'UPI', status: 'Paid' },
]
