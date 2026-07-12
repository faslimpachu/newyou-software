'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, Download, FileText, HeartPulse,
  IndianRupee, Pencil, Plus, Printer, Search, Upload, UserPlus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { existingPatients as seedPatients, generateMR, centersByPrefix, type ExistingPatient, type ConsultationCenter, centerOptions, searchFields } from '@/lib/registration-data'

type Screen = 'choose' | 'search' | 'form' | 'profile'
type FormValues = Record<string, string>

const emptyForm: FormValues = {
  firstName: '', lastName: '', dob: '', gender: '', bloodGroup: '', mobile: '', email: '', parentName: '',
  address: '', city: '', state: '', postalCode: '', allergies: '', conditions: '', medications: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '', smoking: 'Never', alcohol: 'Never', exercise: 'Moderate', diet: 'Vegetarian',
}
const measurements = ['Weight (kg)', 'Height (cm)', 'BMI', 'Body Fat (%)', 'Lean Mass (kg)', 'Waist (cm)', 'Hip (cm)', 'WHR', 'Muscle Mass (kg)', 'Water (%)', 'BMR (kcal)', 'Metabolic Age']

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
  const [patients] = useState<ExistingPatient[]>(seedPatients)
  const [selected, setSelected] = useState<ExistingPatient | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [saved, setSaved] = useState(false)
  const [generatedMR, setGeneratedMR] = useState('')
  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().replace(/\s/g, '')
    return patients.filter((p) => ({ mr: p.mr, mobile: p.mobile, name: p.name, parent: p.parentName }[searchField] || '').toLowerCase().replace(/\s/g, '').includes(q))
  }, [query, searchField, patients])
  const set = (key: string) => (value: string) => setForm((state) => ({ ...state, [key]: value }))
  const activeCenter = centerOptions.find((item) => item.id === center)
  const goBack = () => { setSelected(null); setQuery(''); setSaved(false); setGeneratedMR(''); setScreen(screen === 'search' ? 'choose' : 'search') }

  const handlePatientCreated = (patient: ExistingPatient) => {
    setGeneratedMR(patient.mr)
    setSelected(patient)
    setScreen('profile')
  }

  return <div className="mx-auto max-w-[1500px] pb-24">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span>Patient Care</span><ChevronRight className="size-3"/><span className="text-foreground">Registration</span></div><h1 className="font-display text-2xl font-semibold">Patient Registration</h1><p className="mt-1 text-sm text-muted-foreground">Create an outpatient visit or continue care for an existing patient.</p></div>
      {screen !== 'choose' && <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft className="mr-2 size-4"/>Back</Button>}
    </div>
    <div className="mb-7 flex items-center gap-2"><Step active={screen === 'choose'} complete={!!center && screen !== 'choose'} n="1" label="Consultation"/><div className="h-px flex-1 bg-border"/><Step active={screen === 'search'} complete={['form','profile'].includes(screen)} n="2" label="Patient lookup"/><div className="h-px flex-1 bg-border"/><Step active={['form','profile'].includes(screen)} n="3" label="Registration"/></div>
    {screen === 'choose' && <div className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">{centerOptions.map((option) => { const Icon = option.icon; return <button key={option.id} type="button" onClick={() => { setCenter(option.id); setScreen('search') }} className="group rounded-lg border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"><div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5"/></div><h2 className="font-display text-lg font-semibold">{option.name}</h2><p className="mt-1 text-sm font-medium text-primary">{option.tagline}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{option.description}</p><div className="mt-5 flex flex-wrap gap-2">{option.services.map((service) => <span key={service} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{service}</span>)}</div><div className="mt-6 flex items-center text-sm font-semibold text-primary">Select center <ChevronRight className="ml-1 size-4 transition-transform group-hover:translate-x-1"/></div></button> })}</div>}
    {screen === 'search' && <SearchPanel center={activeCenter?.name ?? ''} searchField={searchField} setSearchField={setSearchField} query={query} setQuery={setQuery} matches={matches} onSelect={(patient) => { setSelected(patient); setScreen('profile') }} onNew={() => { setGeneratedMR(''); setForm(emptyForm); setScreen('form') }} />}
    {screen === 'form' && <RegistrationForm form={form} set={set} center={center} saved={saved} onCancel={() => setScreen('search')} onSave={() => { setSaved(true); setTimeout(() => setScreen('search'), 600) }} onPatientCreated={handlePatientCreated} patients={patients} />}
    {screen === 'profile' && <PatientProfile patient={selected} center={activeCenter?.name ?? 'Nutrition Center'} onNewVisit={() => { setGeneratedMR(''); setForm(emptyForm); setScreen('form') }} generatedMR={generatedMR} />}
  </div>
}

