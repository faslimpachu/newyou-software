'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarPlus, Check, FileText, Plus, Search, Stethoscope, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Mode = 'consultations' | 'followups'
const consultations = [{id:'OP-260712-014',name:'Aarav Sharma',mr:'NU000001',clinician:'Dr. Neha Verma',reason:'Diet review',status:'In Progress'},{id:'OP-260712-015',name:'Rohan Mehta',mr:'AY000001',clinician:'Dr. Arjun Das',reason:'Wellness consultation',status:'Signed'}]
const followups = [{id:'FU-2021',name:'Aarav Sharma',mr:'NU000001',address:'Bengaluru',phone:'98450 12345',program:'Diet review',due:'Today, 03:30 PM',assigned:'Dr. Neha Verma',status:'Due today'},{id:'FU-2022',name:'Rohan Mehta',mr:'AY000001',address:'Pune',phone:'90080 33221',program:'Therapy review',due:'14 Jul 2026',assigned:'Dr. Arjun Das',status:'Scheduled'}]

export function WorkflowWorkspace({ mode }: { mode: Mode }) {
  const router = useRouter()
  const consultationMode = mode === 'consultations'
  const title = consultationMode ? 'Consultations' : 'Follow-up Management'
  const action = consultationMode ? 'Start consultation' : 'Schedule follow-up'
  const data = consultationMode ? consultations : followups
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<typeof consultations[number] | typeof followups[number] | null>(data[0])
  const [editor, setEditor] = useState(false)
  const rows = data.filter((row) => `${row.name} ${row.mr} ${row.id}`.toLowerCase().includes(query.toLowerCase()))
  const openPatient = (mr: string) => router.push(`/patients/${mr}`)
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Clinical Workflow</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{consultationMode ? 'Document clinical encounters and keep outpatient records current.' : 'Schedule due care, assign staff, and track follow-up completion.'}</p>
        </div>
        <Button size="sm" onClick={() => setEditor(true)}><Plus className="mr-2 size-4"/>{action}</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{consultationMode ? 'Clinical encounters' : 'Follow-up queue'}</CardTitle>
              <CardDescription>{rows.length} records currently shown.</CardDescription>
            </div>
            <div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/><Input className="w-56 pl-8" placeholder="Search MR, patient, reference" value={query} onChange={(e) => setQuery(e.target.value)}/></div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                  <tr>{(consultationMode ? ['OP number','Patient','Clinician','Chief concern','Status'] : ['Patient','Address / phone','Program','Due date','Assigned to','Status']).map((heading) => <th key={heading} className="px-5 py-3 text-left font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b hover:bg-muted/50">
                      <td className="px-5 py-4">
                        <p className="font-medium">{consultationMode ? row.id : row.name}</p>
                        <p className="text-xs text-primary">{consultationMode ? row.mr : row.mr}</p>
                      </td>
                      {consultationMode ? (
                        <>
                          <td className="px-5 py-4"><p className="font-medium">{row.name}</p><p className="text-xs text-primary">{row.mr}</p></td>
                          <td className="px-5 py-4">{row.clinician}</td>
                          <td className="px-5 py-4">{row.reason}</td>
                          <td className="px-5 py-4">{row.status}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-4 text-sm text-muted-foreground">{row.address} · {row.phone}</td>
                          <td className="px-5 py-4">{row.program}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground">{row.due}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground">{row.assigned}</td>
                          <td className="px-5 py-4">{row.status}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {selected ? (
          <WorkflowDetails item={selected} consultationMode={consultationMode} onOpen={() => {}} onOpenPatient={() => openPatient(selected.mr)} />
        ) : (
          <Card className="h-fit rounded-lg shadow-sm"><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a record to view details.</CardContent></Card>
        )}
      </div>
      {editor && <WorkflowEditor consultationMode={consultationMode} onClose={() => setEditor(false)} />}
    </div>
  )
}
function WorkflowDetails({ item, consultationMode, onOpen, onOpenPatient }: { item: typeof consultations[number] | typeof followups[number] | null; consultationMode: boolean; onOpen: () => void; onOpenPatient: () => void }) { if (!item) return null; return <Card className="h-fit rounded-lg shadow-sm"><CardHeader><CardTitle>{item.name}</CardTitle><CardDescription>{item.mr} · {item.id}</CardDescription></CardHeader><CardContent className="space-y-4"><dl className="space-y-3 text-sm">{consultationMode ? <><Pair label="Clinician" value={'clinician' in item ? item.clinician : ''}/><Pair label="Chief concern" value={'reason' in item ? item.reason : ''}/></> : <><Pair label="Program" value={'program' in item ? item.program : ''}/><Pair label="Due date" value={'due' in item ? item.due : ''}/><Pair label="Assigned to" value={'assigned' in item ? item.assigned : ''}/></>}<Pair label="Status" value={item.status}/></dl><div className="flex gap-2 border-t pt-4"><Button className="flex-1" size="sm" onClick={onOpenPatient}><UserRound className="mr-2 size-4"/>Open patient profile</Button><Button className="flex-1" size="sm" variant="outline" onClick={onOpen}>{consultationMode ? <Stethoscope className="mr-2 size-4"/> : <CalendarPlus className="mr-2 size-4"/>}{consultationMode ? 'Open consultation' : 'Update follow-up'}</Button></div></CardContent></Card> }
function Pair({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div> }
function WorkflowEditor({ consultationMode, onClose }: { consultationMode: boolean; onClose: () => void }) { const [saved, setSaved] = useState(false); const fields = consultationMode ? ['MR number','Doctor','Chief concern','Diagnosis'] : ['MR number','Program','Review date','Assigned to','Priority','Status','Remarks']; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4"><Card className="w-full max-w-2xl rounded-lg shadow-xl"><CardHeader className="flex-row justify-between"><div><CardTitle>{consultationMode ? 'Clinical consultation' : 'Schedule follow-up'}</CardTitle><CardDescription>Enter an MR number to fetch the registered patient record.</CardDescription></div><Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close dialog"><X className="size-4"/></Button></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{fields.map((field) => <div key={field}><Label className="text-xs text-muted-foreground">{field}</Label>{['Priority','Status','Doctor','Assigned to'].includes(field) ? <select className="mt-1.5 h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option>{field === 'Priority' ? 'Normal' : field === 'Status' ? 'Scheduled' : 'Select staff'}</option></select> : <Input className="mt-1.5" type={field.includes('date') ? 'date' : 'text'} placeholder={field === 'MR number' ? 'NU000001 or AY000001' : undefined}/>}</div>)}<div className="md:col-span-2"><Label className="text-xs text-muted-foreground">{consultationMode ? 'Clinical notes and advice' : 'Remarks'}</Label><Textarea className="mt-1.5 min-h-32" placeholder="Add relevant clinical or scheduling notes..."/></div><div className="md:col-span-2 flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { setSaved(true); setTimeout(onClose, 500) }}>{saved ? <><Check className="mr-2 size-4"/>Saved</> : <><Plus className="mr-2 size-4"/>{consultationMode ? 'Save consultation' : 'Save follow-up'}</>}</Button></div></CardContent></Card></div> }
