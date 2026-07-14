'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, Download, FileText, HeartPulse,
  IndianRupee, Pencil, Plus, Printer, Search, Trash2, Upload, UserPlus, X, Eye, Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { centerOptions, existingPatients, searchFields, type ConsultationCenter, type ExistingPatient } from '@/lib/registration-data'

type Screen = 'choose' | 'search' | 'form' | 'profile'
type FormValues = Record<string, string>

const emptyForm: FormValues = {
  firstName: '', lastName: '', dob: '', gender: '', bloodGroup: '', mobile: '', email: '', parentName: '',
  address: '', city: '', state: '', postalCode: '', allergies: '', conditions: '', medications: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '', smoking: 'Never', alcohol: 'Never', exercise: 'Moderate', diet: 'Vegetarian',
  doctor: '',
}
const measurements = ['Weight (kg)', 'Height (cm)', 'BMI', 'Body Fat (%)', 'Lean Mass (kg)', 'Waist (cm)', 'Hip (cm)', 'WHR', 'Muscle Mass (kg)', 'Water (%)', 'BMR (kcal)', 'Metabolic Age']
const measurementColumns = ['Baseline', '1 Month', '2 Months', '3 Months', 'Change']

/* ------------------------------------------------------------------ */
/*  Doctor directory — sample doctors per department (Requirement 1)   */
/* ------------------------------------------------------------------ */

type Doctor = { id: string; name: string; qualification: string }

// Four sample doctors are shown per department. The list swaps
// automatically based on the department selected in step 1.
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

function nextMrNumber(center: ConsultationCenter | null): string {
  const prefix = center === 'ayurcare' ? 'AY' : 'NU'
  const count = existingPatients.filter((p) => p.mr.startsWith(prefix)).length + 1
  return `${prefix}${String(count).padStart(6, '0')}`
}

// Builds (or updates) a full patient record from the registration form.
// When `existing` is supplied — e.g. registering a follow-up visit for a
// patient found via search — prior visits and bills are preserved and a
// new visit entry is appended rather than the record being overwritten.
function buildPatientFromForm(form: FormValues, mrNumber: string, centerName: string, existing?: ExistingPatient | null): ExistingPatient {
  const name = `${form.firstName} ${form.lastName}`.trim() || existing?.name || 'New Patient'
  const now = new Date()
  const today = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const visitEntry = {
    id: `V-${Date.now().toString(36).toUpperCase()}`,
    date: `${today}, ${time}`,
    center: centerName,
    doctor: form.doctor || 'Not yet assigned',
    reason: existing ? 'Follow-up visit' : 'New patient registration',
    status: 'Active',
  }
  return {
    mr: existing?.mr ?? mrNumber,
    name,
    age: form.dob ? computeAge(form.dob) : existing?.age ?? 0,
    gender: form.gender || existing?.gender || 'Not specified',
    bloodGroup: form.bloodGroup || existing?.bloodGroup || 'Not recorded',
    mobile: form.mobile || existing?.mobile || 'Not recorded',
    city: form.city || existing?.city || '',
    lastVisit: today,
    visits: [...(existing?.visits ?? []), visitEntry],
    bills: existing?.bills ?? [],
  } as ExistingPatient
}

// Pre-fills the registration form from an existing patient record, e.g.
// when creating a follow-up visit or editing a patient's details.
function prefillForm(patient: ExistingPatient): FormValues {
  const [firstName, ...rest] = patient.name.split(' ')
  return {
    ...emptyForm,
    firstName: firstName ?? '',
    lastName: rest.join(' '),
    gender: patient.gender && patient.gender !== 'Not specified' ? patient.gender : '',
    bloodGroup: patient.bloodGroup && patient.bloodGroup !== 'Not recorded' ? patient.bloodGroup : '',
    mobile: patient.mobile && patient.mobile !== 'Not recorded' ? patient.mobile : '',
    city: patient.city ?? '',
  }
}