function Step({ n, label, active, complete }: { n: string; label: string; active?: boolean; complete?: boolean }) { return <div className="flex items-center gap-2"><span className={cn('flex size-6 items-center justify-center rounded-full text-xs font-semibold', active ? 'bg-primary text-primary-foreground' : complete ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{complete ? <Check className="size-3.5"/> : n}</span><span className={cn('hidden text-xs font-medium sm:block', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span></div> }

function SearchPanel({ center, searchField, setSearchField, query, setQuery, matches, onSelect, onNew }: { center: string; searchField: string; setSearchField: (s: string) => void; query: string; setQuery: (s: string) => void; matches: ExistingPatient[]; onSelect: (p: ExistingPatient) => void; onNew: () => void }) {
  return <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_.7fr]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Find patient</CardTitle><CardDescription>Search the patient registry before creating a new medical record.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{searchFields.map((field) => <button key={field.id} onClick={() => { setSearchField(field.id); setQuery('') }} className={cn('rounded-md border px-3 py-1.5 text-xs font-medium', searchField === field.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>{field.label}</button>)}</div><div className="relative mt-5"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="h-9 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchFields.find((item) => item.id === searchField)?.placeholder}/></div>{query && <div className="mt-4 overflow-hidden rounded-lg border">{matches.length ? matches.map((patient) => <button className="flex w-full items-center justify-between border-b p-4 text-left last:border-0 hover:bg-muted/60" key={patient.mr} onClick={() => onSelect(patient)}><div><p className="font-medium">{patient.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{patient.mr}</span></p><p className="mt-1 text-xs text-muted-foreground">{patient.age} years, {patient.gender} · {patient.mobile} · {patient.city}</p></div><ChevronRight className="size-4 text-muted-foreground"/></button>) : <div className="p-8 text-center"><p className="font-medium">No patient found</p><p className="mt-1 text-sm text-muted-foreground">Create a new medical record for this patient.</p><Button className="mt-4" size="sm" onClick={onNew}><UserPlus className="mr-2 size-4"/>New registration</Button></div>}</div>}</CardContent></Card><Card className="rounded-lg bg-primary text-primary-foreground"><CardContent className="p-6"><HeartPulse className="size-8 mb-4 opacity-80"/><p className="text-sm font-medium opacity-90">New to this centre?</p><p className="mt-1 text-xs opacity-75">Register the patient to generate a unique medical record number and start their first visit.</p><Button className="mt-5 w-full" variant="secondary" size="sm" onClick={onNew}><UserPlus className="mr-2 size-4"/>New registration</Button></CardContent></Card></div>
}

interface RegistrationFormProps {
  form: FormValues
  set: (k: string) => (v: string) => void
  center: ConsultationCenter | null
  saved: boolean
  onCancel: () => void
  onSave: () => void
  onPatientCreated: (patient: ExistingPatient) => void
  patients: ExistingPatient[]
}

function RegistrationForm({ form, set, center, saved, onCancel, onSave, onPatientCreated, patients }: RegistrationFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mrPreview = center ? generateMR(center, patients) : '--'
  const update = (key: string) => (value: string) => {
    const cleaned = ['mobile', 'postalCode', 'emergencyPhone'].includes(key) ? value.replace(/\D/g, '').slice(0, key === 'postalCode' ? 6 : 10) : value
    set(key)(cleaned)
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
    const duplicate = patients.find((p) => p.mobile === form.mobile && p.mobile.length === 10)
    if (duplicate && form.mobile.length === 10) next.mobile = `Mobile number already registered for ${duplicate.name} (${duplicate.mr}). Use patient lookup instead.`
    setErrors(next)
    return Object.keys(next).length === 0
  }
  const select = (label: string, key: string, values: string[]) => <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><select value={form[key]} onChange={(e) => set(key)(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select</option>{values.map((v) => <option key={v}>{v}</option>)}</select></div>
  const handleSubmit = () => {
    if (!validate()) return
    if (!center) return
    const mr = generateMR(center, patients)
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const newPatient: ExistingPatient = {
      mr,
      name: `${form.firstName} ${form.lastName}`.trim(),
      parentName: form.parentName,
      mobile: form.mobile,
      age: 0,
      gender: form.gender === 'Male' ? 'Male' : form.gender === 'Female' ? 'Female' : 'Other',
      bloodGroup: form.bloodGroup,
      city: form.city,
      lastVisit: today,
      tags: ['New'],
      visits: [],
      bills: [],
    }
    onPatientCreated(newPatient)
    onSave()
  }
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm"><span><span className="font-semibold text-primary">New patient record.</span> Saving creates the first visit automatically.</span><span className="rounded bg-background px-2 py-1 font-mono text-xs text-primary">MR: {mrPreview}</span></div><div className="grid gap-5 xl:grid-cols-2"><Section title="Personal Information" description="Fields marked * are required"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name *" value={form.firstName} onChange={update('firstName')} error={errors.firstName}/><Field label="Last name" value={form.lastName} onChange={update('lastName')} /><Field label="Date of birth" value={form.dob} type="date" onChange={update('dob')} />{select('Gender *', 'gender', ['Male','Female','Other'])}{errors.gender && <p className="-mt-2 text-xs text-destructive">{errors.gender}</p>}{select('Blood group', 'bloodGroup', ['A+','A-','B+','B-','O+','O-','AB+','AB-'])}<Field label="Parent / spouse name *" value={form.parentName} onChange={update('parentName')} error={errors.parentName}/></div></Section><Section title="Contact Information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Mobile number *" value={form.mobile} onChange={update('mobile')} inputMode="numeric" error={errors.mobile} placeholder="10 digit mobile number"/><Field label="Email address" value={form.email} onChange={update('email')} type="email"/></div></Section><Section title="Address"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Street address *" value={form.address} onChange={update('address')} error={errors.address}/></div><Field label="District *" value={form.city} onChange={update('city')} error={errors.city}/><Field label="State *" value={form.state} onChange={update('state')} error={errors.state}/><Field label="PIN code *" value={form.postalCode} onChange={update('postalCode')} inputMode="numeric" error={errors.postalCode} placeholder="6 digit PIN code"/></div></Section><Section title="Medical Information" description="Optional health details"><div className="grid gap-4 sm:grid-cols-2"><Field label="Allergies" value={form.allergies} onChange={update('allergies')} placeholder="Known allergies"/><Field label="Chronic conditions" value={form.conditions} onChange={update('conditions')} placeholder="Diabetes, Hypertension, etc."/><Field label="Current medications" value={form.medications} onChange={update('medications')} placeholder="Current medications"/></div></Section><div className="flex items-center justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={handleSubmit}>{saved ? <><Check className="mr-2 size-4"/>Saved</> : 'Save & Create Visit'}</Button></div></div></>
}

function PatientProfile({ patient, center, onNewVisit, generatedMR }: { patient: ExistingPatient | null; center: string; onNewVisit: () => void; generatedMR: string }) {
  const p = patient ?? { mr: generateMR('nutrition', []) as any, name: 'New Patient', age: 0, gender: 'Not specified', bloodGroup: 'Not recorded', mobile: 'Not recorded', lastVisit: 'First visit', visits: [], bills: [], parentName: '', city: '' } as ExistingPatient
  const print = () => openA4Print('Patient Details', p, center)
  const effectiveMR = generatedMR || p.mr
  return <div className="grid gap-6 xl:grid-cols-[280px_1fr]"><aside><Card className="sticky top-20 rounded-lg shadow-sm"><CardContent className="p-5"><div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{p.name.split(' ').map((part) => part[0]).join('')}</div><h2 className="mt-4 font-display text-xl font-semibold">{p.name}</h2><p className="mt-1 text-sm text-muted-foreground">{effectiveMR}</p><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><Info label="Age / Gender" value={`${p.age || '—'} / ${p.gender}`}/><Info label="Blood group" value={p.bloodGroup}/><Info label="Phone" value={p.mobile}/><Info label="City" value={p.city}/><Info label="Last visit" value={p.lastVisit}/></dl><Button className="mt-6 w-full" size="sm" onClick={onNewVisit}><CalendarDays className="mr-2 size-4"/>Create visit</Button></CardContent></Card></aside><main><div className="mb-4 flex flex-wrap justify-between gap-2"><div><h2 className="font-display text-xl font-semibold">Patient profile</h2><p className="mt-1 text-sm text-muted-foreground">{center} · Active outpatient record</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={print}><Printer className="mr-2 size-4"/>Print</Button><Button variant="outline" size="sm" onClick={print}><Download className="mr-2 size-4"/>Export PDF</Button></div></div><Tabs defaultValue="overview"><div className="overflow-x-auto"><TabsList className="h-10 bg-muted/70"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="visits">Visits</TabsTrigger><TabsTrigger value="op">OP Sheet</TabsTrigger><TabsTrigger value="prescriptions">Prescriptions</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList></div><TabsContent value="overview" className="mt-5"><Overview patient={p}/></TabsContent><TabsContent value="visits" className="mt-5"><Visits patient={p}/></TabsContent><TabsContent value="op" className="mt-5"><OPSheet patient={p} center={center}/></TabsContent><TabsContent value="prescriptions" className="mt-5"><Prescription patient={p} center={center}/></TabsContent><TabsContent value="documents" className="mt-5"><Documents patientMR={effectiveMR}/></TabsContent></Tabs></main></div>
}
function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={cn('text-right font-medium', strong && 'text-destructive')}>{value}</dd></div> }
function Overview({ patient }: { patient: ExistingPatient }) { return <div className="grid gap-5 lg:grid-cols-2"><Section title="Clinical summary"><div className="space-y-4 text-sm"><Info label="Primary center" value="Nutrition Center"/><Info label="Allergies" value={patient?.allergies || 'Not recorded'}/><Info label="Chronic conditions" value={patient?.conditions || 'Not recorded'}/><Info label="Current medications" value={patient?.medications || 'Not recorded'}/></div></Section><Section title="Care activity"><div className="grid grid-cols-3 gap-3"><Metric label="Visits" value={String(patient.visits.length)} /><Metric label="Prescriptions" value="0" /><Metric label="Documents" value="0" /></div></Section><div className="lg:col-span-2"><Visits patient={patient}/></div></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-3"><p className="text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div> }
function Visits({ patient }: { patient: ExistingPatient }) { return <Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Visit history</CardTitle></CardHeader><CardContent>{patient.visits.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Clinician</th><th className="p-3 font-medium">Reason</th></tr></thead><tbody>{patient.visits.map((visit) => <tr className="border-b" key={visit.id}><td className="p-3 font-medium">{visit.id}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.center}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.reason}</td></tr>)}</tbody></table></div> : <EmptyState title="No visits recorded" action="Create first visit"/>}</CardContent></Card> }
function OPSheet({ patient, center }: { patient: ExistingPatient; center: string }) {
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [investigations, setInvestigations] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  return <div className="print-sheet space-y-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-display text-xl font-semibold">Out Patient Registration Sheet</h3><p className="text-sm text-muted-foreground">{patient.name} · {patient.mr}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openA4Print('OP Registration Sheet', patient, center)}><Printer className="mr-2 size-4"/>Print</Button><Button size="sm" variant="outline" onClick={() => openA4Print('OP Registration Sheet', patient, center)}><Download className="mr-2 size-4"/>Export PDF</Button>{!editing ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4"/>Edit</Button> : <><Button size="sm" variant="outline" onClick={() => { setEditing(false) }}>Cancel</Button><Button size="sm" onClick={() => { setSaved(true); setEditing(false) }}>{saved ? <><Check className="mr-2 size-4"/>Updated</> : 'Update'}</Button></>}<Button size="sm" onClick={() => setSaved(true)}>{saved ? <><Check className="mr-2 size-4"/>Saved</> : 'Save'}</Button></div></div><Section title="Clinical examination" description="Detailed clinical notes"><Textarea className={cn('min-h-48 resize-y', editing && 'ring-2 ring-primary/50')} placeholder="Document clinical examination findings, assessment and observations..." value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} readOnly={!editing}/></Section><Section title="Baseline measurements" description="Record and compare treatment progress"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{['Measurement','Baseline','1 Month','2 Months','3 Months','Change'].map((x) => <th className="p-2 text-left font-medium" key={x}>{x}</th>)}</tr></thead><tbody>{measurements.map((measurement) => <tr className="border-b" key={measurement}><td className="p-2 font-medium">{measurement}</td>{Array.from({length: 5}, (_, i) => <td className="p-1.5" key={i}><Input className="h-7 min-w-24" readOnly={!editing} aria-label={`${measurement} value`}/></td>)}</tr>)}</tbody></table></div></Section><div className="grid gap-5 md:grid-cols-2"><Section title="Investigations"><Textarea className={cn('min-h-24', editing && 'ring-2 ring-primary/50')} placeholder="Test, finding and date" value={investigations} onChange={(e) => setInvestigations(e.target.value)} readOnly={!editing}/></Section><Section title="Treatment plan & follow-up"><Textarea className={cn('min-h-24', editing && 'ring-2 ring-primary/50')} placeholder="Plan, medication, follow-up schedule" value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} readOnly={!editing}/></Section></div>{saved && <p className="text-xs text-primary">OP Sheet {editing ? 'updated' : 'saved'} successfully.</p>}</div>
}
function Prescription({ patient, center }: { patient: ExistingPatient; center: string }) {
  const doctorName = 'Dr. Consulting Physician'
  return <div className="print-sheet"><div className="flex items-start justify-between border-b-2 border-primary pb-5"><ClinicHeader center={center}/><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openA4Print('Prescription', patient, center)}><Printer className="mr-2 size-4"/>Print</Button><Button variant="outline" size="sm" onClick={() => openA4Print('Blank Prescription', null, center)}><FileText className="mr-2 size-4"/>Blank sheet</Button></div></div><div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="grid gap-2 sm:grid-cols-2"><p><b>Patient:</b> {patient.name}</p><p><b>MR No:</b> {patient.mr}</p><p><b>Age / Sex:</b> {patient.age} / {patient.gender}</p><p><b>DOB:</b> {patient.dob || '—'}</p><p><b>Blood Group:</b> {patient.bloodGroup || '—'}</p><p><b>Mobile:</b> {patient.mobile}</p><p className="sm:col-span-2"><b>Address:</b> {patient.address || patient.city || '—'}</p><p><b>Date:</b> {new Date().toLocaleDateString()}</p><p><b>Doctor:</b> {doctorName}</p></div></div><Section title="Diagnosis"><Textarea placeholder="Clinical diagnosis"/></Section><div className="mt-5"><Section title="Prescription"><table className="w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{['Medicine','Dosage','Frequency','Duration','Instructions'].map((x) => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{[1,2,3].map((n) => <tr key={n} className="border-b">{[1,2,3,4,5].map((x) => <td key={x} className="p-2"><Input className="h-7" aria-label={`Prescription row ${n}`}/></td>)}</tr>)}</tbody></table></Section></div><div className="mt-5 grid gap-5 md:grid-cols-2"><Section title="Advice"><Textarea className="min-h-24"/></Section><Section title="Follow-up"><Field label="Next visit" type="date" value="" onChange={() => {}}/></Section></div><div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm"><div className="border-t pt-2">Doctor signature</div><div className="border-t pt-2">Dietitian signature</div></div><div className="mt-8 border-t pt-3 text-center text-xs text-muted-foreground">NEW YOU & Ayurcare Center · Jubilee Bazar, Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</div></div>
}
function Bills({ patient }: { patient: ExistingPatient }) { const total = patient.bills.reduce((sum, bill) => sum + bill.amount, 0); return <div className="grid gap-5 lg:grid-cols-[1fr_280px]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>{patient.bills.length ? <div className="space-y-3">{patient.bills.map((bill) => <div className="flex items-center justify-between rounded-lg border p-4" key={bill.id}><div><p className="font-medium">{bill.id}</p><p className="mt-1 text-xs text-muted-foreground">{bill.date} · {bill.service}</p></div><div className="text-right"><p className="font-semibold">Rs. {bill.amount.toLocaleString()}</p><p className="mt-1 text-xs text-destructive">{bill.status}</p></div></div>)}</div> : <EmptyState title="No invoices for this patient" action="Create invoice"/>}</CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Account summary</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="mt-1 text-2xl font-semibold">Rs. {total.toLocaleString()}</p><Button className="mt-5 w-full" size="sm"><IndianRupee className="mr-2 size-4"/>Record payment</Button><Button className="mt-2 w-full" variant="outline" size="sm"><FileText className="mr-2 size-4"/>New invoice</Button></CardContent></Card></div> }
function EmptyState({ title, action }: { title: string; action: string }) { return <div className="py-8 text-center"><p className="font-medium">{title}</p><Button size="sm" variant="outline" className="mt-3"><Plus className="mr-2 size-4"/>{action}</Button></div> }

function ClinicHeader({ center }: { center: string }) {
  const nutrition = center.toLowerCase().includes('nutrition')
  return <div><h3 className="font-display text-2xl font-semibold">{nutrition ? 'NEW YOU' : 'Ayurcare Center'}</h3>{nutrition && <p className="mt-1 text-sm font-medium text-primary">Lose Weight. Choose Health.</p>}<p className="mt-1 text-xs text-muted-foreground">{nutrition ? 'Centre for Professional Weight Management' : 'Jubilee Bazar'}<br/>Onden Road, Kannur - 670001, Kerala<br/>PH: 8111999581 / 8111999582</p></div>
}

function Documents({ patientMR }: { patientMR: string }) {
  const [documents, setDocuments] = useState<{ title: string; category: string; date: string; remarks: string; file?: File }[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Clinical report')
  const [file, setFile] = useState<File | null>(null)
  const add = () => {
    if (!title.trim()) return
    setDocuments((items) => [...items, { title, category, date: new Date().toLocaleDateString(), remarks: 'Uploaded by current staff', file: file || undefined }])
    setTitle(''); setFile(null)
  }
  return <Card className="rounded-lg shadow-sm"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Documents</CardTitle><CardDescription>Clinical reports, scans, images, and supporting records.</CardDescription></div></CardHeader><CardContent><div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_1fr]"><Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)}/><select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option>Clinical report</option><option>Lab report</option><option>Prescription</option><option>Identity document</option><option>Scanned report</option></select><div><Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]) }}/><p className="mt-1 text-xs text-muted-foreground">PDF, Images, Word</p></div></div><div className="flex justify-end"><Button size="sm" onClick={add} disabled={!title.trim()}><Upload className="mr-2 size-4"/>Upload document</Button></div>{documents.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-150 text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">File</th><th className="p-3 text-left">Uploaded</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{documents.map((document, index) => <tr key={`${document.title}-${index}`} className="border-b"><td className="p-3 font-medium">{document.title}</td><td className="p-3">{document.category}</td><td className="p-3">{document.file ? document.file.name : '—'}</td><td className="p-3">{document.date}</td><td className="p-3 text-right"><Button variant="ghost" size="sm">View</Button><Button variant="ghost" size="sm">Download</Button><Button variant="ghost" size="sm" onClick={() => setDocuments((items) => items.filter((_, i) => i !== index))}>Delete</Button></td></tr>)}</tbody></table></div> : <div className="mt-4 rounded-lg border border-dashed py-10 text-center"><FileText className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 font-medium">No documents added</p><p className="mt-1 text-sm text-muted-foreground">Add a title, select a category, choose a file, then upload.</p></div>}</CardContent></Card>
}

function openA4Print(title: string, patient: ExistingPatient | null, center: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  const nutrition = center.toLowerCase().includes('nutrition')
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const subtitle = nutrition ? 'Lose Weight. Choose Health. | Centre for Professional Weight Management' : 'Jubilee Bazar'
  const patientInfo = patient ? `<div class="patient"><div><b>Patient:</b> ${patient.name}</div><div><b>MR No:</b> ${patient.mr}</div><div><b>Age / Gender:</b> ${patient.age} / ${patient.gender}</div><div><b>DOB:</b> ${patient.dob || '—'}</div><div><b>Blood Group:</b> ${patient.bloodGroup || '—'}</div><div><b>Mobile:</b> ${patient.mobile}</div><div><b>Address:</b> ${patient.address || patient.city || '—'}</div><div><b>Date:</b> ${new Date().toLocaleDateString()}</div></div>` : '<div class="patient"><div><b>Patient:</b> ____________________</div><div><b>MR No:</b> ____________________</div><div><b>Age / Gender:</b> ____________________</div><div><b>Date:</b> ____________________</div></div>'
  printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}.section{margin-top:18px}.rule{border-bottom:1px solid #b8c7cc;height:34px}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left}.table th{background:#edf5f6}.signature{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:100px;text-align:center}.signature div{border-top:1px solid #17202a;padding-top:8px}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</div></header><div class="title">${title}</div>${patientInfo}<section class="section"><b>Diagnosis / Clinical Notes</b><div class="rule"></div><div class="rule"></div></section><section class="section"><b>${title.includes('Prescription') ? 'Medicines' : 'Clinical Examination'}</b><table class="table"><thead><tr><th>Item</th><th>Dosage / Finding</th><th>Frequency / Notes</th><th>Duration</th></tr></thead><tbody>${Array.from({length: 7}, () => '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('')}</tbody></table></section><section class="section"><b>Advice and Follow-up</b><div class="rule"></div><div class="rule"></div></section><div class="signature"><div>Doctor Signature</div><div>Dietitian Signature</div></div></body></html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
