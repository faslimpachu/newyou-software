'use client'

import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, Circle, Download, Eye, FileText, IndianRupee,
  Pencil, Plus, Printer, Stethoscope, Trash2, Upload, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type ExistingPatient, centerOptions, type ConsultationCenter, doctorsFor } from '@/lib/registration-data'
import { mapApiPatient, readApiError, type ApiFollowUp, type ApiOPSheet, type ApiPatient, type ApiPrescription, type PatientRecord } from '@/lib/patient-api'
import { PatientProfileEditor } from './patient-profile-editor'

const measurements = ['Weight (kg)', 'Height (cm)', 'BMI', 'Body Fat (%)', 'Lean Mass (kg)', 'Waist (cm)', 'Hip (cm)', 'WHR', 'Muscle Mass (kg)', 'Water (%)', 'BMR (kcal)', 'Metabolic Age']
const measurementColumns = ['Baseline', '1 Month', '2 Months', '3 Months', 'Change']

function Field({ label, value, onChange, type = 'text', placeholder, error, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><Input value={value} type={type} inputMode={inputMode} aria-label={label} aria-invalid={!!error} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
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
  const [newVisitDialog, setNewVisitDialog] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<ConsultationCenter | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
  const handleNewVisit = async () => {
    if (onNewVisit) {
      onNewVisit()
      return
    }
    setSelectedCenter(null)
    setSelectedDoctor('')
    setError('')
    setNewVisitDialog(true)
  }

  const handleCreateVisit = async () => {
    if (!selectedCenter || !selectedDoctor) return
    setSubmitting(true)
    setError('')
    setNewVisitDialog(false)
    const centerName = centerOptions.find((option) => option.id === selectedCenter)?.name ?? selectedCenter
    try {
      const response = await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientMr: p.mr, doctor: selectedDoctor, center: centerName }) })
      if (!response.ok) {
        const err = await readApiError(response)
        setError(err)
        setSubmitting(false)
        return
      }
      setLoadedPatient(await fetchPatientProfile(p.mr))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create visit'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }
  const handleUpdateStatus = async (visitId: string, status: string) => {
    setError('')
    const response = await fetch(`/api/visits/${encodeURIComponent(visitId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      setError(await readApiError(response))
      return
    }
    setLoadedPatient(await fetchPatientProfile(p.mr))
  }
  const refreshPatient = async () => {
    setLoadedPatient(await fetchPatientProfile(p.mr))
  }
  if (loading) return <Card className="rounded-lg shadow-sm"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading patient profile...</CardContent></Card>
  if (error) return <Card className="rounded-lg shadow-sm"><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
  if (editing) return <PatientProfileEditor patient={p} center={center} onCancel={() => setEditing(false)} onSaved={(updated) => { setLoadedPatient(updated); setEditing(false) }} />
  return <>
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]"><aside><Card className="sticky top-20 rounded-lg shadow-sm"><CardContent className="p-5"><div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{p.name.split(' ').map((part) => part[0]).join('')}</div><h2 className="mt-4 font-display text-xl font-semibold">{p.name}</h2><p className="mt-1 text-sm text-muted-foreground">{p.mr}</p><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><Info label="Age / Gender" value={`${p.age || '-'} / ${p.gender}`} /><Info label="Blood group" value={p.bloodGroup} /><Info label="Phone" value={p.mobile} /><Info label="Last visit" value={p.lastVisit} /></dl><div className="mt-6 grid grid-cols-2 gap-2"><Button size="sm" onClick={handleNewVisit}><CalendarDays className="mr-2 size-4" />New visit</Button><Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4" />Edit</Button></div></CardContent></Card></aside><main><div className="mb-4 flex flex-wrap justify-between gap-2"><div><h2 className="font-display text-xl font-semibold">Patient profile</h2><p className="mt-1 text-sm text-muted-foreground">{center} ? Active outpatient record</p></div></div><Tabs defaultValue={justRegistered ? 'prescriptions' : 'overview'}><div className="overflow-x-auto"><TabsList className="h-10 bg-muted/70"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="visits">Visits</TabsTrigger><TabsTrigger value="op">OP Sheet</TabsTrigger><TabsTrigger value="prescriptions">Prescriptions</TabsTrigger><TabsTrigger value="follow-ups">Follow-ups</TabsTrigger></TabsList></div><TabsContent value="overview" className="mt-5"><Overview patient={p} onUpdateStatus={handleUpdateStatus} /></TabsContent><TabsContent value="visits" className="mt-5"><Visits patient={p} onUpdateStatus={handleUpdateStatus} /></TabsContent><TabsContent value="op" className="mt-5"><OPSheet patient={p} center={center} onRefresh={refreshPatient} onUpdateStatus={handleUpdateStatus} /></TabsContent><TabsContent value="prescriptions" className="mt-5"><Prescription patient={p} center={center} onRefresh={refreshPatient} /></TabsContent><TabsContent value="follow-ups" className="mt-5"><FollowUps patient={p} onRefresh={refreshPatient} /></TabsContent></Tabs></main></div>
    {newVisitDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
        <Card className="w-full max-w-md rounded-lg shadow-xl">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>New Visit</CardTitle>
              <CardDescription>Select center and doctor for this visit.</CardDescription>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setNewVisitDialog(false)} aria-label="Close dialog">
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground" htmlFor="new-visit-center">Center *</Label>
              <select
                id="new-visit-center"
                value={selectedCenter ?? ''}
                onChange={(e) => { const v = e.target.value as ConsultationCenter; setSelectedCenter(v); setSelectedDoctor('') }}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">Select center</option>
                {centerOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground" htmlFor="new-visit-doctor">Doctor *</Label>
              <select
                id="new-visit-doctor"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={!selectedCenter}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm disabled:opacity-50"
              >
                <option value="">Select doctor</option>
                {doctorsFor(selectedCenter).map((doc) => (
                  <option key={doc.id} value={doc.name}>{doc.name} - {doc.qualification}</option>
                ))}
              </select>
              {!selectedCenter && <p className="text-xs text-muted-foreground">Select a center first to see available doctors.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setNewVisitDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateVisit} disabled={!selectedCenter || !selectedDoctor || submitting}>Create Visit</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </>
} function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"><dt className="text-muted-foreground">{label}</dt><dd className={cn('text-sm font-medium text-foreground sm:text-right', strong && 'text-destructive')}>{value}</dd></div> }
function Overview({ patient, onUpdateStatus }: { patient: PatientRecord; onUpdateStatus?: (visitId: string, status: string) => void }) {
  const latestVisit = patient.visits[0]
  const primaryCenter = patient.consultationType === 'AYURCARE' ? 'Ayurcare Center' : 'Nutrition Center'
  return <div className="grid gap-5 lg:grid-cols-2">
    <Section title="Care activity"><div className="grid grid-cols-3 gap-3"><Metric label="Visits" value={String(patient.visits.length)} /><Metric label="Prescriptions" value={String(patient.apiPrescriptions?.length ?? 0)} /></div></Section>
    <Section title="Lifestyle"><div className="grid gap-4 sm:grid-cols-2">
      <Info label="Smoking" value={patient.smoking || 'Not recorded'} />
      <Info label="Alcohol" value={patient.alcohol || 'Not recorded'} />
      <Info label="Exercise" value={patient.exercise || 'Not recorded'} />
      <Info label="Diet" value={patient.diet || 'Not recorded'} />
    </div></Section>
    <Section title="Patient Information"><div className="grid gap-4">
      <div className="space-y-4 text-sm">
        <Info label="Full name" value={patient.name} strong />
        <Info label="MR Number" value={patient.mr} strong />
        <Info label="Age / Gender" value={`${patient.age || '-'} / ${patient.gender}`} />
        <Info label="Blood group" value={patient.bloodGroup || 'Not recorded'} />
        <Info label="Phone" value={patient.mobile} />
        <Info label="Email" value={patient.email || 'Not recorded'} />
      </div>
      <div className="space-y-4 text-sm">
        <Info label="Primary center" value={primaryCenter} />
        <Info label="Address" value={patient.address || 'Not recorded'} />
        <Info label="District" value={patient.city || 'Not recorded'} />
        <Info label="State" value={patient.state || 'Not recorded'} />
        <Info label="PIN code" value={patient.postalCode || 'Not recorded'} />
        <Info label="Last visit" value={latestVisit ? `${latestVisit.date}` : 'Not recorded'} />
      </div>
    </div></Section>
    <Section title="Medical Information"><div className="grid gap-4">
      <div className="space-y-4 text-sm">
        <Info label="Allergies" value={patient.allergies || 'Not recorded'} />
        <Info label="Chronic conditions" value={patient.conditions || 'Not recorded'} />
        <Info label="Current medications" value={patient.medications || 'Not recorded'} />
      </div>
      <div className="space-y-4 text-sm">
        <Info label="Emergency contact" value={patient.emergencyName || 'Not recorded'} />
        <Info label="Emergency phone" value={patient.emergencyPhone || 'Not recorded'} />
        <Info label="Relationship" value={patient.emergencyRelation || 'Not recorded'} />
      </div>
    </div></Section>
  </div>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-3"><p className="text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div> }

/* ------------------------------------------------------------------ */
/*  Visit history � short ID, patient, date/time, doctor, department,   */
/*  reason and status, newest first (Requirement 3)                     */
/* ------------------------------------------------------------------ */

function Visits({ patient, onUpdateStatus }: { patient: PatientRecord; onUpdateStatus?: (visitId: string, status: string) => void }) {
  const sorted = [...patient.visits]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')

  const startEdit = (visitId: string, status: string) => {
    setEditingId(visitId)
    setEditStatus(status)
  }

  const saveStatus = async (visitId: string) => {
    if (!onUpdateStatus || !editStatus.trim()) return
    setEditingId(null)
    await onUpdateStatus(visitId, editStatus.trim())
  }

  return <Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Visit history</CardTitle><CardDescription>Latest visit appears first. Click a row to open full visit details.</CardDescription></CardHeader><CardContent>{sorted.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Date & time</th><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">Status</th></tr></thead><tbody>{sorted.map((visit, index) => <tr className={cn('border-b hover:bg-muted/40', index === 0 && 'bg-primary/5')} key={visit.id}><td className="p-3 font-mono text-xs">{visit.id}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.center}</td><td className="p-3">                {editingId === visit.id ? <div className="flex items-center gap-2"><select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} aria-label="Status" className="h-7 rounded-md border border-input bg-background px-2 text-xs"><option value="Waiting">Waiting</option><option value="Active">Active</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select><Button size="icon-sm" onClick={() => saveStatus(visit.id)} aria-label="Save status"><Check className="size-3.5" /></Button></div> : <div className="flex items-center gap-2"><StatusBadge status={visit.reason} /><Button size="icon-sm" variant="ghost" onClick={() => startEdit(visit.id, visit.reason)} aria-label="Edit status"><Pencil className="size-3.5" /></Button></div>}</td></tr>)}</tbody></table></div> : <EmptyState title="No visits recorded" action="Create first visit" />}</CardContent></Card>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Active' ? 'bg-primary/10 text-primary' : status === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', tone)}>{status}</span>
}

/* ------------------------------------------------------------------ */
/*  OP Sheet module � empty state, list with actions, create/edit form  */
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

function OPSheet({ patient, center, onRefresh, onUpdateStatus }: { patient: PatientRecord; center: string; onRefresh?: () => void; onUpdateStatus?: (visitId: string, status: string) => void }) {
  const [records, setRecords] = useState<OPSheetRecord[]>(() => (patient.apiOPSheets ?? []).map((sheet) => mapOPSheetRecord(sheet, center)))

  useEffect(() => {
    setRecords((patient.apiOPSheets ?? []).map((sheet) => mapOPSheetRecord(sheet, center)))
  }, [patient.apiOPSheets, center])

  const opSheetsByVisitId = useMemo(() => {
    const map = new Map<string, OPSheetRecord>()
    records.forEach((record) => map.set(record.visitId, record))
    return map
  }, [records])

  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const editingRecord = activeVisitId ? opSheetsByVisitId.get(activeVisitId) ?? null : null

  const openCreate = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(false)
    setMode('edit')
  }

  const openView = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(true)
    setMode('edit')
  }

  const openEdit = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(false)
    setMode('edit')
  }

  const openBlank = (visitId: string) => {
    const visit = getVisit(visitId)
    const sheetCenter = visit?.center || center
    openBlankA4Print(sheetCenter, patient)
  }

  const handleSaveRecord = async (record: OPSheetRecord) => {
    const existing = opSheetsByVisitId.get(record.visitId)
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
        onRefresh?.()
        onUpdateStatus?.(record.visitId, 'Active')
        return
      }
    }
    setRecords((current) => existing ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current])
    setMode('list')
  }

  const printRecord = (record: OPSheetRecord) => openA4Print('OP Registration Sheet', patient, getVisit(record.visitId)?.center || center, buildOPPrintContent(record))

  const getVisit = (visitId: string) => patient.visits.find((v) => v.id === visitId)

  if (mode === 'edit') {
    const visit = activeVisitId ? getVisit(activeVisitId) : undefined
    const blankRecord: OPSheetRecord = {
      id: editingRecord?.id ?? `OP-${Date.now().toString(36).toUpperCase()}`,
      visitId: activeVisitId ?? visit?.id ?? '?',
      date: visit?.date ?? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: visit?.doctor ?? 'Not yet assigned',
      department: center,
      status: editingRecord?.status ?? 'Draft',
      clinicalNotes: editingRecord?.clinicalNotes ?? '',
      investigations: editingRecord?.investigations ?? '',
      treatmentPlan: editingRecord?.treatmentPlan ?? '',
      measurementValues: editingRecord?.measurementValues ?? {},
    }
    return <OPSheetEditor
      patient={patient}
      center={center}
      record={blankRecord}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  const sortedVisits = [...patient.visits]

  return <div className="space-y-4">
    <div>
      <h3 className="font-display text-xl font-semibold">OP Sheets</h3>
      <p className="text-sm text-muted-foreground">{patient.name} ? {patient.mr}</p>
    </div>
    {sortedVisits.length === 0
      ? <Card className="rounded-lg shadow-sm"><CardContent className="py-14 text-center"><FileText className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 font-medium">No visits recorded for this patient.</p></CardContent></Card>
      : <Card className="rounded-lg shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Visit Date</th><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">OP Sheet</th><th className="p-3 font-medium text-right">Actions</th></tr></thead><tbody>{sortedVisits.map((visit) => {
        const opRecord = opSheetsByVisitId.get(visit.id)
        return <tr className="border-b" key={visit.id}><td className="p-3 font-mono text-xs">{visit.id}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.center}</td><td className="p-3">{opRecord ? <><CheckCircle2 className="mr-1 size-4 text-green-400" /><span className="text-green-400 text-xs font-medium">Created</span></> : <><Circle className="mr-1 size-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">Not Created</span></>}</td><td className="p-3"><div className="flex justify-end gap-1">{opRecord ? <><Button variant="ghost" size="sm" onClick={() => openView(visit.id)}><Eye className="mr-1 size-3.5" />View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(visit.id)}><Pencil className="mr-1 size-3.5" />Edit</Button><Button variant="ghost" size="sm" onClick={() => printRecord(opRecord)}><Printer className="mr-1 size-3.5" />Print</Button></> : <Button size="sm" onClick={() => openCreate(visit.id)}><Plus className="mr-1 size-3.5" />Create OP Sheet</Button>}<Button variant="ghost" size="sm" onClick={() => openBlank(visit.id)}><FileText className="mr-1 size-3.5" />Blank OP Sheet</Button></div></td></tr>
      }
      )}</tbody></table></div></CardContent></Card>}
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
  const doPrint = () => openA4Print('OP Registration Sheet', patient, patient.visits.find((v) => v.id === record.visitId)?.center || center, buildOPPrintContent(currentRecord()))
  const handleSave = () => onSave({ ...currentRecord(), status: status === 'Draft' ? 'Completed' : status })

  return <div className="print-sheet space-y-5">
    <div className="flex items-start justify-between border-b-2 border-primary pb-5">
      <div>
        <ClinicHeader center={patient.visits.find((v) => v.id === record.visitId)?.center || center} />
        {/* <h3 className="font-display mt-4 text-xl font-semibold">{readOnly ? 'View OP Sheet' : 'Out Patient Registration Sheet'}</h3> */}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="mr-2 size-4" />Back to list</Button>
        <Button variant="outline" size="sm" onClick={doPrint}><Printer className="mr-2 size-4" />Print</Button>
        {!readOnly && <Button size="sm" onClick={handleSave}><Check className="mr-2 size-4" />Save</Button>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 py-5 text-sm">
      <p><b>Patient:</b> {patient.name}</p>
      <p><b>MR No:</b> {patient.mr}</p>
      <p><b>Age / Sex:</b> {patient.age} / {patient.gender}</p>
      <p><b>Date:</b> {record.date}</p>
      {/* <p className="md:col-span-2"><b>Visit:</b> {record.visitId}</p> */}
    </div>
    <Section title="Clinical examination" description="Detailed clinical notes">
      <Textarea className="min-h-64 resize-y" disabled={readOnly} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Document clinical examination findings, assessment and observations..." />
    </Section>
    <Section title="Baseline measurements" description="Record and compare treatment progress">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground"><tr>{['Measurement', ...measurementColumns].map((x) => <th className="p-2 text-left font-medium" key={x}>{x}</th>)}</tr></thead>
          <tbody>{measurements.map((measurement) => <tr className="border-b" key={measurement}>
            <td className="p-2 font-medium">{measurement}</td>
            {measurementColumns.map((_, i) => <td className="p-1.5" key={i}>
              <Input className="h-7 min-w-24" disabled={readOnly} aria-label={`${measurement} ${measurementColumns[i]}`} value={measurementValues[measurement]?.[i] ?? ''} onChange={(e) => setMeasurement(measurement, i, e.target.value)} />
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </Section>
    <div className="grid gap-5 md:grid-cols-2">
      <Section title="Investigations"><Textarea disabled={readOnly} placeholder="Test, finding and date" className="min-h-28" value={investigations} onChange={(e) => setInvestigations(e.target.value)} /></Section>
      <Section title="Treatment plan & follow-up"><Textarea disabled={readOnly} placeholder="Plan, advice and next review date" className="min-h-28" value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} /></Section>
    </div>
  </div>
}

/* ------------------------------------------------------------------ */
/*  Prescription module � empty state, list with actions, create/edit   */
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
    visitId: prescription.visitId,
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

function Prescription({ patient, center, onRefresh }: { patient: PatientRecord; center: string; onRefresh?: () => void }) {
  const [records, setRecords] = useState<PrescriptionRecord[]>(() => (patient.apiPrescriptions ?? []).map((prescription) => mapPrescriptionRecord(prescription, center)))

  useEffect(() => {
    setRecords((patient.apiPrescriptions ?? []).map((prescription) => mapPrescriptionRecord(prescription, center)))
  }, [patient.apiPrescriptions, center])

  const prescriptionsByVisitId = ((patient.apiPrescriptions ?? []) as ApiPrescription[]).reduce<Map<string, PrescriptionRecord>>((acc, prescription) => {
    const record = mapPrescriptionRecord(prescription, center)
    acc.set(record.visitId, record)
    return acc
  }, new Map<string, PrescriptionRecord>())

  const opSheetsByVisitId = ((patient.apiOPSheets ?? []) as ApiOPSheet[]).reduce<Map<string, ApiOPSheet>>((acc, sheet) => {
    acc.set(sheet.visitId, sheet)
    return acc
  }, new Map<string, ApiOPSheet>())

  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  const editingRecord = activeVisitId ? prescriptionsByVisitId.get(activeVisitId) ?? null : null

  const openCreate = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(false)
    setMode('edit')
  }

  const openView = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(true)
    setMode('edit')
  }

  const openEdit = (visitId: string) => {
    setActiveVisitId(visitId)
    setViewOnly(false)
    setMode('edit')
  }

  const openBlank = (visitId: string) => {
    const visit = getVisit(visitId)
    const sheetCenter = visit?.center || center
    openBlankPrescriptionA4Print(sheetCenter, patient)
  }

  const handleSaveRecord = async (record: PrescriptionRecord) => {
    const existing = prescriptionsByVisitId.get(record.visitId)
    if (!existing) {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMr: patient.mr,
          visitId: record.visitId,
          opSheetId: record.opSheetId || patient.apiOPSheets?.find((s) => s.visitId === record.visitId)?.id,
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
        onRefresh?.()
        return
      }
    }
    setRecords((current) => existing ? current.map((r) => (r.id === record.id ? record : r)) : [record, ...current])
    setMode('list')
    onRefresh?.()
  }

  const printRecord = (record: PrescriptionRecord) => openA4Print('Prescription', patient, getVisit(record.visitId)?.center || center, buildPrescriptionPrintContent(record))

  const getVisit = (visitId: string) => patient.visits.find((v) => v.id === visitId)

  if (mode === 'edit') {
    const visit = activeVisitId ? getVisit(activeVisitId) : undefined
    const blankRecord: PrescriptionRecord = {
      id: editingRecord?.id ?? `RX-${Date.now().toString(36).toUpperCase()}`,
      visitId: activeVisitId ?? visit?.id ?? '?',
      opSheetId: editingRecord?.opSheetId ?? patient.apiOPSheets?.find((s) => s.visitId === (activeVisitId ?? visit?.id))?.id,
      date: visit?.date ?? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: visit?.doctor ?? 'Not yet assigned',
      department: center,
      status: editingRecord?.status ?? 'Draft',
      diagnosis: editingRecord?.diagnosis ?? '',
      medicines: editingRecord?.medicines ?? blankMedicineRows(),
      advice: editingRecord?.advice ?? '',
      followUp: editingRecord?.followUp ?? '',
    }
    return <PrescriptionEditor
      patient={patient}
      center={center}
      record={blankRecord}
      readOnly={viewOnly}
      onCancel={() => setMode('list')}
      onSave={handleSaveRecord}
    />
  }

  const sortedVisits = [...patient.visits]

  return <div className="space-y-4">
    <div>
      <h3 className="font-display text-xl font-semibold">Prescriptions</h3>
      <p className="text-sm text-muted-foreground">{patient.name} ? {patient.mr}</p>
    </div>
    {sortedVisits.length === 0
      ? <Card className="rounded-lg shadow-sm"><CardContent className="py-14 text-center"><Stethoscope className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 font-medium">No visits recorded for this patient.</p></CardContent></Card>
      : <Card className="rounded-lg shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Visit ID</th><th className="p-3 font-medium">Visit Date</th><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium">Department</th><th className="p-3 font-medium">OP Sheet</th><th className="p-3 font-medium">Prescription</th><th className="p-3 font-medium text-right">Actions</th></tr></thead><tbody>{sortedVisits.map((visit) => {
        const opSheet = opSheetsByVisitId.get(visit.id)
        const prescription = prescriptionsByVisitId.get(visit.id)
        return <tr className="border-b" key={visit.id}><td className="p-3 font-mono text-xs">{visit.id}</td><td className="p-3">{visit.date}</td><td className="p-3">{visit.doctor}</td><td className="p-3">{visit.center}</td><td className="p-3">{opSheet ? <><CheckCircle2 className="mr-1 size-4 text-green-400" /><span className="text-green-400 text-xs font-medium">Created</span></> : <><Circle className="mr-1 size-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">Not Created</span></>}</td><td className="p-3">{prescription ? <><CheckCircle2 className="mr-1 size-4 text-green-400" /><span className="text-green-400 text-xs font-medium">Created</span></> : <><Circle className="mr-1 size-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">Not Created</span></>}</td><td className="p-3"><div className="flex justify-end gap-1">{prescription ? <><Button variant="ghost" size="sm" onClick={() => openView(visit.id)}><Eye className="mr-1 size-3.5" />View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(visit.id)}><Pencil className="mr-1 size-3.5" />Edit</Button><Button variant="ghost" size="sm" onClick={() => printRecord(prescription)}><Printer className="mr-1 size-3.5" />Print</Button></> : <Button size="sm" onClick={() => openCreate(visit.id)}><Plus className="mr-1 size-3.5" />Create Prescription</Button>}<Button variant="ghost" size="sm" onClick={() => openBlank(visit.id)}><FileText className="mr-1 size-3.5" />Blank Prescription</Button></div></td></tr>
      }
      )}</tbody></table></div></CardContent></Card>}
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
  const doPrint = () => openA4Print('Prescription', patient, patient.visits.find((v) => v.id === record.visitId)?.center || center, buildPrescriptionPrintContent(currentRecord()))
  const doBlank = () => openA4Print('Prescription', patient, patient.visits.find((v) => v.id === record.visitId)?.center || center)
  const handleSave = () => onSave({ ...currentRecord(), status: status === 'Draft' ? 'Completed' : status })

  return <div className="print-sheet">
    <div className="flex items-start justify-between border-b-2 border-primary pb-5">
      <ClinicHeader center={patient.visits.find((v) => v.id === record.visitId)?.center || center} />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="mr-2 size-4" />Back to list</Button>
        <Button variant="outline" size="sm" onClick={doPrint}><Printer className="mr-2 size-4" />Print</Button>
        <Button variant="outline" size="sm" onClick={doBlank}><FileText className="mr-2 size-4" />Blank sheet</Button>
        {!readOnly && <Button size="sm" onClick={handleSave}><Check className="mr-2 size-4" />Save</Button>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 py-5 text-sm">
      <p><b>Patient:</b> {patient.name}</p>
      <p><b>MR No:</b> {patient.mr}</p>
      <p><b>Age / Sex:</b> {patient.age} / {patient.gender}</p>
      <p><b>Date:</b> {record.date}</p>
    </div>
    <Section title="Diagnosis"><Textarea disabled={readOnly} placeholder="Clinical diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Section>
    <div className="mt-5">
      <Section title="Prescription">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground"><tr>{['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions', ''].map((x) => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead>
          <tbody>{medicines.map((row) => <tr key={row.id} className="border-b">
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Medicine" value={row.medicine} onChange={(e) => updateRow(row.id, 'medicine', e.target.value)} /></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Dosage" value={row.dosage} onChange={(e) => updateRow(row.id, 'dosage', e.target.value)} /></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Frequency" value={row.frequency} onChange={(e) => updateRow(row.id, 'frequency', e.target.value)} /></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Duration" value={row.duration} onChange={(e) => updateRow(row.id, 'duration', e.target.value)} /></td>
            <td className="p-2"><Input className="h-7" disabled={readOnly} aria-label="Instructions" value={row.instructions} onChange={(e) => updateRow(row.id, 'instructions', e.target.value)} /></td>
            <td className="p-2 text-right">{!readOnly && <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)}><Trash2 className="size-3.5" /></Button>}</td>
          </tr>)}</tbody>
        </table>
        {!readOnly && <Button variant="outline" size="sm" className="mt-3" onClick={addRow}><Plus className="mr-2 size-4" />Add medicine</Button>}
      </Section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <Section title="Advice"><Textarea disabled={readOnly} className="min-h-24" value={advice} onChange={(e) => setAdvice(e.target.value)} /></Section>
      <Section title="Follow-up"><Field label="Next visit" type="date" value={followUp} onChange={setFollowUp} /></Section>
    </div>
    <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
      <div className="border-t pt-2">Doctor signature</div>
      <div className="border-t pt-2">Dietitian signature</div>
    </div>
  </div>
}

type FollowUpRecord = {
  id: string
  patientMr: string
  program: string
  reviewDate: string
  dueDate: string
  assignedTo: string
  priority: string
  status: string
  remarks: string
}

function dateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function mapFollowUpRecord(followUp: ApiFollowUp): FollowUpRecord {
  return {
    id: followUp.id,
    patientMr: followUp.patientMr,
    program: followUp.program || '',
    reviewDate: dateInputValue(followUp.reviewDate),
    dueDate: dateInputValue(followUp.dueDate),
    assignedTo: followUp.assignedTo || '',
    priority: followUp.priority || 'Medium',
    status: followUp.status || 'Pending',
    remarks: followUp.remarks || '',
  }
}

function FollowUps({ patient, onRefresh }: { patient: PatientRecord; onRefresh?: () => void }) {
  const [records, setRecords] = useState<FollowUpRecord[]>(() => (patient.apiFollowUps ?? []).map(mapFollowUpRecord))
  const [editing, setEditing] = useState<FollowUpRecord | null>(null)
  const [viewing, setViewing] = useState<FollowUpRecord | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRecords((patient.apiFollowUps ?? []).map(mapFollowUpRecord))
  }, [patient.apiFollowUps])

  const blankRecord = (): FollowUpRecord => ({
    id: '',
    patientMr: patient.mr,
    program: '',
    reviewDate: '',
    dueDate: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'Pending',
    remarks: '',
  })

  const saveRecord = async (record: FollowUpRecord) => {
    setSaving(true)
    setError('')
    const isUpdate = !!record.id
    const payload = {
      ...(isUpdate ? { id: record.id } : { patientMr: patient.mr }),
      program: record.program,
      reviewDate: record.reviewDate,
      dueDate: record.dueDate,
      assignedTo: record.assignedTo,
      priority: record.priority,
      status: record.status,
      remarks: record.remarks,
    }

    try {
      const response = await fetch('/api/follow-ups', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        setError(await readApiError(response))
        return
      }
      const body = await response.json() as { followUp: ApiFollowUp }
      const saved = mapFollowUpRecord(body.followUp)
      setRecords((current) => isUpdate ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current])
      setEditing(null)
      setViewing(null)
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save follow-up')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="font-display text-xl font-semibold">Follow-ups</h3>
        <p className="text-sm text-muted-foreground">{patient.name} ? {patient.mr}</p>
      </div>
      <Button size="sm" onClick={() => { setError(''); setEditing(blankRecord()) }}><Plus className="mr-2 size-4" />Create follow-up</Button>
    </div>
    {error && <Card className="rounded-lg border-destructive/30 shadow-sm"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-0">
        {records.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Review Date</th><th className="p-3 font-medium">Due Date</th><th className="p-3 font-medium">Assigned To</th><th className="p-3 font-medium">Priority</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Remarks</th><th className="p-3 font-medium text-right">Actions</th></tr></thead><tbody>{records.map((record) => <tr className="border-b" key={record.id}><td className="p-3">{formatRecordDate(record.reviewDate)}</td><td className="p-3">{formatRecordDate(record.dueDate)}</td><td className="p-3">{record.assignedTo || 'Unassigned'}</td><td className="p-3"><StatusBadge status={record.priority} /></td><td className="p-3"><StatusBadge status={record.status} /></td><td className="p-3">{record.remarks || 'No remarks'}</td><td className="p-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setError(''); setViewing(record) }}><Eye className="mr-1 size-3.5" />View</Button><Button variant="ghost" size="sm" onClick={() => { setError(''); setEditing(record) }}><Pencil className="mr-1 size-3.5" />Edit</Button></div></td></tr>)}</tbody></table></div> : <div className="py-12 text-center"><p className="font-medium">No follow-ups for this patient</p><Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(blankRecord())}><Plus className="mr-2 size-4" />Create follow-up</Button></div>}
      </CardContent>
    </Card>
    {(editing || viewing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
      <Card className="w-full max-w-2xl rounded-lg shadow-xl">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>{editing ? (editing.id ? 'Update follow-up' : 'Create follow-up') : 'Follow-up details'}</CardTitle>
            <CardDescription>{patient.name} - {patient.mr}</CardDescription>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={() => { setEditing(null); setViewing(null) }} aria-label="Close follow-up dialog"><X className="size-4" /></Button>
        </CardHeader>
        <CardContent>
          {editing ? <FollowUpEditor record={editing} saving={saving} onCancel={() => setEditing(null)} onSave={saveRecord} /> : viewing && <FollowUpDetails record={viewing} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
        </CardContent>
      </Card>
    </div>}
  </div>
}

function FollowUpEditor({ record, saving, onCancel, onSave }: { record: FollowUpRecord; saving: boolean; onCancel: () => void; onSave: (record: FollowUpRecord) => void }) {
  const [form, setForm] = useState(record)
  const update = (key: keyof FollowUpRecord, value: string) => setForm((current) => ({ ...current, [key]: value }))

  return <div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Program" value={form.program} placeholder="Weight Loss, Diet review..." onChange={(value) => update('program', value)} />
      <Field label="Assigned To" value={form.assignedTo} placeholder="Staff member" onChange={(value) => update('assignedTo', value)} />
      <Field label="Review Date" type="date" value={form.reviewDate} onChange={(value) => update('reviewDate', value)} />
      <Field label="Due Date" type="date" value={form.dueDate} onChange={(value) => update('dueDate', value)} />
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
        <select aria-label="Priority" value={form.priority} onChange={(e) => update('priority', e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
        <select aria-label="Status" value={form.status} onChange={(e) => update('status', e.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="Pending">Pending</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs font-medium text-muted-foreground">Remarks</Label>
        <Textarea aria-label="Remarks" className="mt-1.5 min-h-24" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Notes for the next contact or review" />
      </div>
    </div>
    <div className="mt-4 flex justify-end gap-2 border-t pt-4">
      <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      <Button size="sm" disabled={saving} onClick={() => onSave(form)}><Check className="mr-2 size-4" />Save follow-up</Button>
    </div>
  </div>
}

function FollowUpDetails({ record, onEdit }: { record: FollowUpRecord; onEdit: () => void }) {
  return <div className="space-y-5">
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <Info label="Program" value={record.program || 'Not recorded'} />
      <Info label="Review date" value={formatRecordDate(record.reviewDate)} />
      <Info label="Due date" value={formatRecordDate(record.dueDate)} />
      <Info label="Assigned to" value={record.assignedTo || 'Unassigned'} />
      <Info label="Priority" value={record.priority} />
      <Info label="Status" value={record.status} />
      <Info label="Remarks" value={record.remarks || 'No remarks'} />
    </div>
    <div className="flex justify-end border-t pt-4">
      <Button size="sm" onClick={onEdit}><Pencil className="mr-2 size-4" />Edit follow-up</Button>
    </div>
  </div>
}

function Bills({ patient }: { patient: ExistingPatient }) { const total = patient.bills.reduce((sum, bill) => sum + bill.amount, 0); return <div className="grid gap-5 lg:grid-cols-[1fr_280px]"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>{patient.bills.length ? <div className="space-y-3">{patient.bills.map((bill) => <div className="flex items-center justify-between rounded-lg border p-4" key={bill.id}><div><p className="font-medium">{bill.id}</p><p className="mt-1 text-xs text-muted-foreground">{bill.date} � {bill.service}</p></div><div className="text-right"><p className="font-semibold">Rs. {bill.amount.toLocaleString()}</p><p className="mt-1 text-xs text-destructive">{bill.status}</p></div></div>)}</div> : <EmptyState title="No invoices for this patient" action="Create invoice" />}</CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Account summary</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="mt-1 text-2xl font-semibold">Rs. {total.toLocaleString()}</p><Button className="mt-5 w-full" size="sm"><IndianRupee className="mr-2 size-4" />Record payment</Button><Button className="mt-2 w-full" variant="outline" size="sm"><FileText className="mr-2 size-4" />New invoice</Button></CardContent></Card></div> }
function EmptyState({ title, action }: { title: string; action: string }) { return <div className="py-8 text-center"><p className="font-medium">{title}</p><Button size="sm" variant="outline" className="mt-3"><Plus className="mr-2 size-4" />{action}</Button></div> }

function ClinicHeader({ center }: { center: string }) {
  const nutrition = center.toLowerCase().includes('nutrition')
  return <div><h3 className="font-display text-2xl font-semibold">{nutrition ? 'NEW YOU' : 'Ayurcare Center'}</h3>{nutrition && <p className="mt-1 text-sm font-medium text-primary">Lose Weight. Choose Health.</p>}<p className="mt-1 text-xs text-muted-foreground">{nutrition ? 'Centre for Professional Weight Management' : 'Jubilee Bazar'}<br />Onden Road, Kannur - 670001, Kerala<br />PH: 8111999581 / 8111999582</p></div>
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

function buildPrintHtml(title: string, patient: ExistingPatient | null, center: string, content?: PrintContent): string {
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

  return `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}.section{margin-top:18px}.rule{border-bottom:1px solid #b8c7cc;height:34px}.notes{border:1px solid #b8c7cc;padding:8px;margin-top:6px;min-height:34px;white-space:pre-wrap}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left}.table th{background:#edf5f6}.signature{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:100px;text-align:center}.signature div{border-top:1px solid #17202a;padding-top:8px}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</div></header><div class="title">${escapeHtml(title)}</div>${patientInfo}<section class="section"><b>${title.includes('Prescription') ? 'Medicines' : 'Clinical Examination'}</b><table class="table"><thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></section>${sections}<div class="signature"><div>Doctor Signature</div><div>Dietitian Signature</div></div></body></html>`
}

function buildBlankOPPrintHtml(center: string, patient: ExistingPatient | null): string {
  const nutrition = center.toLowerCase().includes('nutrition')
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const subtitle = nutrition ? 'Lose Weight. Choose Health. | Centre for Professional Weight Management' : 'Jubilee Bazar'

  const patientInfo = patient
    ? `<div class="patient"><b>Patient:</b> ${escapeHtml(patient.name)}<b>MR No:</b> ${escapeHtml(patient.mr)}<b>Age / Gender:</b> ${patient.age} / ${escapeHtml(patient.gender)}<b>Blood Group:</b> ${escapeHtml(patient.bloodGroup)}<b>Mobile:</b> ${escapeHtml(patient.mobile)}<b>Date:</b> ${new Date().toLocaleDateString()}</div>`
    : '<div class="patient"><b>Patient:</b> ____________________ <b>MR No:</b> ____________________ <b>Age / Gender:</b> ____________________ <b>Blood Group:</b> ____________________ <b>Mobile:</b> ____________________ <b>Date:</b> ____________________</div>'

  return `<!doctype html><html><head><title>OP Registration Sheet</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</div></header><div class="title">OP Registration Sheet</div>${patientInfo}</body></html>`
}

function buildBlankPrescriptionPrintHtml(center: string, patient: ExistingPatient | null): string {
  const nutrition = center.toLowerCase().includes('nutrition')
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const subtitle = nutrition ? 'Lose Weight. Choose Health. | Centre for Professional Weight Management' : 'Jubilee Bazar'

  const patientInfo = patient
    ? `<div class="patient"><b>Patient:</b> ${escapeHtml(patient.name)}<b>MR No:</b> ${escapeHtml(patient.mr)}<b>Age / Gender:</b> ${patient.age} / ${escapeHtml(patient.gender)}<b>Blood Group:</b> ${escapeHtml(patient.bloodGroup)}<b>Mobile:</b> ${escapeHtml(patient.mobile)}<b>Date:</b> ${new Date().toLocaleDateString()}</div>`
    : '<div class="patient"><b>Patient:</b> ____________________ <b>MR No:</b> ____________________ <b>Age / Gender:</b> ____________________ <b>Blood Group:</b> ____________________ <b>Mobile:</b> ____________________ <b>Date:</b> ____________________</div>'

  return `<!doctype html><html><head><title>Prescription</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</div></header><div class="title">Prescription</div>${patientInfo}</body></html>`
}

function openA4Print(title: string, patient: ExistingPatient | null, center: string, content?: PrintContent) {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document
  if (!frameDoc) {
    alert('Unable to create print preview. Please try again.')
    document.body.removeChild(printFrame)
    return
  }

  frameDoc.open()
  frameDoc.write(buildPrintHtml(title, patient, center, content))
  frameDoc.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    setTimeout(() => {
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame)
      }
    }, 100)
  }

  printFrame.onload = doPrint
  setTimeout(doPrint, 100)
}

function openBlankA4Print(center: string, patient: ExistingPatient | null) {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document
  if (!frameDoc) {
    alert('Unable to create print preview. Please try again.')
    document.body.removeChild(printFrame)
    return
  }

  frameDoc.open()
  frameDoc.write(buildBlankOPPrintHtml(center, patient))
  frameDoc.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    setTimeout(() => {
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame)
      }
    }, 100)
  }

  printFrame.onload = doPrint
  setTimeout(doPrint, 100)
}

function openBlankPrescriptionA4Print(center: string, patient: ExistingPatient | null) {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document
  if (!frameDoc) {
    alert('Unable to create print preview. Please try again.')
    document.body.removeChild(printFrame)
    return
  }

  frameDoc.open()
  frameDoc.write(buildBlankPrescriptionPrintHtml(center, patient))
  frameDoc.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    setTimeout(() => {
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame)
      }
    }, 100)
  }

  printFrame.onload = doPrint
  setTimeout(doPrint, 100)
}