function Field({ label, value, onChange, type = 'text', placeholder, error, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><Input value={value} type={type} inputMode={inputMode} aria-invalid={!!error} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Card className="rounded-lg shadow-sm"><CardHeader className="border-b pb-4"><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</CardHeader><CardContent className="pt-5">{children}</CardContent></Card>
}

export function PatientWorkspace() {
  const [screen, setScreen] = useState<Screen>('choose')
  const [center, setCenter] = useState<ConsultationCenter | null>(null)
  const [searchField, setSearchField] = useState('mr')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ExistingPatient | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [saved, setSaved] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)
  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().replace(/\s/g, '')
    return existingPatients.filter((p) => ({ mr: p.mr, mobile: p.mobile, name: p.name, parent: p.parentName }[searchField] || '').toLowerCase().replace(/\s/g, '').includes(q))
  }, [query, searchField])
  const set = (key: string) => (value: string) => setForm((state) => ({ ...state, [key]: value }))
  const activeCenter = centerOptions.find((item) => item.id === center)
  const centerName = activeCenter?.name ?? 'Nutrition Center'
  const goBack = () => { setSelected(null); setQuery(''); setSaved(false); setJustRegistered(false); setScreen(screen === 'search' ? 'choose' : 'search') }

  const handleRegistrationSave = (patient: ExistingPatient) => {
    setSelected(patient)
    setJustRegistered(true)
    setSaved(true)
    setTimeout(() => setScreen('profile'), 600)
  }

  const startNewRegistration = () => { setSelected(null); setForm(emptyForm); setSaved(false); setJustRegistered(false); setScreen('form') }

  const startFollowUpVisit = () => {
    if (selected) setForm(prefillForm(selected))
    setSaved(false)
    setJustRegistered(false)
    setScreen('form')
  }

  return <div className="mx-auto max-w-[1500px] pb-24">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span>Patient Care</span><ChevronRight className="size-3"/><span className="text-foreground">Registration</span></div><h1 className="font-display text-2xl font-semibold">Patient Registration</h1><p className="mt-1 text-sm text-muted-foreground">Create an outpatient visit or continue care for an existing patient.</p></div>
      {screen !== 'choose' && <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft className="mr-2 size-4"/>Back</Button>}
    </div>
    <div className="mb-7 flex items-center gap-2"><Step active={screen === 'choose'} complete={!!center && screen !== 'choose'} n="1" label="Consultation"/><div className="h-px flex-1 bg-border"/><Step active={screen === 'search'} complete={['form','profile'].includes(screen)} n="2" label="Patient lookup"/><div className="h-px flex-1 bg-border"/><Step active={['form','profile'].includes(screen)} n="3" label="Registration"/></div>
    {screen === 'choose' && <div className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">{centerOptions.map((option) => { const Icon = option.icon; return <button key={option.id} type="button" onClick={() => { setCenter(option.id); setScreen('search') }} className="group rounded-lg border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"><div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5"/></div><h2 className="font-display text-lg font-semibold">{option.name}</h2><p className="mt-1 text-sm font-medium text-primary">{option.tagline}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{option.description}</p><div className="mt-5 flex flex-wrap gap-2">{option.services.map((service) => <span key={service} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{service}</span>)}</div><div className="mt-6 flex items-center text-sm font-semibold text-primary">Select center <ChevronRight className="ml-1 size-4 transition-transform group-hover:translate-x-1"/></div></button> })}</div>}
    {screen === 'search' && <SearchPanel center={centerName} searchField={searchField} setSearchField={setSearchField} query={query} setQuery={setQuery} matches={matches} onSelect={(patient) => { setSelected(patient); setJustRegistered(false); setScreen('profile') }} onNew={startNewRegistration} />}
    {screen === 'form' && <RegistrationForm form={form} set={set} center={center} centerName={centerName} existingPatient={selected} saved={saved} onCancel={() => setScreen('search')} onSave={handleRegistrationSave} />}
    {screen === 'profile' && <PatientProfile patient={selected} center={centerName} centerId={center} justRegistered={justRegistered} onNewVisit={startFollowUpVisit} />}
  </div>
}

