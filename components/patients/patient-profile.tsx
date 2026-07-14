'use client'

import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import {
  ArrowLeft, CalendarDays, Check, Download, Eye, FileText, IndianRupee,
  Pencil, Plus, Printer, Stethoscope, Trash2, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type ExistingPatient } from '@/lib/registration-data'
import { mapApiPatient, readApiError, type ApiDocument, type ApiOPSheet, type ApiPatient, type ApiPrescription, type PatientRecord } from '@/lib/patient-api'
import { PatientProfileEditor } from './patient-profile-editor'

const measurements = ['Weight (kg)', 'Height (cm)', 'BMI', 'Body Fat (%)', 'Lean Mass (kg)', 'Waist (cm)', 'Hip (cm)', 'WHR', 'Muscle Mass (kg)', 'Water (%)', 'BMR (kcal)', 'Metabolic Age']
const measurementColumns = ['Baseline', '1 Month', '2 Months', '3 Months', 'Change']

function Field({ label, value, onChange, type = 'text', placeholder, error, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><Input value={value} type={type} inputMode={inputMode} aria-invalid={!!error} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <Card className="rounded-lg shadow-sm"><CardHeader className="border-b pb-4"><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</CardHeader><CardContent className="pt-5">{children}</CardContent></Card>
}
type PatientProfileProps = {
  patient: PatientRecord | null
  center: string
  generatedMR?: string
  justRegistered?: boolean
  onNewVisit?: () => void
}

async function fetchPatientProfile(mr: string): Promise<PatientRecord> {
  const response = await fetch(`/api/patients/${encodeURIComponent(mr)}`)
  if (!response.ok) throw new Error(await readApiError(response))
  const body = await response.json() as { patient: ApiPatient }
  return mapApiPatient(body.patient)
}

export function PatientProfile({ patient, center, generatedMR, justRegistered, onNewVisit }: PatientProfileProps) {
  const [loadedPatient, setLoadedPatient] = useState<PatientRecord | null>(patient)
  const [loading, setLoading] = useState(!patient && !!generatedMR)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (patient) {
      setLoadedPatient(patient)
      return
    }
    if (!generatedMR) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchPatientProfile(generatedMR)
      .then((record) => {
        if (!cancelled) setLoadedPatient(record)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load patient')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [generatedMR, patient])

  const p: PatientRecord = loadedPatient ?? { mr: generatedMR ?? 'MR-100618', name: 'New Patient', parentName: '', mobile: 'Not recorded', age: 0, gender: 'Not specified', bloodGroup: 'Not recorded', city: '', lastVisit: 'First visit', tags: [], visits: [], bills: [] }
  const print = () => openA4Print('Patient Details', p, center)
  const handleNewVisit = async () => {
    if (onNewVisit) {
      onNewVisit()
      return
    }
    setError('')
    const response = await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientMr: p.mr, doctor: p.apiVisits?.[0]?.doctor || undefined }) })
    if (!response.ok) {
      setError(await readApiError(response))
      return
    }
    setLoadedPatient(await fetchPatientProfile(p.mr))
  }
  if (loading) return <Card className="rounded-lg shadow-sm"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading patient profile...</CardContent></Card>
  if (error) return <Card className="rounded-lg shadow-sm"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
  if (editing) return <PatientProfileEditor patient={p} center={center} onCancel={() => setEditing(false)} onSaved={(updated) => { setLoadedPatient(updated); setEditing(false) }} />
   return <div className="grid gap-6 xl:grid-cols-[280px_1fr]"><aside><Card className="sticky top-20 rounded-lg shadow-sm"><CardContent className="p-5"><div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{p.name.split(' ').map((part) => part[0]).join('')}</div><h2 className="mt-4 font-display text-xl font-semibold">{p.name}</h2><p className="mt-1 text-sm text-muted-foreground">{p.mr}</p><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><Info label="Age / Gender" value={`${p.age || '-'} / ${p.gender}`}/><Info label="Blood group" value={p.bloodGroup}/><Info label="Phone" value={p.mobile}/><Info label="Last visit" value={p.lastVisit}/></dl><div className="mt-6 grid grid-cols-2 gap-2"><Button size="sm" onClick={handleNewVisit}><CalendarDays className="mr-2 size-4"/>New visit</Button><Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4"/>Edit</Button></div></CardContent></Card></aside><main>{justRegistered && <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="size-4"/></div><div><p className="text-sm font-semibold text-primary">Registration successful</p><p className="text-sm text-muted-foreground">{p.name} has been registered under {center}. MR number <span className="font-mono font-medium text-foreground">{p.mr}</span> has been issued.</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => openA4Print('Prescription', p, center)}><FileText className="mr-2 size-4"/>Generate blank prescription</Button><Button size="sm" variant="outline" onClick={() => openA4Print('OP Registration Sheet', p, center)}><Printer className="mr-2 size-4"/>Print OP sheet</Button></div></div>}<div className="mb-4 flex flex-wrap justify-between gap-2"><div><h2 className="font-display text-xl font-semibold">Patient profile</h2><p className="mt-1 text-sm text-muted-foreground">{center} · Active outpatient record</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={print}><Printer className="mr-2 size-4"/>Print</Button><Button variant="outline" size="sm" onClick={print}><Download className="mr-2 size-4"/>Export PDF</Button></div></div><Tabs defaultValue={justRegistered ? 'prescriptions' : 'overview'}><div className="overflow-x-auto"><TabsList className="h-10 bg-muted/70"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="visits">Visits</TabsTrigger><TabsTrigger value="op">OP Sheet</TabsTrigger><TabsTrigger value="prescriptions">Prescriptions</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList></div><TabsContent value="overview" className="mt-5"><Overview patient={p}/></TabsContent><TabsContent value="visits" className="mt-5"><Visits patient={p}/></TabsContent><TabsContent value="op" className="mt-5"><OPSheet patient={p} center={center}/></TabsContent><TabsContent value="prescriptions" className="mt-5"><Prescription patient={p} center={center}/></TabsContent><TabsContent value="documents" className="mt-5"><Documents patient={p}/></TabsContent></Tabs></main></div>
}function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={cn('text-right font-medium', strong && 'text-destructive')}>{value}</dd></div> }
function Overview({ patient }: { patient: PatientRecord }) { return <div className="grid gap-5 lg:grid-cols-2"><Section title="Clinical summary"><div className="space-y-4 text-sm"><Info label="Primary center" value={patient.consultationType === 'AYURCARE' ? 'Ayurcare Center' : 'Nutrition Center'}/><Info label="Allergies" value={patient.allergies || 'Not recorded'}/><Info label="Chronic conditions" value={patient.conditions || 'Not recorded'}/><Info label="Current medications" value={patient.medications || 'Not recorded'}/></div></Section><Section title="Care activity"><div className="grid grid-cols-3 gap-3"><Metric label="Visits" value={String(patient.visits.length)} /><Metric label="Prescriptions" value={String(patient.apiPrescriptions?.length ?? 0)} /><Metric label="Documents" value={String(patient.apiDocuments?.length ?? 0)} /></div></Section><div className="lg:col-span-2"><Visits patient={patient}/></div></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-3"><p className="text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div> }

