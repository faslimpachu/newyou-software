'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, Printer, Search, UserPlus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

type PatientStatus = 'Active' | 'Inactive' | 'Waiting' | 'Consulting' | 'Completed' | 'Cancelled' | 'Follow-up'
type Patient = { mr: string; name: string; parent: string; phone: string; age: number; center: string; lastVisit: string; status: PatientStatus }

const STATUS_OPTIONS: PatientStatus[] = ['Active', 'Inactive', 'Waiting', 'Consulting', 'Completed', 'Cancelled', 'Follow-up']
const CENTER_OPTIONS = ['All centres', 'Nutrition Center', 'Ayurcare Center']

function mapApiPatient(patient: any): Patient {
  const centerPrefix = patient.mr?.startsWith('NU') ? 'Nutrition Center' : patient.mr?.startsWith('AY') ? 'Ayurcare Center' : 'Center'
  const lastVisit = patient.visits?.length ? patient.visits[0].appointmentDate || patient.createdAt : patient.createdAt
  return {
    mr: patient.mr,
    name: patient.patientName,
    parent: patient.parentName,
    phone: patient.mobileNumber,
    age: patient.age ?? 0,
    center: centerPrefix,
    lastVisit: lastVisit ? new Date(lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    status: (patient.status as PatientStatus) || 'Active',
  }
}

function exportToCSV(patients: Patient[], filename: string) {
  const headers = ['MR Number','Patient','Parent / Spouse','Phone','Age','Centre','Last Visit','Status']
  const rows = patients.map((p) => [p.mr, p.name, p.parent, p.phone, p.age, p.center, p.lastVisit, p.status])
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function exportToExcel(patients: Patient[], filename: string) {
  const headers = ['MR Number','Patient','Parent / Spouse','Phone','Age','Centre','Last Visit','Status']
  const rows = patients.map((p) => [p.mr, p.name, p.parent, p.phone, p.age, p.center, p.lastVisit, p.status])
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0,10)}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

export function PatientDirectory() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [center, setCenter] = useState('All centres')
  const [status, setStatus] = useState('All statuses')
  const [selected, setSelected] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('search', query.trim())
      if (status !== 'All statuses') params.set('status', status)
      params.set('page', '1')
      params.set('limit', '100')

      const res = await fetch(`/api/patients?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load patients')
      const data = await res.json()
      const mapped = (data.patients || []).map(mapApiPatient)
      setPatients(mapped)
      if (mapped.length && !selected) {
        setSelected(mapped[0])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [query, status, selected])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const filtered = useMemo(() => {
    return patients.filter((patient) => {
      const matchesQuery = `${patient.mr} ${patient.name} ${patient.parent} ${patient.phone}`.toLowerCase().includes(query.toLowerCase())
      const matchesCenter = center === 'All centres' || patient.center === center
      const matchesStatus = status === 'All statuses' || patient.status === status
      return matchesQuery && matchesCenter && matchesStatus
    })
  }, [patients, query, center, status])

  const changeStatus = async (next: PatientStatus) => {
    if (!selected) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(selected.mr)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = { ...selected, status: next }
      setSelected(updated)
      setPatients((items) => items.map((item) => item.mr === updated.mr ? updated : item))
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const deletePatient = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(deleting.mr)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete patient')
      setPatients((items) => items.filter((item) => item.mr !== deleting.mr))
      if (selected?.mr === deleting.mr) {
        setSelected(patients[0] || null)
      }
      setDeleting(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete patient')
    } finally {
      setDeleteLoading(false)
    }
  }

  const printDirectory = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    const rowsHtml = (filtered.length ? filtered : patients).map((p) => `<tr><td>${p.mr}</td><td>${p.name}</td><td>${p.parent}</td><td>${p.phone}</td><td>${p.age}</td><td>${p.center}</td><td>${p.lastVisit}</td><td>${p.status}</td></tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Patient List</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px;text-align:center}.clinic{font-size:22px;font-weight:700;color:#167b91}.address{color:#4b5563;margin-top:4px;font-size:11px}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.meta{font-size:11px;margin-bottom:12px;color:#4b5563}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:11px}.table th{background:#edf5f6}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">NEW YOU & Ayurcare Center</div><div class="address">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</div></header><div class="title">Patient Directory</div><div class="meta">Printed on ${new Date().toLocaleDateString()} · Total: ${(filtered.length ? filtered : patients).length} patients</div><table class="table"><thead><tr><th>MR No</th><th>Patient</th><th>Parent/Spouse</th><th>Phone</th><th>Age</th><th>Centre</th><th>Last Visit</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Patient Care</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Patient Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search registered patients, review details, and keep care status current.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={printDirectory}><Printer className="mr-2 size-4"/>Print</Button>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.length ? filtered : patients, 'patients')}><Download className="mr-2 size-4"/>Export PDF</Button>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(filtered.length ? filtered : patients, 'patients')}><FileSpreadsheet className="mr-2 size-4"/>Export Excel</Button>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.length ? filtered : patients, 'patients')}><FileSpreadsheet className="mr-2 size-4"/>Export CSV</Button>
        <Button size="sm" onClick={() => router.push('/register')}><UserPlus className="mr-2 size-4"/>Register patient</Button>
      </div>
    </div>

    {error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

    <Card className="rounded-lg shadow-sm">
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/>
          <Input className="w-70 pl-8" placeholder="MR number, name, mobile, parent" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Filter label="Centre" value={center} values={CENTER_OPTIONS} onChange={setCenter} />
        <Filter label="Status" value={status} values={['All statuses', ...STATUS_OPTIONS]} onChange={setStatus} />
        <p className="ml-auto text-xs text-muted-foreground">{filtered.length} matching patients</p>
      </CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="rounded-lg shadow-sm">
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading patients...</div> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">MR No</th>
                  <th className="p-3 font-medium">Patient</th>
                  <th className="p-3 font-medium">Parent/Spouse</th>
                  <th className="p-3 font-medium">Phone</th>
                  <th className="p-3 font-medium">Age</th>
                  <th className="p-3 font-medium">Centre</th>
                  <th className="p-3 font-medium">Last Visit</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No patients found.</td></tr>}
                {filtered.map((patient) => (
                  <tr key={patient.mr} className={`border-b last:border-0 hover:bg-muted/40 cursor-pointer ${selected?.mr === patient.mr ? 'bg-muted/60' : ''}`} onClick={() => setSelected(patient)}>
                    <td className="p-3 font-medium">{patient.mr}</td>
                    <td className="p-3">{patient.name}</td>
                    <td className="p-3">{patient.parent}</td>
                    <td className="p-3">{patient.phone}</td>
                    <td className="p-3">{patient.age}</td>
                    <td className="p-3">{patient.center}</td>
                    <td className="p-3">{patient.lastVisit}</td>
                    <td className="p-3"><StatusBadge status={patient.status} /></td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/patients/${patient.mr}`)}><Search className="size-4"/></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(patient)}><Trash2 className="size-4 text-destructive"/></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </CardContent>
      </Card>

      <aside>
        <Card className="sticky top-20 rounded-lg shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Patient details</CardTitle>
            <CardDescription className="text-xs">Quick view and status management</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {selected ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{selected.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</div>
                  <div>
                    <p className="font-medium">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.mr}</p>
                  </div>
                </div>
                <div className="space-y-3 border-t pt-4 text-sm">
                  <Pair label="Parent / Spouse" value={selected.parent} />
                  <Pair label="Phone" value={selected.phone} />
                  <Pair label="Age" value={String(selected.age)} />
                  <Pair label="Centre" value={selected.center} />
                  <Pair label="Last visit" value={selected.lastVisit} />
                </div>
                <div className="border-t pt-4">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <select className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" value={selected.status} onChange={(e) => changeStatus(e.target.value as PatientStatus)} disabled={updatingStatus}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="border-t pt-4 flex flex-col gap-2">
                  <Button className="w-full" size="sm" onClick={() => router.push(`/patients/${selected.mr}`)}>Open full record</Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setDeleting(selected)}><Trash2 className="mr-2 size-4"/>Delete record</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a patient to view details.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>

    {deleting && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
          <h2 className="font-display text-lg font-semibold">Delete patient record</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This will permanently remove {deleting.name} ({deleting.mr}) and all related visits, prescriptions, invoices, and documents. This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={deletePatient} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </div>
      </div>
    )}
  </div>
}

function Filter({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <div>
    <label className="text-xs text-muted-foreground">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
      {values.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  </div>
}

function StatusBadge({ status }: { status: PatientStatus }) {
  const className = ['Active','Completed'].includes(status) ? 'bg-primary/10 text-primary' : ['Cancelled','Inactive'].includes(status) ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800'
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{status}</span>
}

function Pair({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>
}