function Step({ n, label, active, complete }: { n: string; label: string; active?: boolean; complete?: boolean }) { return <div className="flex items-center gap-2"><span className={cn('flex size-6 items-center justify-center rounded-full text-xs font-semibold', active ? 'bg-primary text-primary-foreground' : complete ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{complete ? <Check className="size-3.5"/> : n}</span><span className={cn('hidden text-xs font-medium sm:block', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span></div> }

function SearchPanel({ center, searchField, setSearchField, query, setQuery, matches, onSelect, onNew }: { center: string; searchField: string; setSearchField: (s: string) => void; query: string; setQuery: (s: string) => void; matches: ExistingPatient[]; onSelect: (p: ExistingPatient) => void; onNew: () => void }) {
 return <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_.7fr]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Find patient</CardTitle><CardDescription>Search the patient registry before creating a new medical record.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{searchFields.map((field) => <button key={field.id} onClick={() => { setSearchField(field.id); setQuery('') }} className={cn('rounded-md border px-3 py-1.5 text-xs font-medium', searchField === field.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>{field.label}</button>)}</div><div className="relative mt-5"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="h-9 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchFields.find((item) => item.id === searchField)?.placeholder}/></div>{query && <div className="mt-4 overflow-hidden rounded-lg border">{matches.length ? matches.map((patient) => <button className="flex w-full items-center justify-between border-b p-4 text-left last:border-0 hover:bg-muted/60" key={patient.mr} onClick={() => onSelect(patient)}><div><p className="font-medium">{patient.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{patient.mr}</span></p><p className="mt-1 text-xs text-muted-foreground">{patient.age} years, {patient.gender} · {patient.mobile} · {patient.city}</p></div><ChevronRight className="size-4 text-muted-foreground"/></button>) : <div className="p-8 text-center"><p className="font-medium">No patient found</p><p className="mt-1 text-sm text-muted-foreground">Create a new medical record for this patient.</p><Button className="mt-4" size="sm" onClick={onNew}><UserPlus className="mr-2 size-4"/>New registration</Button></div>}</div>}</CardContent></Card><Card className="rounded-lg bg-primary text-primary-foreground"><CardContent className="p-6"><HeartPulse className="size-6 opacity-80"/><p className="mt-8 text-xs font-semibold uppercase tracking-wider opacity-70">Selected department</p><h2 className="mt-2 font-display text-xl font-semibold">{center}</h2><p className="mt-3 text-sm leading-6 opacity-80">A unique MR number is issued automatically after a successful registration.</p><Button className="mt-6 bg-white text-primary hover:bg-white/90" size="sm" onClick={onNew}><Plus className="mr-2 size-4"/>Register new patient</Button></CardContent></Card></div>
}

function RegistrationForm({ form, set, center, centerName, existingPatient, saved, onCancel, onSave }: { form: FormValues; set: (k: string) => (v: string) => void; center: ConsultationCenter | null; centerName: string; existingPatient: ExistingPatient | null; saved: boolean; onCancel: () => void; onSave: (patient: ExistingPatient) => void }) {
 const [errors, setErrors] = useState<Record<string, string>>({})
 const mrPreview = existingPatient?.mr ?? nextMrNumber(center)
 const doctorOptions = doctorsFor(center)
 const update = (key: string) => (value: string) => { const cleaned = ['mobile', 'postalCode', 'emergencyPhone'].includes(key) ? value.replace(/\D/g, '').slice(0, key === 'postalCode' ? 6 : 10) : value; set(key)(cleaned); setErrors((current) => ({ ...current, [key]: '' })) }
 const validate = () => { const next: Record<string, string> = {}; if (!form.firstName.trim()) next.firstName = 'Patient name is required.'; if (!form.parentName.trim()) next.parentName = 'Parent, father, husband, or mother name is required.'; if (!form.gender) next.gender = 'Gender is required.'; if (!/^\d{10}$/.test(form.mobile)) next.mobile = 'Enter exactly 10 numeric digits.'; if (!form.address.trim()) next.address = 'Address is required.'; if (!form.city.trim()) next.city = 'District is required.'; if (!form.state.trim()) next.state = 'State is required.'; if (!/^\d{6}$/.test(form.postalCode)) next.postalCode = 'Enter a valid 6 digit PIN code.'; if (!form.doctor) next.doctor = 'Please select a consulting doctor.'; setErrors(next); return Object.keys(next).length === 0 }
 const handleSave = () => { if (!validate()) return; onSave(buildPatientFromForm(form, mrPreview, centerName, existingPatient)) }
 const select = (label: string, key: string, values: string[]) => <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><select value={form[key]} onChange={(e) => set(key)(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select</option>{values.map((v) => <option key={v}>{v}</option>)}</select></div>
 return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">{existingPatient ? <span><span className="font-semibold text-primary">New visit for {existingPatient.name}.</span> Saving appends this visit to their existing record.</span> : <span><span className="font-semibold text-primary">New patient record.</span> Saving creates the first visit automatically.</span>}<span className="rounded bg-background px-2 py-1 font-mono text-xs text-primary">MR {existingPatient ? 'number' : 'preview'}: {mrPreview}</span></div><div className="grid gap-5 xl:grid-cols-2"><Section title="Consulting Doctor" description="Choose from the doctors available for this department"><div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Consulting doctor *</Label><select value={form.doctor} onChange={(e) => update('doctor')(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select a doctor</option>{doctorOptions.map((doc) => <option key={doc.id} value={doc.name}>{doc.name} — {doc.qualification}</option>)}</select>{errors.doctor && <p className="text-xs text-destructive">{errors.doctor}</p>}<p className="text-xs text-muted-foreground">Showing {doctorOptions.length} doctors for {centerName}.</p></div></Section><Section title="Personal Information" description="Fields marked * are required"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name *" value={form.firstName} onChange={update('firstName')} error={errors.firstName}/><Field label="Last name" value={form.lastName} onChange={update('lastName')} /><Field label="Date of birth" value={form.dob} type="date" onChange={update('dob')} />{select('Gender *', 'gender', ['Male','Female','Other'])}{errors.gender && <p className="-mt-2 text-xs text-destructive">{errors.gender}</p>}{select('Blood group', 'bloodGroup', ['A+','A-','B+','B-','O+','O-','AB+','AB-'])}<Field label="Parent / spouse name *" value={form.parentName} onChange={update('parentName')} error={errors.parentName}/></div></Section><Section title="Contact Information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Mobile number *" value={form.mobile} onChange={update('mobile')} inputMode="numeric" error={errors.mobile} placeholder="10 digit mobile number"/><Field label="Email address" value={form.email} onChange={update('email')} type="email"/></div></Section><Section title="Address"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Street address *" value={form.address} onChange={update('address')} error={errors.address}/></div><Field label="District *" value={form.city} onChange={update('city')} error={errors.city}/><Field label="State *" value={form.state} onChange={update('state')} error={errors.state}/><Field label="PIN code *" value={form.postalCode} onChange={update('postalCode')} inputMode="numeric" error={errors.postalCode}/></div></Section><Section title="Emergency Contact"><div className="grid gap-4 sm:grid-cols-3"><Field label="Contact name" value={form.emergencyName} onChange={update('emergencyName')} /><Field label="Phone number" value={form.emergencyPhone} onChange={update('emergencyPhone')} inputMode="numeric"/><Field label="Relationship" value={form.emergencyRelation} onChange={update('emergencyRelation')} /></div></Section><Section title="Medical History" description="Document known conditions before consultation"><div className="grid gap-4"><div><Label className="text-xs text-muted-foreground">Allergies</Label><Textarea className="mt-1.5 min-h-18" value={form.allergies} onChange={(e) => update('allergies')(e.target.value)} /></div><div><Label className="text-xs text-muted-foreground">Existing conditions</Label><Textarea className="mt-1.5 min-h-18" value={form.conditions} onChange={(e) => update('conditions')(e.target.value)} /></div><Field label="Current medications" value={form.medications} onChange={update('medications')} /></div></Section><Section title="Lifestyle"><div className="grid gap-4 sm:grid-cols-2">{select('Smoking', 'smoking', ['Never','Occasional','Regular','Former'])}{select('Alcohol', 'alcohol', ['Never','Occasional','Regular','Former'])}{select('Exercise', 'exercise', ['Sedentary','Light','Moderate','Active','Very Active'])}{select('Diet pattern', 'diet', ['Vegetarian','Non-Vegetarian','Eggetarian','Vegan','Jain'])}</div></Section></div><div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:left-64"><div className="mx-auto flex max-w-[1500px] justify-end gap-2"><Button variant="outline" onClick={onCancel}><X className="mr-2 size-4"/>Cancel</Button><Button disabled={saved} onClick={handleSave}>{saved ? <Check className="mr-2 size-4"/> : <UserPlus className="mr-2 size-4"/>}{saved ? 'Registration created' : existingPatient ? 'Save visit' : 'Save & create visit'}</Button></div></div></>
}

function PatientProfile({ patient, center, centerId, justRegistered, onNewVisit }: { patient: ExistingPatient | null; center: string; centerId: ConsultationCenter | null; justRegistered?: boolean; onNewVisit: () => void }) {
 const p = patient ?? { mr: 'MR-100618', name: 'New Patient', age: 0, gender: 'Not specified', bloodGroup: 'Not recorded', mobile: 'Not recorded', lastVisit: 'First visit', visits: [], bills: [] } as ExistingPatient
 const print = () => openA4Print('Patient Details', p, center)
 return <div className="grid gap-6 xl:grid-cols-[280px_1fr]"><aside><Card className="sticky top-20 rounded-lg shadow-sm"><CardContent className="p-5"><div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{p.name.split(' ').map((part) => part[0]).join('')}</div><h2 className="mt-4 font-display text-xl font-semibold">{p.name}</h2><p className="mt-1 text-sm text-muted-foreground">{p.mr}</p><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><Info label="Age / Gender" value={`${p.age || '—'} / ${p.gender}`}/><Info label="Blood group" value={p.bloodGroup}/><Info label="Phone" value={p.mobile}/><Info label="Last visit" value={p.lastVisit}/></dl><div className="mt-6 grid grid-cols-2 gap-2"><Button size="sm" onClick={onNewVisit}><CalendarDays className="mr-2 size-4"/>New visit</Button><Button size="sm" variant="outline" onClick={onNewVisit}><Pencil className="mr-2 size-4"/>Edit</Button></div></CardContent></Card></aside><main>{justRegistered && <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="size-4"/></div><div><p className="text-sm font-semibold text-primary">Registration successful</p><p className="text-sm text-muted-foreground">{p.name} has been registered under {center}. MR number <span className="font-mono font-medium text-foreground">{p.mr}</span> has been issued.</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => openA4Print('Prescription', p, center)}><FileText className="mr-2 size-4"/>Generate blank prescription</Button><Button size="sm" variant="outline" onClick={() => openA4Print('OP Registration Sheet', p, center)}><Printer className="mr-2 size-4"/>Print OP sheet</Button></div></div>}<div className="mb-4 flex flex-wrap justify-between gap-2"><div><h2 className="font-display text-xl font-semibold">Patient profile</h2><p className="mt-1 text-sm text-muted-foreground">{center} · Active outpatient record</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={print}><Printer className="mr-2 size-4"/>Print</Button><Button variant="outline" size="sm" onClick={print}><Download className="mr-2 size-4"/>Export PDF</Button></div></div><Tabs defaultValue={justRegistered ? 'prescriptions' : 'overview'}><div className="overflow-x-auto"><TabsList className="h-10 bg-muted/70"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="visits">Visits</TabsTrigger><TabsTrigger value="op">OP Sheet</TabsTrigger><TabsTrigger value="prescriptions">Prescriptions</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList></div><TabsContent value="overview" className="mt-5"><Overview patient={p}/></TabsContent><TabsContent value="visits" className="mt-5"><Visits patient={p}/></TabsContent><TabsContent value="op" className="mt-5"><OPSheet patient={p} center={center}/></TabsContent><TabsContent value="prescriptions" className="mt-5"><Prescription patient={p} center={center}/></TabsContent><TabsContent value="documents" className="mt-5"><Documents patient={p}/></TabsContent></Tabs></main></div>
}
function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={cn('text-right font-medium', strong && 'text-destructive')}>{value}</dd></div> }
function Overview({ patient }: { patient: ExistingPatient }) { return <div className="grid gap-5 lg:grid-cols-2"><Section title="Clinical summary"><div className="space-y-4 text-sm"><Info label="Primary center" value="Nutrition Center"/><Info label="Allergies" value="Not recorded"/><Info label="Chronic conditions" value="Not recorded"/><Info label="Current medications" value="Not recorded"/></div></Section><Section title="Care activity"><div className="grid grid-cols-3 gap-3"><Metric label="Visits" value={String(patient.visits.length)} /><Metric label="Prescriptions" value="0" /><Metric label="Documents" value="0" /></div></Section><div className="lg:col-span-2"><Visits patient={patient}/></div></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-3"><p className="text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div> }

/* ------------------------------------------------------------------ */
/*  Visit history — short ID, patient, date/time, doctor, department,   */
/*  reason and status, newest first (Requirement 3)                     */
/* ------------------------------------------------------------------ */

function Visits({ patient }: { patient: ExistingPatient }) {
  const sorted = [...patient.visits].reverse()
  return <Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Visit history</CardTitle><CardDescription>Latest visit appears first. Click a row to open full visit details.</CardDescription></CardHeader><CardContent>{sorted.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Patient</th><th className="p-3 font-medium">Date & time</th><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Reason</th><th className="p-3 font-medium">Status</th></tr></thead><tbody>{sorted.map((visit, index) => <tr className={cn('border-b cursor-pointer hover:bg-muted/40', index === 0 && 'bg-primary/5')} key={visit.id}><td className="p-3 font-mono text-xs font-medium">{visit.id}</td><td className="p-3">{patient.name}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.center}</td><td className="p-3">{visit.reason}</td><td className="p-3"><StatusBadge status={index === 0 ? 'Active' : 'Completed'}/></td></tr>)}</tbody></table></div> : <EmptyState title="No visits recorded" action="Create first visit"/>}</CardContent></Card>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Active' ? 'bg-primary/10 text-primary' : status === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', tone)}>{status}</span>
}

/* ------------------------------------------------------------------ */
/*  OP Sheet module — empty state, list with actions, create/edit form  */
/*  (OP Sheet Module requirements)                                      */
/* ------------------------------------------------------------------ */

type OPSheetRecord = {
  id: string
  visitId: string
  date: string
  doctor: string
  department: string
  status: string
  clinicalNotes: string
  investigations: string
  treatmentPlan: string
  measurementValues: Record<string, string[]>
}

function OPSheet({ patient, center }: { patient: ExistingPatient; center: string }) {
  const [records, setRecords] = useState<OPSheetRecord[]>([])
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const latestVisit = patient.visits[patient.visits.length - 1]
  const editing = records.find((r) => r.id === activeId) ?? null

  const openNew = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openView = (id: string) => { setActiveId(id); setViewOnly(true); setMode('edit') }
  const openEdit = (id: string) => { setActiveId(id); setViewOnly(false); setMode('edit') }

  const handleSaveRecord = (record: OPSheetRecord) => {
    setRecords((current) => {
      const exists = current.some((r) => r.id === record.id)
      const next = exists ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current]
      return next
    })
    setMode('list')
  }

  const printRecord = (record: OPSheetRecord) => openA4Print('OP Registration Sheet', patient, center, buildOPPrintContent(record))

  if (mode === 'edit') {
    return <OPSheetEditor
      patient={patient}
      center={center}
      record={editing ?? { id: `OP-${Date.now().toString(36).toUpperCase()}`, visitId: latestVisit?.id ?? '—', date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), doctor: latestVisit?.doctor ?? 'Not yet assigned', department: center, status: 'Draft', clinicalNotes: '', investigations: '', treatmentPlan: '', measurementValues: {} }}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-display text-xl font-semibold">OP Sheets</h3><p className="text-sm text-muted-foreground">{patient.name} · {patient.mr}</p></div>
      <Button size="sm" onClick={openNew}><Plus className="mr-2 size-4"/>Create OP Sheet</Button>
    </div>
    {records.length === 0
      ? <Card className="rounded-lg shadow-sm"><CardContent className="py-14 text-center"><FileText className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 font-medium">No OP Sheets available for this patient.</p><Button size="sm" className="mt-4" onClick={openNew}><Plus className="mr-2 size-4"/>Create New OP Sheet</Button></CardContent></Card>
      : <Card className="rounded-lg shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Patient Name</th><th className="p-3 font-medium">Date of Consultation</th><th className="p-3 font-medium">Doctor Name</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Actions</th></tr></thead><tbody>{records.map((record) => <tr className="border-b" key={record.id}><td className="p-3 font-mono text-xs">{record.visitId}</td><td className="p-3">{patient.name}</td><td className="p-3">{record.date}</td><td className="p-3">{record.doctor}</td><td className="p-3">{record.department}</td><td className="p-3"><StatusBadge status={record.status}/></td><td className="p-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openView(record.id)}><Eye className="mr-1 size-3.5"/>View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(record.id)}><Pencil className="mr-1 size-3.5"/>Edit</Button><Button variant="ghost" size="sm" onClick={() => printRecord(record)}><Printer className="mr-1 size-3.5"/>Print</Button><Button variant="ghost" size="sm" onClick={() => printRecord(record)}><Download className="mr-1 size-3.5"/>Export</Button></div></td></tr>)}</tbody></table></div></CardContent></Card>}
  </div>
}

