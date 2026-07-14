'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Check, UserPlus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { centerOptions, type ConsultationCenter } from '@/lib/registration-data'
import { mapApiPatient, readApiError, type ApiPatient, type PatientRecord } from '@/lib/patient-api'

type FormValues = Record<string, string>

const emptyForm: FormValues = {
  firstName: '', lastName: '', dob: '', gender: '', bloodGroup: '', mobile: '', email: '', parentName: '',
  address: '', city: '', state: '', postalCode: '', allergies: '', conditions: '', medications: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '', smoking: 'Never', alcohol: 'Never', exercise: 'Moderate', diet: 'Vegetarian',
  doctor: '',
}

type Doctor = { id: string; name: string; qualification: string }

const doctorsByCenter: Record<ConsultationCenter, Doctor[]> = {
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

function doctorsFor(center: ConsultationCenter | null): Doctor[] {
  if (!center) return [...doctorsByCenter.nutrition, ...doctorsByCenter.ayurcare].slice(0, 4)
  return doctorsByCenter[center] ?? []
}

function prefillForm(patient: PatientRecord): FormValues {
  const [firstName, ...rest] = patient.name.split(' ')
  return {
    ...emptyForm,
    firstName: firstName ?? '',
    lastName: rest.join(' '),
    parentName: patient.parentName ?? '',
    gender: patient.gender && patient.gender !== 'Not specified' ? patient.gender : '',
    bloodGroup: patient.bloodGroup && patient.bloodGroup !== 'Not recorded' ? patient.bloodGroup : '',
    mobile: patient.mobile && patient.mobile !== 'Not recorded' ? patient.mobile : '',
    email: patient.email ?? '',
    address: patient.address ?? '',
    city: patient.city ?? '',
    state: patient.state ?? '',
    postalCode: patient.postalCode ?? '',
    allergies: patient.allergies ?? '',
    conditions: patient.conditions ?? '',
    medications: patient.medications ?? '',
    emergencyName: patient.emergencyName ?? '',
    emergencyPhone: patient.emergencyPhone ?? '',
    emergencyRelation: patient.emergencyRelation ?? '',
    smoking: patient.smoking ?? 'Never',
    alcohol: patient.alcohol ?? 'Never',
    exercise: patient.exercise ?? 'Moderate',
    diet: patient.diet ?? 'Vegetarian',
    doctor: patient.apiVisits?.[0]?.doctor ?? patient.apiPrescriptions?.[0]?.opSheet?.visit?.doctor ?? '',
  }
}

function Field({ label, value, onChange, type = 'text', placeholder, error, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string; inputMode?: string }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><Input value={value} type={type} inputMode={inputMode as any} aria-invalid={!!error} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Card className="rounded-lg shadow-sm"><CardHeader className="border-b pb-4"><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</CardHeader><CardContent className="pt-5">{children}</CardContent></Card>
}

type PatientProfileEditorProps = {
  patient: PatientRecord
  center: string
  onCancel: () => void
  onSaved: (updated: PatientRecord) => void
}

export function PatientProfileEditor({ patient, center, onCancel, onSaved }: PatientProfileEditorProps) {
  const [form, setForm] = useState<FormValues>(() => prefillForm(patient))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const doctorOptions = doctorsFor(center.toLowerCase().includes('ayurcare') ? 'ayurcare' : 'nutrition')
  const update = (key: string) => (value: string) => {
    const cleaned = ['mobile', 'postalCode', 'emergencyPhone'].includes(key) ? value.replace(/\D/g, '').slice(0, key === 'postalCode' ? 6 : 10) : value
    setForm((state) => ({ ...state, [key]: cleaned }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = 'Patient name is required.'
    if (!form.parentName.trim()) next.parentName = 'Parent, father, husband, or mother name is required.'
    if (!form.gender) next.gender = 'Gender is required.'
    if (!/^\d{10}$/.test(form.mobile)) next.mobile = 'Enter exactly 10 numeric digits.'
    if (!form.address.trim()) next.address = 'Address is required.'
    if (!form.city.trim()) next.city = 'District is required.'
    if (!form.state.trim()) next.state = 'State is required.'
    if (!/^\d{6}$/.test(form.postalCode)) next.postalCode = 'Enter a valid 6 digit PIN code.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaveError('')
    setSaving(true)
    try {
      const [firstName, ...rest] = form.firstName.split(' ')
      const lastName = rest.join(' ')
      const response = await fetch(`/api/patients/${encodeURIComponent(patient.mr)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: `${firstName} ${lastName}`.trim(),
          parentName: form.parentName,
          gender: form.gender,
          mobileNumber: form.mobile,
          address: form.address,
          district: form.city,
          state: form.state,
          pinCode: form.postalCode,
          dob: form.dob || undefined,
          age: form.dob ? computeAge(form.dob) : undefined,
          bloodGroup: form.bloodGroup || undefined,
          doctor: form.doctor || undefined,
        }),
      })
      if (!response.ok) {
        const msg = await readApiError(response)
        setSaveError(msg)
        setSaving(false)
        return
      }
      const body = await response.json() as { patient: ApiPatient }
      const updated = mapApiPatient(body.patient)
      setSaved(true)
      onSaved(updated)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save changes')
      setSaving(false)
    }
  }

  useEffect(() => {
    setForm(prefillForm(patient))
  }, [patient.mr])

  const select = (label: string, key: string, values: string[]) => <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><select value={form[key]} onChange={(e) => update(key)(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select</option>{values.map((v) => <option key={v}>{v}</option>)}</select></div>

  return <div className="mx-auto max-w-[1200px] pb-24">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">Edit Patient Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update patient details for {patient.name} · MR: {patient.mr}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="mr-2 size-4"/>Cancel</Button>
    </div>
    {saveError && <p className="mb-4 text-sm text-destructive">{saveError}</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      <Section title="Consulting Doctor" description="Choose from the doctors available for this department">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Consulting doctor</Label>
          <select value={form.doctor} onChange={(e) => update('doctor')(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
            <option value="">Select a doctor</option>
            {doctorOptions.map((doc) => <option key={doc.id} value={doc.name}>{doc.name} - {doc.qualification}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Showing {doctorOptions.length} doctors for {center}.</p>
        </div>
      </Section>
      <Section title="Personal Information" description="Fields marked * are required">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name *" value={form.firstName} onChange={update('firstName')} error={errors.firstName} />
          <Field label="Last name" value={form.lastName} onChange={update('lastName')} />
          <Field label="Date of birth" value={form.dob} type="date" onChange={update('dob')} />
          {select('Gender *', 'gender', ['Male', 'Female', 'Other'])}
          {errors.gender && <p className="-mt-2 text-xs text-destructive">{errors.gender}</p>}
          {select('Blood group', 'bloodGroup', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])}
          <Field label="Parent / spouse name *" value={form.parentName} onChange={update('parentName')} error={errors.parentName} />
        </div>
      </Section>
      <Section title="Contact Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number *" value={form.mobile} onChange={update('mobile')} inputMode="numeric" error={errors.mobile} placeholder="10 digit mobile number" />
          <Field label="Email address" value={form.email} onChange={update('email')} type="email" />
        </div>
      </Section>
      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Street address *" value={form.address} onChange={update('address')} error={errors.address} />
          </div>
          <Field label="District *" value={form.city} onChange={update('city')} error={errors.city} />
          <Field label="State *" value={form.state} onChange={update('state')} error={errors.state} />
          <Field label="PIN code *" value={form.postalCode} onChange={update('postalCode')} inputMode="numeric" error={errors.postalCode} />
        </div>
      </Section>
      <Section title="Emergency Contact">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact name" value={form.emergencyName} onChange={update('emergencyName')} />
          <Field label="Phone number" value={form.emergencyPhone} onChange={update('emergencyPhone')} inputMode="numeric" />
          <Field label="Relationship" value={form.emergencyRelation} onChange={update('emergencyRelation')} />
        </div>
      </Section>
      <Section title="Medical History" description="Document known conditions before consultation">
        <div className="grid gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Allergies</Label>
            <Textarea className="mt-1.5 min-h-18" value={form.allergies} onChange={(e) => update('allergies')(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Existing conditions</Label>
            <Textarea className="mt-1.5 min-h-18" value={form.conditions} onChange={(e) => update('conditions')(e.target.value)} />
          </div>
          <Field label="Current medications" value={form.medications} onChange={update('medications')} />
        </div>
      </Section>
      <Section title="Lifestyle">
        <div className="grid gap-4 sm:grid-cols-2">
          {select('Smoking', 'smoking', ['Never', 'Occasional', 'Regular', 'Former'])}
          {select('Alcohol', 'alcohol', ['Never', 'Occasional', 'Regular', 'Former'])}
          {select('Exercise', 'exercise', ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'])}
          {select('Diet pattern', 'diet', ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain'])}
        </div>
      </Section>
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:left-64">
      <div className="mx-auto flex max-w-[1200px] justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}><X className="mr-2 size-4"/>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || saved}>
          {saved ? <><Check className="mr-2 size-4"/>Saved</> : <><UserPlus className="mr-2 size-4"/>Save changes</>}
        </Button>
      </div>
    </div>
  </div>
}

function computeAge(dob: string): number {
  if (!dob) return 0
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 ? age : 0
}
