'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, ChevronRight, HeartPulse, Plus, Search, UserPlus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { centerOptions, searchFields, type ConsultationCenter, doctorsFor } from '@/lib/registration-data'
import { consultationTypeFromCenter, mapApiPatient, readApiError, type ApiPatient, type PatientRecord } from '@/lib/patient-api'

type Screen = 'choose' | 'search' | 'form'
type FormValues = Record<string, string>

const emptyForm: FormValues = {
  firstName: '', lastName: '', dob: '', gender: '', bloodGroup: '', mobile: '', email: '', parentName: '',
  address: '', city: '', state: '', postalCode: '', allergies: '', conditions: '', medications: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '', smoking: 'Never', alcohol: 'Never', exercise: 'Moderate', diet: 'Vegetarian',
  doctor: '',
}

/* ------------------------------------------------------------------ */
/*  Helpers: age calculation, MR generation, form <-> patient mapping   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers: age calculation, MR generation, form <-> patient mapping   */
/* ------------------------------------------------------------------ */

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
  }
}

function Field({ label, value, onChange, type = 'text', placeholder, error, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><Input value={value} type={type} inputMode={inputMode} aria-invalid={!!error} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Card className="rounded-lg shadow-sm"><CardHeader className="border-b pb-4"><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</CardHeader><CardContent className="pt-5">{children}</CardContent></Card>
}

export function PatientWorkspace() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('search')
  const [center, setCenter] = useState<ConsultationCenter | null>(null)
  const [searchField, setSearchField] = useState('mr')
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [selected, setSelected] = useState<PatientRecord | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [saved, setSaved] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (screen !== 'search') return
    let cancelled = false
    setLoadingPatients(true)
    setApiError('')
    fetch('/api/patients?limit=100')
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response))
        return response.json() as Promise<{ patients: ApiPatient[] }>
      })
      .then((body) => {
        if (!cancelled) setPatients((body.patients ?? []).map(mapApiPatient))
      })
      .catch((error) => {
        if (!cancelled) setApiError(error instanceof Error ? error.message : 'Failed to load patients')
      })
      .finally(() => {
        if (!cancelled) setLoadingPatients(false)
      })
    return () => { cancelled = true }
  }, [screen])

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().replace(/\s/g, '')
    return patients.filter((p) => ({ mr: p.mr, mobile: p.mobile, name: p.name, parent: p.parentName }[searchField] || '').toLowerCase().replace(/\s/g, '').includes(q))
  }, [patients, query, searchField])
  const set = (key: string) => (value: string) => setForm((state) => ({ ...state, [key]: value }))
  const activeCenter = centerOptions.find((item) => item.id === center)
  const centerName = activeCenter?.name ?? 'Nutrition Center'
  const goBack = () => { if (screen === 'choose') { setSelected(null); setQuery(''); setSaved(false); setApiError(''); setScreen('search') } else if (screen === 'form') { setSaved(false); setApiError(''); setScreen('choose') } }

  const handleRegistrationSave = (patient: PatientRecord) => {
    setSaved(true)
    router.push(`/patients/${encodeURIComponent(patient.mr)}?new=1`)
  }

  const startNewRegistration = () => { setSelected(null); setForm(emptyForm); setSaved(false); setApiError(''); setScreen('choose') }

  const startFollowUpVisit = () => {
    if (selected) setForm(prefillForm(selected))
    setSaved(false)
    setApiError('')
    setScreen('form')
  }

  return <div className="mx-auto max-w-[1500px] pb-24">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span>Patient Care</span><ChevronRight className="size-3"/><span className="text-foreground">Registration</span></div><h1 className="font-display text-2xl font-semibold">Patient Registration</h1><p className="mt-1 text-sm text-muted-foreground">Create an outpatient visit or continue care for an existing patient.</p></div>
      {screen !== 'search' && <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft className="mr-2 size-4"/>Back</Button>}
    </div>
    <div className="mb-7 flex items-center gap-2"><Step active={screen === 'search'} complete={screen !== 'search'} n="1" label="Patient lookup"/><div className="h-px flex-1 bg-border"/><Step active={screen === 'choose'} complete={!!center && screen !== 'choose'} n="2" label="Consultation"/><div className="h-px flex-1 bg-border"/><Step active={screen === 'form'} n="3" label="Registration"/></div>
    {screen === 'choose' && <div className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">{centerOptions.map((option) => { const Icon = option.icon; return <button key={option.id} type="button" onClick={() => { setCenter(option.id); setScreen('form') }} className="group rounded-lg border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"><div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5"/></div><h2 className="font-display text-lg font-semibold">{option.name}</h2><p className="mt-1 text-sm font-medium text-primary">{option.tagline}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{option.description}</p><div className="mt-5 flex flex-wrap gap-2">{option.services.map((service) => <span key={service} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{service}</span>)}</div><div className="mt-6 flex items-center text-sm font-semibold text-primary">Select center <ChevronRight className="ml-1 size-4 transition-transform group-hover:translate-x-1"/></div></button> })}</div>}
    {screen === 'search' && <SearchPanel center={centerName} searchField={searchField} setSearchField={setSearchField} query={query} setQuery={setQuery} matches={matches} loading={loadingPatients} error={apiError} onSelect={(patient) => { setSelected(patient); setScreen('choose') }} onNew={startNewRegistration} />}
    {screen === 'form' && <RegistrationForm form={form} set={set} center={center} centerName={centerName} existingPatient={selected} saved={saved} onCancel={() => setScreen('choose')} onSave={handleRegistrationSave} onError={setApiError} />}
    {apiError && screen === 'form' && <p className="mt-4 text-sm text-destructive">{apiError}</p>}
  </div>
}