function buildOPPrintContent(record: OPSheetRecord): PrintContent {
  const rows = measurements
    .filter((name) => (record.measurementValues[name] ?? []).some((v) => v && v.trim()))
    .map((name) => [name, ...(record.measurementValues[name] ?? ['', '', '', '', ''])])
  return {
    columns: ['Measurement', ...measurementColumns],
    rows,
    sections: [
      { label: 'Clinical Examination', value: record.clinicalNotes },
      { label: 'Investigations', value: record.investigations },
      { label: 'Treatment Plan & Follow-up', value: record.treatmentPlan },
    ],
  }
}

function OPSheetEditor({ patient, center, record, readOnly, onCancel, onSave }: { patient: ExistingPatient; center: string; record: OPSheetRecord; readOnly: boolean; onCancel: () => void; onSave: (record: OPSheetRecord) => void }) {
  const [clinicalNotes, setClinicalNotes] = useState(record.clinicalNotes)
  const [investigations, setInvestigations] = useState(record.investigations)
  const [treatmentPlan, setTreatmentPlan] = useState(record.treatmentPlan)
  const [measurementValues, setMeasurementValues] = useState<Record<string, string[]>>(record.measurementValues)
  const [status, setStatus] = useState(record.status)

  const setMeasurement = (name: string, colIndex: number, value: string) => {
    setMeasurementValues((current) => {
      const row = current[name] ? [...current[name]] : ['', '', '', '', '']
      row[colIndex] = value
      return { ...current, [name]: row }
    })
  }

  const currentRecord = (): OPSheetRecord => ({ ...record, clinicalNotes, investigations, treatmentPlan, measurementValues, status })
  const doPrint = () => openA4Print('OP Registration Sheet', patient, center, buildOPPrintContent(currentRecord()))
  const handleSave = () => onSave({ ...currentRecord(), status: status === 'Draft' ? 'Completed' : status })

  return <div className="print-sheet space-y-5">
    <div className="flex flex-wrap justify-between gap-2">
      <div><h3 className="font-display text-xl font-semibold">{readOnly ? 'View OP Sheet' : 'Out Patient Registration Sheet'}</h3><p className="text-sm text-muted-foreground">{patient.name} · {patient.mr} · Visit {record.visitId}</p></div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}><ArrowLeft className="mr-2 size-4"/>Back to list</Button>
        <Button size="sm" variant="outline" onClick={doPrint}><Printer className="mr-2 size-4"/>Print</Button>
        <Button size="sm" variant="outline" onClick={doPrint}><Download className="mr-2 size-4"/>Export PDF</Button>
        {!readOnly && <Button size="sm" onClick={handleSave}><Check className="mr-2 size-4"/>Save</Button>}
      </div>
    </div>
    <Section title="Clinical examination" description="Detailed clinical notes">
      <Textarea className="min-h-64 resize-y" disabled={readOnly} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Document clinical examination findings, assessment and observations..."/>
    </Section>
    <Section title="Baseline measurements" description="Record and compare treatment progress">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground"><tr>{['Measurement', ...measurementColumns].map((x) => <th className="p-2 text-left font-medium" key={x}>{x}</th>)}</tr></thead>
          <tbody>{measurements.map((measurement) => <tr className="border-b" key={measurement}>
            <td className="p-2 font-medium">{measurement}</td>
            {measurementColumns.map((_, i) => <td className="p-1.5" key={i}>
              <Input className="h-7 min-w-24" disabled={readOnly} aria-label={`${measurement} ${measurementColumns[i]}`} value={measurementValues[measurement]?.[i] ?? ''} onChange={(e) => setMeasurement(measurement, i, e.target.value)}/>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </Section>
    <div className="grid gap-5 md:grid-cols-2">
      <Section title="Investigations"><Textarea disabled={readOnly} placeholder="Test, finding and date" className="min-h-28" value={investigations} onChange={(e) => setInvestigations(e.target.value)}/></Section>
      <Section title="Treatment plan & follow-up"><Textarea disabled={readOnly} placeholder="Plan, advice and next review date" className="min-h-28" value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)}/></Section>
    </div>
  </div>
}

/* ------------------------------------------------------------------ */
/*  Prescription module — empty state, list with actions, create/edit   */
/* ------------------------------------------------------------------ */

type MedicineRow = { id: string; medicine: string; dosage: string; frequency: string; duration: string; instructions: string }
type PrescriptionRecord = {
  id: string
  visitId: string
  date: string
  doctor: string
  department: string
  status: string
  diagnosis: string
  medicines: MedicineRow[]
  advice: string
  followUp: string
}

const blankMedicineRows = (): MedicineRow[] => [
  { id: `m-${Date.now()}-1`, medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
  { id: `m-${Date.now()}-2`, medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
  { id: `m-${Date.now()}-3`, medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
]

function Prescription({ patient, center }: { patient: ExistingPatient; center: string }) {
  const [records, setRecords] = useState<PrescriptionRecord[]>([])
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const latestVisit = patient.visits[patient.visits.length - 1]
  const editing = records.find((r) => r.id === activeId) ?? null

  const openNew = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openBlank = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openView = (id: string) => { setActiveId(id); setViewOnly(true); setMode('edit') }
  const openEdit = (id: string) => { setActiveId(id); setViewOnly(false); setMode('edit') }

  const handleSaveRecord = (record: PrescriptionRecord) => {
    setRecords((current) => {
      const exists = current.some((r) => r.id === record.id)
      return exists ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current]
    })
    setMode('list')
  }

  const printRecord = (record: PrescriptionRecord) => openA4Print('Prescription', patient, center, buildPrescriptionPrintContent(record))

  if (mode === 'edit') {
    return <PrescriptionEditor
      patient={patient}
      center={center}
      record={editing ?? { id: `RX-${Date.now().toString(36).toUpperCase()}`, visitId: latestVisit?.id ?? '—', date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), doctor: latestVisit?.doctor ?? 'Not yet assigned', department: center, status: 'Draft', diagnosis: '', medicines: blankMedicineRows(), advice: '', followUp: '' }}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-display text-xl font-semibold">Prescriptions</h3><p className="text-sm text-muted-foreground">{patient.name} · {patient.mr}</p></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={openBlank}><FileText className="mr-2 size-4"/>Blank prescription</Button><Button size="sm" onClick={openNew}><Plus className="mr-2 size-4"/>Create Prescription</Button></div>
    </div>
    {records.length === 0
      ? <Card className="rounded-lg shadow-sm"><CardContent className="py-14 text-center"><Stethoscope className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 font-medium">No Prescriptions available for this patient.</p><Button size="sm" className="mt-4" onClick={openNew}><Plus className="mr-2 size-4"/>Create New Prescription</Button></CardContent></Card>
      : <Card className="rounded-lg shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Patient Name</th><th className="p-3 font-medium">Consultation Date</th><th className="p-3 font-medium">Doctor Name</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Actions</th></tr></thead><tbody>{records.map((record) => <tr className="border-b" key={record.id}><td className="p-3 font-mono text-xs">{record.visitId}</td><td className="p-3">{patient.name}</td><td className="p-3">{record.date}</td><td className="p-3">{record.doctor}</td><td className="p-3">{record.department}</td><td className="p-3"><StatusBadge status={record.status}/></td><td className="p-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openView(record.id)}><Eye className="mr-1 size-3.5"/>View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(record.id)}><Pencil className="mr-1 size-3.5"/>Edit</Button><Button variant="ghost" size="sm" onClick={() => printRecord(record)}><Printer className="mr-1 size-3.5"/>Print</Button><Button variant="ghost" size="sm" onClick={() => printRecord(record)}><Download className="mr-1 size-3.5"/>Export</Button></div></td></tr>)}</tbody></table></div></CardContent></Card>}
  </div>
}

