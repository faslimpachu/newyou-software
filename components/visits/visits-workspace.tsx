'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Plus, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type VisitStatus = 'Waiting' | 'Active' | 'Completed' | 'Cancelled'
type Visit = { id: string; op: string; mr: string; patient: string; center: string; time: string; clinician: string; status: VisitStatus }

function mapApiVisit(visit: any): Visit {
  const time = visit.appointmentTimeSlot || (visit.appointmentDate ? new Date(visit.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--')
  return {
    id: visit.id,
    op: visit.id.slice(0, 8).toUpperCase(),
    mr: visit.patientMr,
    patient: visit.patient?.patientName || 'Unknown',
    center: visit.center || '--',
    time,
    clinician: visit.doctor || 'Not assigned',
    status: (visit.status as VisitStatus) || 'Waiting',
  }
}

export function VisitsWorkspace() {
  const router = useRouter()
  const [visits, setVisits] = useState<Visit[]>([])
  const [selected, setSelected] = useState<Visit | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchVisits = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/visits')
      if (!res.ok) throw new Error('Failed to load visits')
      const data = await res.json()
      const mapped = (data.visits || []).map(mapApiVisit)
      setVisits(mapped)
    } catch (err: any) {
      setError(err.message || 'Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const initial = async () => {
      setLoading(true)
      try {
        await fetchVisits()
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initial()
    const timer = setInterval(fetchVisits, 2000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [fetchVisits])

  const visible = useMemo(() => {
    return visits.filter((visit) => `${visit.patient} ${visit.mr} ${visit.op}`.toLowerCase().includes(query.toLowerCase()))
  }, [visits, query])

  const updateStatus = async (status: VisitStatus) => {
    if (!selected) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/visits/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = { ...selected, status }
      setSelected(updated)
      setVisits((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const openPatient = (mr: string) => router.push(`/patients/${mr}`)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Patient Care</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Visit Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage today's outpatient queue, consultation assignments, and visit progression.</p>
        </div>
        <Button size="sm" onClick={() => setScheduleOpen(true)}><Plus className="mr-2 size-4"/>Schedule visit</Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(['Waiting','Active','Completed','Cancelled'] as VisitStatus[]).map((status) => (
          <Card key={status} className="rounded-lg shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{status}</p>
              <p className="mt-1 text-xl font-semibold">{visits.filter((visit) => visit.status === status).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Today's visits</CardTitle>
              <CardDescription>{visible.length} appointments scheduled.</CardDescription>
            </div>
            <div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/><Input className="w-56 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or OP no."/></div>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading visits...</div> : <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                  <tr>{['Time','Patient','Centre','Clinician','Visit status'].map((heading) => <th key={heading} className="px-5 py-3 text-left font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No visits found.</td></tr>}
                  {visible.map((visit) => (
                    <tr key={visit.id} onClick={() => setSelected(visit)} className={'cursor-pointer border-b hover:bg-muted/50 ' + (selected && selected.id === visit.id ? 'bg-primary/5' : '')}>
                      <td className="px-5 py-4 text-sm font-medium">{visit.time}</td>
                      <td className="px-5 py-4"><p className="font-medium">{visit.patient}</p><p className="text-xs text-primary">{visit.mr}</p></td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{visit.center}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{visit.clinician}</td>
                      <td className="px-5 py-4"><StatusBadge status={visit.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent>
        </Card>
        {selected ? (
          <VisitDetailPanel visit={selected} updateStatus={updateStatus} updating={updating} onOpenPatient={() => openPatient(selected.mr)} />
        ) : (
          <Card className="h-fit rounded-lg shadow-sm"><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a visit to view details.</CardContent></Card>
        )}
      </div>
      {scheduleOpen && <ScheduleVisit onClose={() => setScheduleOpen(false)} />}
    </div>
  )
}

function StatusBadge({ status }: { status: VisitStatus }) {
  return <span className={'rounded-md px-2 py-1 text-xs font-medium ' + (status === 'Completed' || status === 'Active' ? 'bg-primary/10 text-primary' : status === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800')}>{status}</span>
}

function VisitDetailPanel({ visit, updateStatus, updating, onOpenPatient }: { visit: Visit; updateStatus: (status: VisitStatus) => void; updating: boolean; onOpenPatient: () => void }) {
  return <Card className="h-fit rounded-lg shadow-sm">
    <CardHeader>
      <CardTitle>{visit.patient}</CardTitle>
      <CardDescription>{visit.mr} · {visit.op}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <dl className="space-y-3 text-sm">
          <Pair label="Appointment" value={visit.time}/>
          <Pair label="Centre" value={visit.center}/>
          <Pair label="Assigned clinician" value={visit.clinician}/>
        </dl>
        <div>
          <Label className="text-xs text-muted-foreground">Visit status</Label>
          <select value={visit.status} onChange={(e) => updateStatus(e.target.value as VisitStatus)} disabled={updating} className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
            {(['Waiting','Active','Completed','Cancelled'] as VisitStatus[]).map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div className="border-t pt-4">
          <Button className="w-full" size="sm" onClick={onOpenPatient}><UserRound className="mr-2 size-4"/>Open patient profile</Button>
        </div>
      </div>
    </CardContent>
  </Card>
}

function Pair({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div> }

function ScheduleVisit({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
    <Card className="w-full max-w-xl rounded-lg shadow-xl">
      <CardHeader>
        <CardTitle>Schedule outpatient visit</CardTitle>
        <CardDescription>Enter the MR number, then assign an appointment and clinical staff.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground">MR number</Label>
          <div className="mt-1.5 flex gap-2">
            <Input placeholder="MR000001"/>
            <Button variant="outline" size="sm">Fetch patient</Button>
          </div>
        </div>
        <FormField label="Appointment date" type="date"/>
        <FormField label="Time slot" placeholder="10:30 AM"/>
        <SelectField label="Doctor" values={['Dr. Neha Verma','Dr. Arjun Das']}/>
        <SelectField label="Dietitian" values={['Dr. Neha Verma','Not required']}/>
        <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}><CalendarDays className="mr-2 size-4"/>Schedule visit</Button>
        </div>
      </CardContent>
    </Card>
  </div>
}

function FormField({ label, type = 'text', placeholder }: { label: string; type?: string; placeholder?: string }) {
  return <div>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input className="mt-1.5" type={type} placeholder={placeholder}/>
  </div>
}

function SelectField({ label, values }: { label: string; values: string[] }) {
  return <div>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <select className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
      {values.map((value) => <option key={value}>{value}</option>)}
    </select>
  </div>
}
