'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, Printer, Search, Info, UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Patient = { mr: string; name: string; parent: string; phone: string; age: number; lastVisit: string }



function mapApiPatient(patient: any): Patient {
  const lastVisit = patient.visits?.length ? patient.visits[0].appointmentDate || patient.createdAt : patient.createdAt
  return {
    mr: patient.mr,
    name: patient.patientName,
    parent: patient.parentName,
    phone: patient.mobileNumber,
    age: patient.age ?? 0,
    lastVisit: lastVisit ? new Date(lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
  }
}

function exportToCSV(patients: Patient[], filename: string) {
  const headers = ['MR Number','Patient','Parent / Spouse','Phone','Age','Last Visit']
  const rows = patients.map((p) => [p.mr, p.name, p.parent, p.phone, p.age, p.lastVisit])
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
  const headers = ['MR Number','Patient','Parent / Spouse','Phone','Age','Last Visit']
  const rows = patients.map((p) => [p.mr, p.name, p.parent, p.phone, p.age, p.lastVisit])
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchPatients = useCallback(async () => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('search', query.trim())
      const url = params.toString() ? `/api/patients?${params.toString()}` : '/api/patients'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load patients')
      const data = await res.json()
      const mapped = (data.patients || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(mapApiPatient)
      setPatients(mapped)
    } catch (err: any) {
      setError(err.message || 'Failed to load patients')
    }
  }, [query])

  useEffect(() => {
    let mounted = true
    const initial = async () => {
      setLoading(true)
      try {
        await fetchPatients()
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initial()
    const timer = setInterval(fetchPatients, 3000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [fetchPatients])

  const filtered = useMemo(() => {
    return patients.filter((patient) => {
      const matchesQuery = `${patient.mr} ${patient.name} ${patient.parent} ${patient.phone}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery
    })
  }, [patients, query])

  const deletePatient = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(deleting.mr)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete patient')
      setPatients((items) => items.filter((item) => item.mr !== deleting.mr))
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
    const rowsHtml = (filtered.length ? filtered : patients).map((p) => `<tr><td>${p.mr}</td><td>${p.name}</td><td>${p.parent}</td><td>${p.phone}</td><td>${p.age}</td><td>${p.lastVisit}</td></tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Patient List</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px;text-align:center}.clinic{font-size:22px;font-weight:700;color:#167b91}.address{color:#4b5563;margin-top:4px;font-size:11px}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.meta{font-size:11px;margin-bottom:12px;color:#4b5563}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:11px}.table th{background:#edf5f6}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">NEW YOU & Ayurcare Center</div><div class="address">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</div></header><div class="title">Patient Directory</div><div class="meta">Printed on ${new Date().toLocaleDateString()} · Total: ${(filtered.length ? filtered : patients).length} patients</div><table class="table"><thead><tr><th>MR No</th><th>Patient</th><th>Parent/Spouse</th><th>Phone</th><th>Age</th><th>Last Visit</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`)
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
        <p className="ml-auto text-xs text-muted-foreground">{filtered.length} matching patients</p>
      </CardContent>
    </Card>

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
                <th className="p-3 font-medium">Last Visit</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No patients found.</td></tr>}
              {filtered.map((patient) => (
                <tr key={patient.mr} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer" onClick={() => router.push(`/patients/${patient.mr}`)}>
                  <td className="p-3 font-medium">{patient.mr}</td>
                  <td className="p-3">{patient.name}</td>
                  <td className="p-3">{patient.parent}</td>
                  <td className="p-3">{patient.phone}</td>
                  <td className="p-3">{patient.age}</td>
                  <td className="p-3">{patient.lastVisit}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/patients/${patient.mr}`)} aria-label="View patient record"><Info className="size-4"/></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(patient)} aria-label="Delete patient"><Trash2 className="size-4 text-destructive"/></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </CardContent>
    </Card>

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

