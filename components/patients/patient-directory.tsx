'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, Printer, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

type PatientStatus = 'Active' | 'Inactive' | 'Waiting' | 'Consulting' | 'Completed' | 'Cancelled' | 'Follow-up'
type Patient = { mr: string; name: string; parent: string; phone: string; age: number; center: string; lastVisit: string; status: PatientStatus }
const registry: Patient[] = [
  {mr:'NU000001',name:'Aarav Sharma',parent:'Rajesh Sharma',phone:'98450 12345',age:34,center:'Nutrition Center',lastVisit:'02 Jun 2026',status:'Active'},
  {mr:'NU000002',name:'Priya Nair',parent:'Suresh Nair',phone:'99860 45678',age:28,center:'Nutrition Center',lastVisit:'21 May 2026',status:'Follow-up'},
  {mr:'AY000001',name:'Rohan Mehta',parent:'Anil Mehta',phone:'90080 33221',age:45,center:'Ayurcare Center',lastVisit:'30 May 2026',status:'Consulting'},
  {mr:'AY000002',name:'Anjali Menon',parent:'Thomas Menon',phone:'98765 21430',age:39,center:'Ayurcare Center',lastVisit:'12 Jun 2026',status:'Active'},
  {mr:'NU000003',name:'Nisha Kumar',parent:'Ramesh Kumar',phone:'98950 21124',age:31,center:'Nutrition Center',lastVisit:'08 Jul 2026',status:'Waiting'},
]

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
  const [patients, setPatients] = useState(registry)
  const [query, setQuery] = useState('')
  const [center, setCenter] = useState('All centres')
  const [status, setStatus] = useState('All statuses')
  const [selected, setSelected] = useState<Patient | null>(registry[0])
  const filtered = useMemo(() => patients.filter((patient) => `${patient.mr} ${patient.name} ${patient.parent} ${patient.phone}`.toLowerCase().includes(query.toLowerCase()) && (center === 'All centres' || patient.center === center) && (status === 'All statuses' || patient.status === status)), [patients, query, center, status])
  const changeStatus = (next: PatientStatus) => { if (!selected) return; const updated = {...selected, status: next}; setSelected(updated); setPatients((items) => items.map((item) => item.mr === updated.mr ? updated : item)) }
  const openPatient = (mr: string) => router.push(`/patients/${mr}`)
  const printDirectory = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    const rowsHtml = (filtered.length ? filtered : patients).map((p) => `<tr><td>${p.mr}</td><td>${p.name}</td><td>${p.parent}</td><td>${p.phone}</td><td>${p.age}</td><td>${p.center}</td><td>${p.lastVisit}</td><td>${p.status}</td></tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Patient List</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px;text-align:center}.clinic{font-size:22px;font-weight:700;color:#167b91}.address{color:#4b5563;margin-top:4px;font-size:11px}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.meta{font-size:11px;margin-bottom:12px;color:#4b5563}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:11px}.table th{background:#edf5f6}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">NEW YOU & Ayurcare Center</div><div class="address">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</div></header><div class="title">Patient Directory</div><div class="meta">Printed on ${new Date().toLocaleDateString()} · Total: ${(filtered.length ? filtered : patients).length} patients</div><table class="table"><thead><tr><th>MR No</th><th>Patient</th><th>Parent/Spouse</th><th>Phone</th><th>Age</th><th>Centre</th><th>Last Visit</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }
  return <div className="mx-auto max-w-[1600px] space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">Patient Care</p><h1 className="mt-1 font-display text-2xl font-semibold">Patient Directory</h1><p className="mt-1 text-sm text-muted-foreground">Search registered patients, review details, and keep care status current.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={printDirectory}><Printer className="mr-2 size-4"/>Print</Button><Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.length ? filtered : patients, 'patients')}><Download className="mr-2 size-4"/>Export PDF</Button><Button variant="outline" size="sm" onClick={() => exportToExcel(filtered.length ? filtered : patients, 'patients')}><FileSpreadsheet className="mr-2 size-4"/>Export Excel</Button><Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.length ? filtered : patients, 'patients')}><FileSpreadsheet className="mr-2 size-4"/>Export CSV</Button><Button size="sm"><UserPlus className="mr-2 size-4"/>Register patient</Button></div></div><Card className="rounded-lg shadow-sm"><CardContent className="flex flex-wrap items-end gap-3 p-4"><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/><Input className="w-70 pl-8" placeholder="MR number, name, mobile, parent" value={query} onChange={(e) => setQuery(e.target.value)}/></div><Filter label="Centre" value={center} values={['All centres','Nutrition Center','Ayurcare Center']} onChange={setCenter}/><Filter label="Status" value={status} values={['All statuses','Active','Inactive','Waiting','Consulting','Completed','Cancelled','Follow-up']} onChange={setStatus}/><p className="ml-auto text-xs text-muted-foreground">{filtered.length} matching patients</p></CardContent></Card><div className="grid gap-6 xl:grid-cols-[1fr_340px]"><Card className="rounded-lg shadow-sm"><CardContent className="px-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr>{['MR number','Patient','Phone','Centre','Last visit','Status'].map((heading) => <th key={heading} className="px-5 py-3 text-left font-medium">{heading}</th>)}</tr></thead><tbody>{filtered.map((patient) => <tr key={patient.mr} onClick={() => openPatient(patient.mr)} className="cursor-pointer border-b hover:bg-muted/50"><td className="px-5 py-4 font-medium text-primary">{patient.mr}</td><td className="px-5 py-4"><p className="font-medium">{patient.name}</p><p className="text-xs text-muted-foreground">{patient.parent}</p></td><td className="px-5 py-4 text-sm text-muted-foreground">{patient.phone}</td><td className="px-5 py-4 text-sm text-muted-foreground">{patient.center}</td><td className="px-5 py-4 text-sm text-muted-foreground">{patient.lastVisit}</td><td className="px-5 py-4"><StatusBadge status={patient.status}/></td></tr>)}</tbody></table></div></CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Patient details</CardTitle><CardDescription>Quick summary of the selected record.</CardDescription></CardHeader><CardContent className="space-y-5"><dl className="space-y-3 text-sm">{selected ? <><Pair label="Patient" value={selected.name}/><Pair label="MR" value={selected.mr}/><Pair label="Parent / spouse" value={selected.parent}/><Pair label="Phone" value={selected.phone}/><Pair label="Centre" value={selected.center}/><Pair label="Last visit" value={selected.lastVisit}/><Pair label="Status" value={selected.status}/></> : <p className="text-sm text-muted-foreground">Select a patient row.</p>}</dl><Button className="w-full" size="sm" onClick={() => selected && openPatient(selected.mr)}>Open patient profile</Button></CardContent></Card></div></div>
}
function Filter({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) { return <div><label className="text-xs text-muted-foreground">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-8 rounded-lg border border-input bg-background px-2.5 text-sm">{values.map((item) => <option key={item}>{item}</option>)}</select></div> }
function StatusBadge({ status }: { status: PatientStatus }) { const className = ['Active','Completed'].includes(status) ? 'bg-primary/10 text-primary' : ['Cancelled','Inactive'].includes(status) ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800'; return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{status}</span> }
function Pair({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div> }
