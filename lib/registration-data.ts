import { Leaf, FlaskConical, type LucideIcon } from 'lucide-react'

export type ConsultationCenter = 'nutrition' | 'ayurcare'

export interface CenterOption {
  id: ConsultationCenter
  name: string
  tagline: string
  description: string
  icon: LucideIcon
  services: string[]
}

export const centerOptions: CenterOption[] = [
  {
    id: 'nutrition',
    name: 'Nutrition Center',
    tagline: 'Diet & Wellness',
    description:
      'Personalized diet plans, metabolic assessments, and clinical nutrition therapy.',
    icon: Leaf,
    services: ['Diet Planning', 'Weight Management', 'Diabetic Care', 'Sports Nutrition'],
  },
  {
    id: 'ayurcare',
    name: 'Ayurcare Center',
    tagline: 'Ayurvedic Medicine',
    description:
      'Traditional Ayurvedic consultations, Panchakarma therapy, and herbal treatment plans.',
    icon: FlaskConical,
    services: ['Panchakarma', 'Herbal Therapy', 'Pulse Diagnosis', 'Detox Programs'],
  },
]

export type SearchField = 'mr' | 'mobile' | 'name' | 'parent'

export const searchFields: { id: SearchField; label: string; placeholder: string }[] = [
  { id: 'mr', label: 'MR Number', placeholder: 'e.g. NU000001 or AY000001' },
  { id: 'mobile', label: 'Mobile', placeholder: 'e.g. 98450 12345' },
  { id: 'name', label: 'Name', placeholder: 'e.g. Aarav Sharma' },
  { id: 'parent', label: 'Parent Name', placeholder: 'e.g. Rajesh Sharma' },
]

export interface PreviousVisit {
  id: string
  date: string
  center: string
  doctor: string
  reason: string
}

export interface OutstandingBill {
  id: string
  date: string
  service: string
  amount: number
  status: 'Pending' | 'Overdue'
}

export interface ExistingPatient {
  mr: string
  name: string
  parentName: string
  mobile: string
  age: number
  gender: 'Male' | 'Female' | 'Other' | 'Not specified'
  bloodGroup: string
  city: string
  lastVisit: string
  tags: string[]
  visits: PreviousVisit[]
  bills: OutstandingBill[]
  dob?: string
  address?: string
  allergies?: string
  conditions?: string
  medications?: string
  email?: string
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelation?: string
  smoking?: string
  alcohol?: string
  exercise?: string
  diet?: string
}

export const existingPatients: ExistingPatient[] = [
  {
    mr: 'NU000001',
    name: 'Aarav Sharma',
    parentName: 'Rajesh Sharma',
    mobile: '98450 12345',
    age: 34,
    gender: 'Male',
    bloodGroup: 'O+',
    city: 'Bengaluru',
    lastVisit: '02 Jun 2026',
    tags: ['Diabetic', 'Returning'],
    visits: [
      { id: 'V-8841', date: '02 Jun 2026', center: 'Nutrition Center', doctor: 'Dr. Neha Verma', reason: 'Diet review' },
      { id: 'V-8720', date: '14 Apr 2026', center: 'Nutrition Center', doctor: 'Dr. Neha Verma', reason: 'HbA1c follow-up' },
      { id: 'V-8511', date: '02 Feb 2026', center: 'Ayurcare Center', doctor: 'Dr. Arjun Das', reason: 'Detox consultation' },
    ],
    bills: [
      { id: 'INV-90112', date: '02 Jun 2026', service: 'Nutrition Consultation', amount: 1800, status: 'Pending' },
      { id: 'INV-89540', date: '14 Apr 2026', service: 'Lab Panel', amount: 2450, status: 'Overdue' },
    ],
  },
  {
    mr: 'NU000002',
    name: 'Priya Nair',
    parentName: 'Suresh Nair',
    mobile: '99860 45678',
    age: 28,
    gender: 'Female',
    bloodGroup: 'A+',
    city: 'Kochi',
    lastVisit: '21 May 2026',
    tags: ['Nutrition', 'Returning'],
    visits: [
      { id: 'V-8798', date: '21 May 2026', center: 'Nutrition Center', doctor: 'Dr. Neha Verma', reason: 'Weight management' },
      { id: 'V-8602', date: '19 Mar 2026', center: 'Nutrition Center', doctor: 'Dr. Neha Verma', reason: 'Initial assessment' },
    ],
    bills: [],
  },
  {
    mr: 'AY000001',
    name: 'Rohan Mehta',
    parentName: 'Anil Mehta',
    mobile: '90080 33221',
    age: 45,
    gender: 'Male',
    bloodGroup: 'B+',
    city: 'Pune',
    lastVisit: '30 May 2026',
    tags: ['Ayurcare', 'Referral'],
    visits: [
      { id: 'V-8825', date: '30 May 2026', center: 'Ayurcare Center', doctor: 'Dr. Arjun Das', reason: 'Panchakarma session 3' },
      { id: 'V-8790', date: '16 May 2026', center: 'Ayurcare Center', doctor: 'Dr. Arjun Das', reason: 'Panchakarma session 2' },
    ],
    bills: [
      { id: 'INV-90230', date: '30 May 2026', service: 'Ayurcare Package', amount: 8900, status: 'Pending' },
    ],
  },
]