function Step({ n, label, active, complete }: { n: string; label: string; active?: boolean; complete?: boolean }) { return <div className="flex items-center gap-2"><span className={cn('flex size-6 items-center justify-center rounded-full text-xs font-semibold', active ? 'bg-primary text-primary-foreground' : complete ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{complete ? <Check className="size-3.5"/> : n}</span><span className={cn('hidden text-xs font-medium sm:block', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span></div> }

function SearchPanel({ center, searchField, setSearchField, query, setQuery, matches, loading, error, onSelect, onNew }: { center: string; searchField: string; setSearchField: (s: string) => void; query: string; setQuery: (s: string) => void; matches: PatientRecord[]; loading: boolean; error: string; onSelect: (p: PatientRecord) => void; onNew: () => void }) {
  return <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_.7fr]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Find patient</CardTitle><CardDescription>Search the patient registry before creating a new medical record.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{searchFields.map((field) => <button key={field.id} onClick={() => { setSearchField(field.id); setQuery('') }} className={cn('rounded-md border px-3 py-1.5 text-xs font-medium', searchField === field.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>{field.label}</button>)}</div><div className="relative mt-5"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="h-9 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchFields.find((item) => item.id === searchField)?.placeholder}/></div>{loading && <p className="mt-3 text-sm text-muted-foreground">Loading patients...</p>}{error && <p className="mt-3 text-sm text-destructive">{error}</p>}{query && <div className="mt-4 overflow-hidden rounded-lg border">{matches.length ? matches.map((patient) => <button className="flex w-full items-center justify-between border-b p-4 text-left last:border-0 hover:bg-muted/60" key={patient.mr} onClick={() => onSelect(patient)}><div><p className="font-medium">{patient.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{patient.mr}</span></p><p className="mt-1 text-xs text-muted-foreground">{patient.age} years, {patient.gender} · {patient.mobile} · {patient.city}</p></div><ChevronRight className="size-4 text-muted-foreground"/></button>) : <div className="p-8 text-center"><p className="font-medium">No patient found</p><p className="mt-1 text-sm text-muted-foreground">Create a new medical record for this patient.</p><Button className="mt-4" size="sm" onClick={onNew}><UserPlus className="mr-2 size-4"/>New registration</Button></div>}</div>}</CardContent></Card><Card className="rounded-lg bg-primary text-primary-foreground"><CardContent className="p-6"><HeartPulse className="size-6 opacity-80"/><p className="mt-8 text-xs font-semibold uppercase tracking-wider opacity-70">Selected department</p><h2 className="mt-2 font-display text-xl font-semibold">{center}</h2><p className="mt-3 text-sm leading-6 opacity-80">A unique MR number is issued automatically after a successful registration.</p><Button className="mt-6 bg-white text-primary hover:bg-white/90" size="sm" onClick={onNew}><Plus className="mr-2 size-4"/>Register new patient</Button></CardContent></Card></div>
}

function RegistrationForm({ form, set, center, centerName, existingPatient, saved, onCancel, onSave, onError }: { form: FormValues; set: (k: string) => (v: string) => void; center: ConsultationCenter | null; centerName: string; existingPatient: PatientRecord | null; saved: boolean; onCancel: () => void; onSave: (patient: PatientRecord) => void; onError: (message: string) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const doctorOptions = doctorsFor(center)
  const update = (key: string) => (value: string) => { const cleaned = ['mobile', 'postalCode', 'emergencyPhone'].includes(key) ? value.replace(/\D/g, '').slice(0, key === 'postalCode' ? 6 : 10) : value; set(key)(cleaned); setErrors((current) => ({ ...current, [key]: '' })) }
  const validate = () => { const next: Record<string, string> = {}; if (!form.firstName.trim()) next.firstName = 'Patient name is required.'; if (!form.parentName.trim()) next.parentName = 'Parent, father, husband, or mother name is required.'; if (!form.gender) next.gender = 'Gender is required.'; if (!/^\d{10}$/.test(form.mobile)) next.mobile = 'Enter exactly 10 numeric digits.'; if (!form.address.trim()) next.address = 'Address is required.'; if (!form.city.trim()) next.city = 'District is required.'; if (!form.state.trim()) next.state = 'State is required.'; if (!/^\d{6}$/.test(form.postalCode)) next.postalCode = 'Enter a valid 6 digit PIN code.'; if (!form.doctor) next.doctor = 'Please select a consulting doctor.'; setErrors(next); return Object.keys(next).length === 0 }
  const handleSave = async () => {
    if (!validate()) return
    onError('')
    try {
      if (existingPatient) {
        const response = await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientMr: existingPatient.mr, doctor: form.doctor, center: centerName }) })
        if (!response.ok) throw new Error(await readApiError(response))
        onSave(existingPatient)
        return
      }
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationType: consultationTypeFromCenter(center),
          patientName: `${form.firstName} ${form.lastName}`.trim(),
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
          doctor: form.doctor,
          emergencyName: form.emergencyName || undefined,
          emergencyPhone: form.emergencyPhone || undefined,
          emergencyRelation: form.emergencyRelation || undefined,
          allergies: form.allergies || undefined,
          conditions: form.conditions || undefined,
          medications: form.medications || undefined,
          smoking: form.smoking || undefined,
          alcohol: form.alcohol || undefined,
          exercise: form.exercise || undefined,
          diet: form.diet || undefined,
        }),
      })
      if (!response.ok) throw new Error(await readApiError(response))
      const body = await response.json() as { patient: ApiPatient }
      onSave(mapApiPatient(body.patient))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to save registration')
    }
  }
  const select = (label: string, key: string, values: string[]) => <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><select value={form[key]} onChange={(e) => set(key)(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select</option>{values.map((v) => <option key={v}>{v}</option>)}</select></div>
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">{existingPatient ? <span><span className="font-semibold text-primary">New visit for {existingPatient.name}.</span> Saving creates a new backend visit.</span> : <span><span className="font-semibold text-primary">New patient record.</span> MR number is issued by the server after successful registration.</span>}<span className="rounded bg-background px-2 py-1 font-mono text-xs text-primary">MR: {existingPatient?.mr ?? 'Generated on save'}</span></div><div className="grid gap-5 xl:grid-cols-2"><Section title="Consulting Doctor" description="Choose from the doctors available for this department"><div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Consulting doctor *</Label><select value={form.doctor} onChange={(e) => update('doctor')(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select a doctor</option>{doctorOptions.map((doc) => <option key={doc.id} value={doc.name}>{doc.name} - {doc.qualification}</option>)}</select>{errors.doctor && <p className="text-xs text-destructive">{errors.doctor}</p>}<p className="text-xs text-muted-foreground">Showing {doctorOptions.length} doctors for {centerName}.</p></div></Section><Section title="Personal Information" description="Fields marked * are required"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name *" value={form.firstName} onChange={update('firstName')} error={errors.firstName}/><Field label="Last name" value={form.lastName} onChange={update('lastName')} /><Field label="Date of birth" value={form.dob} type="date" onChange={update('dob')} />{select('Gender *', 'gender', ['Male','Female','Other'])}{errors.gender && <p className="-mt-2 text-xs text-destructive">{errors.gender}</p>}{select('Blood group', 'bloodGroup', ['A+','A-','B+','B-','O+','O-','AB+','AB-'])}<Field label="Parent / spouse name *" value={form.parentName} onChange={update('parentName')} error={errors.parentName}/></div></Section><Section title="Contact Information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Mobile number *" value={form.mobile} onChange={update('mobile')} inputMode="numeric" error={errors.mobile} placeholder="10 digit mobile number"/><Field label="Email address" value={form.email} onChange={update('email')} type="email"/></div></Section><Section title="Address"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Street address *" value={form.address} onChange={update('address')} error={errors.address}/></div><Field label="District *" value={form.city} onChange={update('city')} error={errors.city}/><Field label="State *" value={form.state} onChange={update('state')} error={errors.state}/><Field label="PIN code *" value={form.postalCode} onChange={update('postalCode')} inputMode="numeric" error={errors.postalCode}/></div></Section><Section title="Emergency Contact"><div className="grid gap-4 sm:grid-cols-3"><Field label="Contact name" value={form.emergencyName} onChange={update('emergencyName')} /><Field label="Phone number" value={form.emergencyPhone} onChange={update('emergencyPhone')} inputMode="numeric"/><Field label="Relationship" value={form.emergencyRelation} onChange={update('emergencyRelation')} /></div></Section><Section title="Medical History" description="Document known conditions before consultation"><div className="grid gap-4"><div><Label className="text-xs text-muted-foreground">Allergies</Label><Textarea className="mt-1.5 min-h-18" value={form.allergies} onChange={(e) => update('allergies')(e.target.value)} /></div><div><Label className="text-xs text-muted-foreground">Existing conditions</Label><Textarea className="mt-1.5 min-h-18" value={form.conditions} onChange={(e) => update('conditions')(e.target.value)} /></div><Field label="Current medications" value={form.medications} onChange={update('medications')} /></div></Section><Section title="Lifestyle"><div className="grid gap-4 sm:grid-cols-2">{select('Smoking', 'smoking', ['Never','Occasional','Regular','Former'])}{select('Alcohol', 'alcohol', ['Never','Occasional','Regular','Former'])}{select('Exercise', 'exercise', ['Sedentary','Light','Moderate','Active','Very Active'])}{select('Diet pattern', 'diet', ['Vegetarian','Non-Vegetarian','Eggetarian','Vegan','Jain'])}</div></Section></div><div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:left-64"><div className="mx-auto flex max-w-[1500px] justify-end gap-2"><Button variant="outline" onClick={onCancel}><X className="mr-2 size-4"/>Cancel</Button><Button disabled={saved} onClick={handleSave}>{saved ? <Check className="mr-2 size-4"/> : <UserPlus className="mr-2 size-4"/>}{saved ? 'Registration created' : existingPatient ? 'Save visit' : 'Save & create visit'}</Button></div></div></>
}