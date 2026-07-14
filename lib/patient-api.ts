import { type ExistingPatient } from '@/lib/registration-data'

export type ApiVisit = {
  id: string
  doctor?: string | null
  status?: string | null
  createdAt?: string
  appointmentDate?: string | null
}

export type ApiOPSheet = {
  id: string
  visitId: string
  clinicalExamination?: string | null
  vitals?: string | null
  diagnosis?: string | null
  symptoms?: string | null
  status?: string | null
  createdAt?: string
  visit?: ApiVisit
  prescription?: ApiPrescription | null
}

export type ApiPrescription = {
  id: string
  patientMr: string
  opSheetId: string
  diagnosis?: string | null
  medicines?: string | null
  advice?: string | null
  followUp?: string | null
  createdAt?: string
  opSheet?: ApiOPSheet
}

export type ApiDocument = {
  id: string
  title?: string | null
  category?: string | null
  fileName: string
  filePath: string
  fileType?: string | null
  uploadedBy?: string | null
  remarks?: string | null
  uploadedAt?: string
}

export type ApiPatient = {
  mr: string
  consultationType: string
  patientName: string
  parentName: string
  gender: ExistingPatient['gender']
  mobileNumber: string
  address: string
  district: string
  state: string
  pinCode: string
  dob?: string | null
  age?: number | null
  bloodGroup?: string | null
  status?: string | null
  createdAt?: string
  visits?: ApiVisit[]
  opSheets?: ApiOPSheet[]
  prescriptions?: ApiPrescription[]
  documents?: ApiDocument[]
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  allergies?: string | null
  conditions?: string | null
  medications?: string | null
  smoking?: string | null
  alcohol?: string | null
  exercise?: string | null
  diet?: string | null
}

export type PatientRecord = ExistingPatient & {
  consultationType?: string
  address?: string
  state?: string
  postalCode?: string
  apiVisits?: ApiVisit[]
  apiOPSheets?: ApiOPSheet[]
  apiPrescriptions?: ApiPrescription[]
  apiDocuments?: ApiDocument[]
}

export function centerNameFromConsultationType(type?: string | null) {
  return type === 'AYURCARE' ? 'Ayurcare Center' : 'Nutrition Center'
}

export function consultationTypeFromCenter(center: 'nutrition' | 'ayurcare' | null) {
  return center === 'ayurcare' ? 'AYURCARE' : 'NUTRITION'
}

export function centerNameFromMr(mr?: string) {
  return mr?.startsWith('AY') ? 'Ayurcare Center' : 'Nutrition Center'
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export function mapApiPatient(patient: ApiPatient): PatientRecord {
  const center = centerNameFromConsultationType(patient.consultationType)
  const visits = (patient.visits ?? []).map((visit) => ({
    id: visit.id,
    date: formatDateTime(visit.createdAt || visit.appointmentDate) || 'Not recorded',
    center,
    doctor: visit.doctor || 'Not yet assigned',
    reason: visit.status || 'Visit',
  }))

  return {
    mr: patient.mr,
    name: patient.patientName,
    parentName: patient.parentName,
    mobile: patient.mobileNumber,
    age: patient.age ?? 0,
    gender: patient.gender || 'Not specified',
    bloodGroup: patient.bloodGroup || 'Not recorded',
    city: patient.district || '',
    lastVisit: visits[0]?.date || formatDate(patient.createdAt) || 'First visit',
    tags: patient.status ? [patient.status] : [],
    visits,
    bills: [],
    dob: patient.dob ?? undefined,
    address: patient.address,
    state: patient.state,
    postalCode: patient.pinCode,
    consultationType: patient.consultationType,
    apiVisits: patient.visits ?? [],
    apiOPSheets: patient.opSheets ?? [],
    apiPrescriptions: patient.prescriptions ?? [],
    apiDocuments: patient.documents ?? [],
    allergies: patient.allergies ?? undefined,
    conditions: patient.conditions ?? undefined,
    medications: patient.medications ?? undefined,
    emergencyName: patient.emergencyContactName ?? undefined,
    emergencyPhone: patient.emergencyContactPhone ?? undefined,
    emergencyRelation: patient.emergencyContactRelation ?? undefined,
    smoking: patient.smoking ?? undefined,
    alcohol: patient.alcohol ?? undefined,
    exercise: patient.exercise ?? undefined,
    diet: patient.diet ?? undefined,
  }
}

export async function readApiError(response: Response) {
  try {
    const body = await response.json()
    return typeof body?.error === 'string' ? body.error : 'Request failed'
  } catch {
    return 'Request failed'
  }
}