export function generateMR(center: 'nutrition' | 'ayurcare', patients: ExistingPatient[]): string {
  const prefix = center === 'nutrition' ? 'NU' : 'AY'
  const maxNum = patients
    .filter((p) => p.mr.startsWith(prefix))
    .reduce((max, p) => {
      const num = parseInt(p.mr.replace(prefix, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`
}

export const centersByPrefix: Record<string, string> = {
  NU: 'Nutrition Center',
  AY: 'Ayurcare Center',
}

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
export const genders = ['Male', 'Female', 'Other']
export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
export const relationships = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other']
export const indianStates = [
  'Andhra Pradesh', 'Delhi', 'Goa', 'Gujarat', 'Karnataka', 'Kerala',
  'Maharashtra', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
]
export const dietPatterns = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']
export const exerciseLevels = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active']
export const frequencyOptions = ['Never', 'Occasional', 'Regular', 'Former']

export type Doctor = { id: string; name: string; qualification: string }

export const doctorsByCenter: Record<ConsultationCenter, Doctor[]> = {
  nutrition: [
    { id: 'doc-nu-1', name: 'Dr. Anjali Menon', qualification: 'Chief Dietitian, M.Sc Clinical Nutrition' },
    { id: 'doc-nu-2', name: 'Dr. Rahul Varma', qualification: 'Nutrition Physician, MD' },
    { id: 'doc-nu-3', name: 'Dr. Priya Nair', qualification: 'Sports Nutritionist, M.Sc' },
    { id: 'doc-nu-4', name: 'Dr. Sandeep Kumar', qualification: 'Bariatric Consultant, MD' },
  ],
  ayurcare: [
    { id: 'doc-ay-1', name: 'Dr. Krishnan Namboothiri', qualification: 'Chief Physician, BAMS, MD (Ayu)' },
    { id: 'doc-ay-2', name: 'Dr. Lakshmi Warrier', qualification: 'Panchakarma Specialist, BAMS' },
    { id: 'doc-ay-3', name: 'Dr. Arun Pillai', qualification: 'Ayurvedic Consultant, BAMS, MD' },
    { id: 'doc-ay-4', name: 'Dr. Meera Thampi', qualification: 'Ayurvedic Physician, BAMS' },
  ],
}

export function doctorsFor(center: ConsultationCenter | null): Doctor[] {
  if (!center) return [...doctorsByCenter.nutrition, ...doctorsByCenter.ayurcare].slice(0, 4)
  return doctorsByCenter[center] ?? []
}