function buildPrescriptionPrintContent(record: PrescriptionRecord): PrintContent {
  return {
    columns: ['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'],
    rows: record.medicines.filter((row) => row.medicine.trim()).map((row) => [row.medicine, row.dosage, row.frequency, row.duration, row.instructions]),
    sections: [
      { label: 'Diagnosis', value: record.diagnosis },
      { label: 'Advice', value: record.advice },
      { label: 'Follow-up', value: record.followUp ? `Next visit: ${record.followUp}` : '' },
    ],
  }
}

function PrescriptionEditor({ patient, center, record, readOnly, onCancel, onSave }: { patient: ExistingPatient; center: string; record: PrescriptionRecord; readOnly: boolean; onCancel: () => void; onSave: (record: PrescriptionRecord) => void }) {
  const [diagnosis, setDiagnosis] = useState(record.diagnosis)
  const [medicines, setMedicines] = useState<MedicineRow[]>(record.medicines)
  const [advice, setAdvice] = useState(record.advice)
  const [followUp, setFollowUp] = useState(record.followUp)
  const [status, setStatus] = useState(record.status)

  const updateRow = (id: string, key: keyof MedicineRow, value: string) =>
    setMedicines((rows) => rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)))
  const addRow = () => setMedicines((rows) => [...rows, { id: `m-${Date.now()}`, medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const removeRow = (id: string) => setMedicines((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows))

  const currentRecord = (): PrescriptionRecord => ({ ...record, diagnosis, medicines, advice, followUp, status })
  const doPrint = () => openA4Print('Prescription', patient, center, buildPrescriptionPrintContent(currentRecord()))
  const doBlank = () => openA4Print('Prescription', patient, center)
  const handleSave = () => onSave({ ...currentRecord(), status: status === 'Draft' ? 'Completed' : status })

  return <div className="print-sheet">
    <div className="flex items-start justify-between border-b-2 border-primary pb-5">
      <ClinicHeader center={center}/>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="mr-2 size-4"/>Back to list</Button>
        <Button variant="outline" size="sm" onClick={doPrint}><Printer className="mr-2 size-4"/>Print</Button>
        <Button variant="outline" size="sm" onClick={doBlank}><FileText className="mr-2 size-4"/>Blank sheet</Button>
        {!readOnly && <Button size="sm" onClick={handleSave}><Check className="mr-2 size-4"/>Save</Button>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 py-5 text-sm">
      <p><b>Patient:</b> {patient.name}</p>
      <p><b>MR No:</b> {patient.mr}</p>
      <p><b>Age / Sex:</b> {patient.age} / {patient.gender}</p>
      <p><b>Date:</b> {record.date}</p>
    </div>
    <Section title="Diagnosis"><Textarea disabled={readOnly} placeholder="Clinical diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}/></Section>
    <div className="mt-5">
      <Section title="Prescription">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground"><tr>{['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions', ''].map((x) => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead>
          <tbody>{medicines.map((row) => <tr key={row.id} className="border-b">
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Medicine" value={row.medicine} onChange={(e) => updateRow(row.id, 'medicine', e.target.value)}/></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Dosage" value={row.dosage} onChange={(e) => updateRow(row.id, 'dosage', e.target.value)}/></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Frequency" value={row.frequency} onChange={(e) => updateRow(row.id, 'frequency', e.target.value)}/></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Duration" value={row.duration} onChange={(e) => updateRow(row.id, 'duration', e.target.value)}/></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Instructions" value={row.instructions} onChange={(e) => updateRow(row.id, 'instructions', e.target.value)}/></td>
            <td className="p-2 text-right">{!readOnly && <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)}><Trash2 className="size-3.5"/></Button>}</td>
          </tr>)}</tbody>
        </table>
        {!readOnly && <Button variant="outline" size="sm" className="mt-3" onClick={addRow}><Plus className="mr-2 size-4"/>Add medicine</Button>}
      </Section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <Section title="Advice"><Textarea disabled={readOnly} className="min-h-24" value={advice} onChange={(e) => setAdvice(e.target.value)}/></Section>
      <Section title="Follow-up"><Field label="Next visit" type="date" value={followUp} onChange={setFollowUp}/></Section>
    </div>
    <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
      <div className="border-t pt-2">Doctor signature</div>
      <div className="border-t pt-2">Dietitian signature</div>
    </div>
  </div>
}

function Bills({ patient }: { patient: ExistingPatient }) { const total = patient.bills.reduce((sum, bill) => sum + bill.amount, 0); return <div className="grid gap-5 lg:grid-cols-[1fr_280px]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>{patient.bills.length ? <div className="space-y-3">{patient.bills.map((bill) => <div className="flex items-center justify-between rounded-lg border p-4" key={bill.id}><div><p className="font-medium">{bill.id}</p><p className="mt-1 text-xs text-muted-foreground">{bill.date} · {bill.service}</p></div><div className="text-right"><p className="font-semibold">Rs. {bill.amount.toLocaleString()}</p><p className="mt-1 text-xs text-destructive">{bill.status}</p></div></div>)}</div> : <EmptyState title="No invoices for this patient" action="Create invoice"/>}</CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Account summary</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="mt-1 text-2xl font-semibold">Rs. {total.toLocaleString()}</p><Button className="mt-5 w-full" size="sm"><IndianRupee className="mr-2 size-4"/>Record payment</Button><Button className="mt-2 w-full" variant="outline" size="sm"><FileText className="mr-2 size-4"/>New invoice</Button></CardContent></Card></div> }
function EmptyState({ title, action }: { title: string; action: string }) { return <div className="py-8 text-center"><p className="font-medium">{title}</p><Button size="sm" variant="outline" className="mt-3"><Plus className="mr-2 size-4"/>{action}</Button></div> }

function ClinicHeader({ center }: { center: string }) {
  const nutrition = center.toLowerCase().includes('nutrition')
  return <div><h3 className="font-display text-2xl font-semibold">{nutrition ? 'NEW YOU' : 'Ayurcare Center'}</h3>{nutrition && <p className="mt-1 text-sm font-medium text-primary">Lose Weight. Choose Health.</p>}<p className="mt-1 text-xs text-muted-foreground">{nutrition ? 'Centre for Professional Weight Management' : 'Jubilee Bazar'}<br/>Onden Road, Kannur - 670001, Kerala<br/>PH: 8111999581 / 8111999582</p></div>
}

/* ------------------------------------------------------------------ */
/*  Medical Documents module — upload metadata, patient-aware list,     */
/*  print/export/delete-with-confirmation (Medical Documents Module)    */
/* ------------------------------------------------------------------ */

type PatientDocument = {
  title: string
  category: string
  date: string
  uploadedBy: string
  notes: string
}

function Documents({ patient }: { patient: ExistingPatient }) {
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Clinical report')
  const [uploadedBy, setUploadedBy] = useState('')
  const [notes, setNotes] = useState('')

  const add = () => {
    if (!title.trim()) return
    setDocuments((items) => [{ title, category, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), uploadedBy: uploadedBy.trim() || 'Reception desk', notes }, ...items])
    setTitle('')
    setNotes('')
  }

  const remove = (index: number) => {
    const doc = documents[index]
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    setDocuments((items) => items.filter((_, i) => i !== index))
  }

  const printDoc = (doc: PatientDocument) => openA4Print(doc.title, patient, '', {
    columns: ['Field', 'Value'],
    rows: [
      ['Document Type', doc.category],
      ['Uploaded By', doc.uploadedBy],
      ['Upload Date', doc.date],
    ],
    sections: [{ label: 'Notes', value: doc.notes }],
  })

  return <Card className="rounded-lg shadow-sm"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Documents</CardTitle><CardDescription>Clinical reports, scans, images, and supporting records for {patient.name}.</CardDescription></div><Button size="sm" onClick={add}><Upload className="mr-2 size-4"/>Upload document</Button></CardHeader><CardContent><div className="mb-5 grid gap-3 md:grid-cols-2"><Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)}/><select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option>Clinical report</option><option>Lab report</option><option>Prescription</option><option>Identity document</option><option>Scanned report</option></select><Input placeholder="Uploaded by" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)}/><Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>{documents.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 text-left">File Name</th><th className="p-3 text-left">Document Type</th><th className="p-3 text-left">Patient Name</th><th className="p-3 text-left">Upload Date</th><th className="p-3 text-left">Uploaded By</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{documents.map((document, index) => <tr key={`${document.title}-${index}`} className="border-b"><td className="p-3 font-medium">{document.title}</td><td className="p-3">{document.category}</td><td className="p-3">{patient.name}</td><td className="p-3">{document.date}</td><td className="p-3">{document.uploadedBy}</td><td className="p-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm"><Eye className="mr-1 size-3.5"/>View</Button><Button variant="ghost" size="sm"><Download className="mr-1 size-3.5"/>Download</Button><Button variant="ghost" size="sm" onClick={() => printDoc(document)}><Printer className="mr-1 size-3.5"/>Print</Button><Button variant="ghost" size="sm" onClick={() => printDoc(document)}><FileText className="mr-1 size-3.5"/>Export</Button><Button variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="mr-1 size-3.5"/>Delete</Button></div></td></tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed py-10 text-center"><FileText className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 font-medium">No documents added</p><p className="mt-1 text-sm text-muted-foreground">Add a title and category, then upload a patient document.</p></div>}</CardContent></Card>
}