/* ------------------------------------------------------------------ */
/*  Visit history â€” short ID, patient, date/time, doctor, department,   */
/*  reason and status, newest first (Requirement 3)                     */
/* ------------------------------------------------------------------ */

function Visits({ patient }: { patient: PatientRecord }) {
  const sorted = [...patient.visits].reverse()
  return <Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Visit history</CardTitle><CardDescription>Latest visit appears first. Click a row to open full visit details.</CardDescription></CardHeader><CardContent>{sorted.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Patient</th><th className="p-3 font-medium">Date & time</th><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Reason</th><th className="p-3 font-medium">Status</th></tr></thead><tbody>{sorted.map((visit, index) => <tr className={cn('border-b cursor-pointer hover:bg-muted/40', index === 0 && 'bg-primary/5')} key={visit.id}><td className="p-3 font-mono text-xs font-medium">{visit.id}</td><td className="p-3">{patient.name}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.center}</td><td className="p-3">{visit.reason}</td><td className="p-3"><StatusBadge status={index === 0 ? 'Active' : 'Completed'}/></td></tr>)}</tbody></table></div> : <EmptyState title="No visits recorded" action="Create first visit"/>}</CardContent></Card>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Active' ? 'bg-primary/10 text-primary' : status === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', tone)}>{status}</span>
}

/* ------------------------------------------------------------------ */
/*  OP Sheet module â€” empty state, list with actions, create/edit form  */
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

