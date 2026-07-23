'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, Plus, Search, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ApiFollowUp = {
  id: string
  patientMr: string
  program?: string | null
  reviewDate?: string | null
  dueDate?: string | null
  assignedTo?: string | null
  priority?: string | null
  status?: string | null
  remarks?: string | null
  patient?: {
    patientName?: string | null
    mobileNumber?: string | null
    address?: string | null
    district?: string | null
  } | null
}

type FollowUpRow = {
  id: string
  name: string
  mr: string
  address: string
  phone: string
  program: string
  reviewDate: string
  dueDate: string
  due: string
  assigned: string
  priority: string
  status: string
  remarks: string
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function mapFollowUp(row: ApiFollowUp): FollowUpRow {
  return {
    id: row.id,
    name: row.patient?.patientName || 'Unknown patient',
    mr: row.patientMr,
    address: row.patient?.district || row.patient?.address || 'Not recorded',
    phone: row.patient?.mobileNumber || 'Not recorded',
    program: row.program || 'Not recorded',
    reviewDate: dateInputValue(row.reviewDate),
    dueDate: dateInputValue(row.dueDate),
    due: formatDate(row.dueDate || row.reviewDate),
    assigned: row.assignedTo || 'Unassigned',
    priority: row.priority || 'Medium',
    status: row.status || 'Pending',
    remarks: row.remarks || '',
  }
}

export function WorkflowWorkspace() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])
  const [selected, setSelected] = useState<FollowUpRow | null>(null)
  const [editor, setEditor] = useState<FollowUpRow | true | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFollowUps = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/follow-ups')
      if (!response.ok) throw new Error('Failed to load follow-ups')
      const body = await response.json() as { followUps: ApiFollowUp[] }
      const mapped = body.followUps.map(mapFollowUp)
      setFollowUps(mapped)
      setSelected(mapped[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups')
      setFollowUps([])
      setSelected(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadFollowUps()
    const timer = setInterval(() => {
      void loadFollowUps(false)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const rows = useMemo(() => {
    return followUps.filter((row) => `${row.name} ${row.mr} ${row.id} ${row.program}`.toLowerCase().includes(query.toLowerCase()))
  }, [followUps, query])

  const openPatient = (mr: string) => router.push(`/patients/${mr}`)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Clinical Workflow</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Follow-up Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Schedule due care, assign staff, and track follow-up completion.</p>
        </div>
        <Button size="sm" onClick={() => setEditor(true)}><Plus className="mr-2 size-4" />Schedule follow-up</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Follow-up queue</CardTitle>
              <CardDescription>{loading ? 'Loading records...' : `${rows.length} records currently shown.`}</CardDescription>
            </div>
            <div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input className="w-56 pl-8" placeholder="Search MR, patient, reference" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                  <tr>{['Patient', 'Address / phone', 'Program', 'Due date', 'Assigned to', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 text-left font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b hover:bg-muted/50">
                      <td className="px-5 py-4"><p className="font-medium">{row.name}</p><p className="text-xs text-primary">{row.mr}</p></td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{row.address} - {row.phone}</td>
                      <td className="px-5 py-4">{row.program}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{row.due}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{row.assigned}</td>
                      <td className="px-5 py-4">{row.status}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={6}>{error || 'No follow-ups found.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {selected ? (
          <WorkflowDetails item={selected} onOpen={() => setEditor(selected)} onOpenPatient={() => openPatient(selected.mr)} />
        ) : (
          <Card className="h-fit rounded-lg shadow-sm"><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a record to view details.</CardContent></Card>
        )}
      </div>
      {editor && <WorkflowEditor record={editor === true ? null : editor} onSaved={() => loadFollowUps(false)} onClose={() => setEditor(null)} />}
    </div>
  )
}

function WorkflowDetails({ item, onOpen, onOpenPatient }: { item: FollowUpRow; onOpen: () => void; onOpenPatient: () => void }) {
  return <Card className="h-fit rounded-lg shadow-sm"><CardHeader><CardTitle>{item.name}</CardTitle><CardDescription>{item.mr}</CardDescription></CardHeader><CardContent className="space-y-4"><dl className="space-y-3 text-sm"><Pair label="Program" value={item.program} /><Pair label="Due date" value={item.due} /><Pair label="Assigned to" value={item.assigned} /><Pair label="Priority" value={item.priority} /><Pair label="Status" value={item.status} />{item.remarks && <Pair label="Remarks" value={item.remarks} />}</dl><div className="flex gap-2 border-t pt-4"><Button className="flex-1" size="sm" onClick={onOpenPatient}><UserRound className="mr-2 size-4" />Open patient profile</Button><Button className="flex-1" size="sm" variant="outline" onClick={onOpen}><CalendarPlus className="mr-2 size-4" />Update follow-up</Button></div></CardContent></Card>
}

function Pair({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>
}

function WorkflowEditor({ record, onSaved, onClose }: { record: FollowUpRow | null; onSaved: () => void; onClose: () => void }) {
  const followUp = record
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [mr, setMr] = useState(followUp?.mr ?? '')
  const [program, setProgram] = useState(followUp?.program ?? '')
  const [reviewDate, setReviewDate] = useState(followUp?.reviewDate ?? '')
  const [dueDate, setDueDate] = useState(followUp?.dueDate ?? '')
  const [assignedTo, setAssignedTo] = useState(followUp?.assigned ?? '')
  const [priority, setPriority] = useState(followUp?.priority ?? 'Medium')
  const [status, setStatus] = useState(followUp?.status ?? 'Pending')
  const [remarks, setRemarks] = useState(followUp?.remarks ?? '')

  const saveFollowUp = async () => {
    setError('')
    const isUpdate = !!followUp
    const response = await fetch('/api/follow-ups', {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isUpdate ? { id: followUp.id } : { patientMr: mr.trim() }),
        program,
        reviewDate,
        dueDate,
        assignedTo,
        priority,
        status,
        remarks,
      }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error || 'Failed to save follow-up')
      return
    }
    setSaved(true)
    await onSaved()
    setTimeout(onClose, 300)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4"><Card className="w-full max-w-2xl rounded-lg shadow-xl"><CardHeader className="flex-row justify-between"><div><CardTitle>{followUp ? 'Update follow-up' : 'Schedule follow-up'}</CardTitle><CardDescription>Follow-ups are patient records. New records require an MR number.</CardDescription></div><Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close dialog"><X className="size-4" /></Button></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}<div><Label className="text-xs text-muted-foreground">MR number</Label><Input aria-label="MR number" className="mt-1.5" value={mr} disabled={!!followUp} onChange={(e) => setMr(e.target.value)} placeholder="MR000001" /></div><div><Label className="text-xs text-muted-foreground">Program</Label><Input aria-label="Program" className="mt-1.5" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Diet review" /></div><div><Label className="text-xs text-muted-foreground">Review date</Label><Input aria-label="Review date" className="mt-1.5" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /></div><div><Label className="text-xs text-muted-foreground">Due date</Label><Input aria-label="Due date" className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div><div><Label className="text-xs text-muted-foreground">Assigned to</Label><Input aria-label="Assigned to" className="mt-1.5" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Staff member" /></div><div><Label className="text-xs text-muted-foreground">Priority</Label><select aria-label="Priority" className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></div><div><Label className="text-xs text-muted-foreground">Status</Label><select aria-label="Status" className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option>Pending</option><option>Confirmed</option><option>Completed</option><option>Missed</option></select></div><div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Remarks</Label><Textarea aria-label="Remarks" className="mt-1.5" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes..." /></div><div className="md:col-span-2 flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={saveFollowUp}>{saved ? <><Check className="mr-2 size-4" />Saved</> : <><Plus className="mr-2 size-4" />Save follow-up</>}</Button></div></CardContent></Card></div>
}