/* ------------------------------------------------------------------ */
/*  Print / PDF export                                                  */
/* ------------------------------------------------------------------ */

// Optional live content to render into the printed sheet. When omitted,
// the sheet falls back to a blank template (used for "blank prescription"
// and "blank OP sheet" reception workflows).
type PrintContent = {
  columns?: string[]
  rows?: string[][]
  sections?: { label: string; value: string }[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function openA4Print(title: string, patient: ExistingPatient | null, center: string, content?: PrintContent) {
  // IMPORTANT: do not pass 'noopener' in the window features here. Most
  // browsers return `null` from window.open() when 'noopener' is set,
  // which previously made every Print / Export PDF / Generate prescription
  // button silently do nothing (the function returned early on `!printWindow`).
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Your browser blocked the print window. Please allow pop-ups for this site and try again.')
    return
  }

  const nutrition = center.toLowerCase().includes('nutrition')
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const subtitle = nutrition ? 'Lose Weight. Choose Health. | Centre for Professional Weight Management' : 'Jubilee Bazar'

  const patientInfo = patient
    ? `<div class="patient"><b>Patient:</b> ${escapeHtml(patient.name)}<b>MR No:</b> ${escapeHtml(patient.mr)}<b>Age / Gender:</b> ${patient.age} / ${escapeHtml(patient.gender)}<b>Blood Group:</b> ${escapeHtml(patient.bloodGroup)}<b>Mobile:</b> ${escapeHtml(patient.mobile)}<b>Date:</b> ${new Date().toLocaleDateString()}</div>`
    : '<div class="patient"><b>Patient:</b> ____________________ <b>MR No:</b> ____________________ <b>Age / Gender:</b> ____________________ <b>Date:</b> ____________________</div>'

  const columns = content?.columns ?? ['Item', 'Dosage / Finding', 'Frequency / Notes', 'Duration']
  const dataRows = content?.rows ?? []
  const tableRows = dataRows.length
    ? dataRows.map((row) => `<tr>${columns.map((_, i) => `<td>${row[i] ? escapeHtml(row[i]) : '&nbsp;'}</td>`).join('')}</tr>`).join('')
    : Array.from({ length: 7 }, () => `<tr>${columns.map(() => '<td>&nbsp;</td>').join('')}</tr>`).join('')

  const sections = content?.sections?.length
    ? content.sections.map((section) => `<section class="section"><b>${escapeHtml(section.label)}</b>${section.value.trim() ? `<div class="notes">${escapeHtml(section.value).replace(/\n/g, '<br>')}</div>` : '<div class="rule"></div><div class="rule"></div>'}</section>`).join('')
    : `<section class="section"><b>Diagnosis / Clinical Notes</b><div class="rule"></div><div class="rule"></div></section><section class="section"><b>Advice and Follow-up</b><div class="rule"></div><div class="rule"></div></section>`

  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}.section{margin-top:18px}.rule{border-bottom:1px solid #b8c7cc;height:34px}.notes{border:1px solid #b8c7cc;padding:8px;margin-top:6px;min-height:34px;white-space:pre-wrap}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left}.table th{background:#edf5f6}.signature{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:100px;text-align:center}.signature div{border-top:1px solid #17202a;padding-top:8px}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</div></header><div class="title">${escapeHtml(title)}</div>${patientInfo}<section class="section"><b>${title.includes('Prescription') ? 'Medicines' : 'Clinical Examination'}</b><table class="table"><thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></section>${sections}<div class="signature"><div>Doctor Signature</div><div>Dietitian Signature</div></div></body></html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}