function formatRecordDate(value?: string | null) {
  if (!value) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapOPSheetRecord(sheet: ApiOPSheet, center: string): OPSheetRecord {
  return {
    id: sheet.id,
    visitId: sheet.visitId,
    date: formatRecordDate(sheet.createdAt),
    doctor: sheet.visit?.doctor || 'Not yet assigned',
    department: center,
    status: sheet.status || 'Completed',
    clinicalNotes: sheet.clinicalExamination || '',
    investigations: sheet.symptoms || '',
    treatmentPlan: sheet.diagnosis || '',
    measurementValues: parseJson<Record<string, string[]>>(sheet.vitals, {}),
  }
}

function OPSheet({ patient, center }: { patient: PatientRecord; center: string }) {
  const [records, setRecords] = useState<OPSheetRecord[]>(() => (patient.apiOPSheets ?? []).map((sheet) => mapOPSheetRecord(sheet, center)))
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const latestVisit = patient.visits[patient.visits.length - 1]
  const editing = records.find((r) => r.id === activeId) ?? null

  const openNew = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openView = (id: string) => { setActiveId(id); setViewOnly(true); setMode('edit') }
  const openEdit = (id: string) => { setActiveId(id); setViewOnly(false); setMode('edit') }

  const handleSaveRecord = async (record: OPSheetRecord) => {
    const existing = records.some((r) => r.id === record.id)
    if (!existing) {
      const response = await fetch('/api/op-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMr: patient.mr,
          visitId: record.visitId,
          clinicalExamination: record.clinicalNotes,
          vitals: JSON.stringify(record.measurementValues),
          diagnosis: record.treatmentPlan,
          symptoms: record.investigations,
        }),
      })
      if (response.ok) {
        const body = await response.json() as { sheet: ApiOPSheet }
        setRecords((current) => [mapOPSheetRecord(body.sheet, center), ...current])
        setMode('list')
        return
      }
    }
    setRecords((current) => existing ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current])
    setMode('list')
  }

  const printRecord = (record: OPSheetRecord) => openA4Print('OP Registration Sheet', patient, center, buildOPPrintContent(record))

  if (mode === 'edit') {
    return <OPSheetEditor
      patient={patient}
      center={center}
      record={editing ?? { id: `OP-${Date.now().toString(36).toUpperCase()}`, visitId: latestVisit?.id ?? 'â€”', date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), doctor: latestVisit?.doctor ?? 'Not yet assigned', department: center, status: 'Draft', clinicalNotes: '', investigations: '', treatmentPlan: '', measurementValues: {} }}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-display text-xl font-semibold">OP Sheets</h3><p className="text-sm text-muted-foreground">{patient.name} Â· {patient.mr}</p></div>
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
      <div><h3 className="font-display text-xl font-semibold">{readOnly ? 'View OP Sheet' : 'Out Patient Registration Sheet'}</h3><p className="text-sm text-muted-foreground">{patient.name} Â· {patient.mr} Â· Visit {record.visitId}</p></div>
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
/*  Prescription module â€” empty state, list with actions, create/edit   */
/* ------------------------------------------------------------------ */

type MedicineRow = { id: string; medicine: string; dosage: string; frequency: string; duration: string; instructions: string }
type PrescriptionRecord = {
  id: string
  visitId: string
  opSheetId?: string
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

function mapPrescriptionRecord(prescription: ApiPrescription, center: string): PrescriptionRecord {
  return {
    id: prescription.id,
    visitId: prescription.opSheet?.visitId || '—',
    opSheetId: prescription.opSheetId,
    date: formatRecordDate(prescription.createdAt),
    doctor: prescription.opSheet?.visit?.doctor || 'Not yet assigned',
    department: center,
    status: 'Completed',
    diagnosis: prescription.diagnosis || '',
    medicines: parseJson<MedicineRow[]>(prescription.medicines, blankMedicineRows()),
    advice: prescription.advice || '',
    followUp: prescription.followUp || '',
  }
}

function Prescription({ patient, center }: { patient: PatientRecord; center: string }) {
  const [records, setRecords] = useState<PrescriptionRecord[]>(() => (patient.apiPrescriptions ?? []).map((prescription) => mapPrescriptionRecord(prescription, center)))
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const latestVisit = patient.visits[patient.visits.length - 1]
  const editing = records.find((r) => r.id === activeId) ?? null

  const openNew = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openBlank = () => { setActiveId(null); setViewOnly(false); setMode('edit') }
  const openView = (id: string) => { setActiveId(id); setViewOnly(true); setMode('edit') }
  const openEdit = (id: string) => { setActiveId(id); setViewOnly(false); setMode('edit') }

  const handleSaveRecord = async (record: PrescriptionRecord) => {
    const existing = records.some((r) => r.id === record.id)
    const opSheetId = record.opSheetId || patient.apiOPSheets?.[0]?.id
    if (!existing && opSheetId) {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMr: patient.mr,
          opSheetId,
          diagnosis: record.diagnosis,
          medicines: JSON.stringify(record.medicines),
          advice: record.advice,
          followUp: record.followUp,
        }),
      })
      if (response.ok) {
        const body = await response.json() as { prescription: ApiPrescription }
        setRecords((current) => [mapPrescriptionRecord(body.prescription, center), ...current])
        setMode('list')
        return
      }
    }
    setRecords((current) => existing ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current])
    setMode('list')
  }

  const printRecord = (record: PrescriptionRecord) => openA4Print('Prescription', patient, center, buildPrescriptionPrintContent(record))

  if (mode === 'edit') {
    return <PrescriptionEditor
      patient={patient}
      center={center}
      record={editing ?? { id: `RX-${Date.now().toString(36).toUpperCase()}`, visitId: latestVisit?.id ?? '—', opSheetId: patient.apiOPSheets?.[0]?.id, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), doctor: latestVisit?.doctor ?? 'Not yet assigned', department: center, status: 'Draft', diagnosis: '', medicines: blankMedicineRows(), advice: '', followUp: '' }}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-display text-xl font-semibold">Prescriptions</h3><p className="text-sm text-muted-foreground">{patient.name} Â· {patient.mr}</p></div>
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

function Bills({ patient }: { patient: ExistingPatient }) { const total = patient.bills.reduce((sum, bill) => sum + bill.amount, 0); return <div className="grid gap-5 lg:grid-cols-[1fr_280px]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>{patient.bills.length ? <div className="space-y-3">{patient.bills.map((bill) => <div className="flex items-center justify-between rounded-lg border p-4" key={bill.id}><div><p className="font-medium">{bill.id}</p><p className="mt-1 text-xs text-muted-foreground">{bill.date} Â· {bill.service}</p></div><div className="text-right"><p className="font-semibold">Rs. {bill.amount.toLocaleString()}</p><p className="mt-1 text-xs text-destructive">{bill.status}</p></div></div>)}</div> : <EmptyState title="No invoices for this patient" action="Create invoice"/>}</CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Account summary</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="mt-1 text-2xl font-semibold">Rs. {total.toLocaleString()}</p><Button className="mt-5 w-full" size="sm"><IndianRupee className="mr-2 size-4"/>Record payment</Button><Button className="mt-2 w-full" variant="outline" size="sm"><FileText className="mr-2 size-4"/>New invoice</Button></CardContent></Card></div> }
function EmptyState({ title, action }: { title: string; action: string }) { return <div className="py-8 text-center"><p className="font-medium">{title}</p><Button size="sm" variant="outline" className="mt-3"><Plus className="mr-2 size-4"/>{action}</Button></div> }

function ClinicHeader({ center }: { center: string }) {
  const nutrition = center.toLowerCase().includes('nutrition')
  return <div><h3 className="font-display text-2xl font-semibold">{nutrition ? 'NEW YOU' : 'Ayurcare Center'}</h3>{nutrition && <p className="mt-1 text-sm font-medium text-primary">Lose Weight. Choose Health.</p>}<p className="mt-1 text-xs text-muted-foreground">{nutrition ? 'Centre for Professional Weight Management' : 'Jubilee Bazar'}<br/>Onden Road, Kannur - 670001, Kerala<br/>PH: 8111999581 / 8111999582</p></div>
}

/* ------------------------------------------------------------------ */
/*  Medical Documents module â€” upload metadata, patient-aware list,     */
/*  print/export/delete-with-confirmation (Medical Documents Module)    */
/* ------------------------------------------------------------------ */

type PatientDocument = {
  id?: string
  title: string
  category: string
  fileName: string
  filePath: string
  date: string
  uploadedBy: string
  notes: string
}

function mapPatientDocument(doc: ApiDocument): PatientDocument {
  return {
    id: doc.id,
    title: doc.title || doc.fileName,
    category: doc.category || 'Clinical report',
    fileName: doc.fileName,
    filePath: doc.filePath,
    date: formatRecordDate(doc.uploadedAt),
    uploadedBy: doc.uploadedBy || 'Reception desk',
    notes: doc.remarks || '',
  }
}

function Documents({ patient }: { patient: PatientRecord }) {
  const [documents, setDocuments] = useState<PatientDocument[]>(() => (patient.apiDocuments ?? []).map(mapPatientDocument))
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Clinical report')
  const [uploadedBy, setUploadedBy] = useState('')
  const [notes, setNotes] = useState('')

  const add = async () => {
    if (!title.trim()) return
    const response = await fetch(`/api/patients/${encodeURIComponent(patient.mr)}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category,
        fileName: title,
        filePath: `metadata://${patient.mr}/${encodeURIComponent(title)}`,
        fileType: 'metadata',
        uploadedBy: uploadedBy.trim() || 'Reception desk',
        remarks: notes,
      }),
    })
    if (response.ok) {
      const body = await response.json() as { document: ApiDocument }
      setDocuments((items) => [mapPatientDocument(body.document), ...items])
    } else {
      setDocuments((items) => [{ title, category, fileName: title, filePath: '', date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), uploadedBy: uploadedBy.trim() || 'Reception desk', notes }, ...items])
    }
    setTitle('')
    setNotes('')
  }

  const remove = async (index: number) => {
    const doc = documents[index]
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    if (doc.id) {
      await fetch(`/api/patients/${encodeURIComponent(patient.mr)}/documents`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: doc.id }) })
    }
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
