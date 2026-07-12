'use client'

import { useState } from 'react'
import { Download, Pencil, Plus, Printer, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface NutritionRow {
  mr: string; name: string; phone: string; dietPlan: string; observations: string; recommendations: string; notes: string; clinician: string; review: string; status: string
}
interface AyurRow {
  mr: string; name: string; phone: string; diagnosis: string; treatmentPlan: string; medicines: string; procedures: string; therapies: string; advice: string; notes: string; clinician: string; review: string; status: string
}

const nutritionRows: NutritionRow[] = [
  { mr:'NU000001', name:'Aarav Sharma', phone:'98450 12345', dietPlan:'Diabetes nutrition plan', observations:'HbA1c 7.2%, overweight', recommendations:'Low carb, high fiber', notes:'Patient compliant', clinician:'Dr. Neha Verma', review:'16 Jul 2026', status:'Due' },
  { mr:'NU000002', name:'Priya Nair', phone:'99860 45678', dietPlan:'Weight management', observations:'BMI 28.4', recommendations:'Calorie deficit 500 kcal/day', notes:'Monthly review scheduled', clinician:'Dr. Neha Verma', review:'18 Jul 2026', status:'Active' },
]
const ayurRows: AyurRow[] = [
  { mr:'AY000001', name:'Rohan Mehta', phone:'90080 33221', diagnosis:'Vata imbalance', treatmentPlan:'Panchakarma program', medicines:'Arishtam, Asavam', procedures:'Abhyanga, Shirodhara', therapies:'Panchakarma - 5 sessions', advice:'Avoid cold foods, maintain routine', notes:'Progressing well', clinician:'Dr. Arjun Das', review:'14 Jul 2026', status:'Active' },
  { mr:'AY000002', name:'Anjali Menon', phone:'98765 21430', diagnosis:'Skin disorder', treatmentPlan:'Herbal therapy', medicines:'Guggulu based', procedures:'Lepanam', therapies:'Internal medications', advice:'Follow diet restrictions', notes:'First week response good', clinician:'Dr. Arjun Das', review:'17 Jul 2026', status:'Planned' },
]

type AnyRow = NutritionRow | AyurRow

export function CareWorkspace({ kind }: { kind: 'nutrition' | 'ayurcare' }) {
  const nutrition = kind === 'nutrition'
  const title = nutrition ? 'Nutrition Management' : 'Ayurcare Management'
  const action = nutrition ? 'New assessment' : 'New treatment'
  const rows = nutrition ? nutritionRows : ayurRows
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(false)
  const [selected, setSelected] = useState<AnyRow | null>(null)
  const [detailTab, setDetailTab] = useState<'summary' | 'history'>('summary')
  const filtered = rows.filter((row) => `${row.mr} ${row.name} ${row.phone} ${row.clinician}`.toLowerCase().includes(query.toLowerCase()))
  const handleDelete = (mr: string) => { const remaining = rows.filter((r) => r.mr !== mr); nutritionRows.splice(0, nutritionRows.length, ...(remaining as NutritionRow[])); ayurRows.splice(0, ayurRows.length, ...(remaining as AyurRow[])); setSelected(null) }
  return <div className="mx-auto max-w-[1600px] space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">Clinical Care</p><h1 className="mt-1 font-display text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{nutrition ? 'Assess nutrition outcomes, document diet plans, and review progress.' : 'Manage Ayurvedic treatment plans, therapies, and clinical follow-up.'}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 size-4"/>Print</Button><Button size="sm" variant="outline" onClick={() => alert('Exported.')}><Download className="mr-2 size-4"/>Export PDF</Button><Button size="sm" onClick={() => { setSelected(null); setEditor(true) }}><Plus className="mr-2 size-4"/>{action}</Button></div></div><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><Card className="rounded-lg shadow-sm"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>{nutrition ? 'Assessments' : 'Treatment plans'}</CardTitle><CardDescription>Click a patient to review or update clinical care.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/><Input className="w-56 pl-8" placeholder="Search MR or patient" value={query} onChange={(e) => setQuery(e.target.value)}/></div></CardHeader><CardContent className="px-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr>{nutrition ? ['Patient','Phone','Diet Plan','Dietitian','Review date','Status'] : ['Patient','Phone','Treatment Plan','Practitioner','Review date','Status'].map((h) => <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.mr} onClick={() => setSelected(row)} className="cursor-pointer border-b hover:bg-muted/50"><td className="px-5 py-4"><p className="font-medium">{row.name}</p><p className="text-xs text-primary">{row.mr}</p></td><td className="px-5 py-4 text-sm text-muted-foreground">{row.phone}</td><td className="px-5 py-4">{row.dietPlan || row.treatmentPlan}</td><td className="px-5 py-4 text-sm text-muted-foreground">{row.clinician}</td><td className="px-5 py-4 text-sm">{row.review}</td><td className="px-5 py-4"><StatusBadge status={row.status}/></td></tr>)}</tbody></table></div></CardContent></Card>{selected ? <CareDetailPanel key={selected.mr} selected={selected} nutrition={nutrition} detailTab={detailTab} setDetailTab={setDetailTab} onEdit={() => setEditor(true)} onDelete={() => handleDelete(selected.mr)} /> : <CareSummary nutrition={nutrition} onNew={() => { setSelected(null); setEditor(true) }} />}</div>{editor && <CareEditor nutrition={nutrition} patient={selected} onClose={() => setEditor(false)} />}</div>
}
function StatusBadge({ status }: { status: string }) { const className = ['Active','Completed'].includes(status) ? 'bg-primary/10 text-primary' : ['Cancelled','Inactive'].includes(status) ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800'; return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{status}</span> }
function CareSummary({ nutrition, onNew }: { nutrition: boolean; onNew: () => void }) { return <Card className="h-fit rounded-lg shadow-sm"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><p className="text-sm text-muted-foreground">No patient selected.</p><p className="mt-1 text-xs text-muted-foreground">Click a patient row to view details.</p><Button className="mt-4" size="sm" onClick={onNew}><Plus className="mr-2 size-4"/>Create record</Button></CardContent></Card> }
function CareDetailPanel({ selected, nutrition, detailTab, setDetailTab, onEdit, onDelete }: { selected: AnyRow; nutrition: boolean; detailTab: 'summary' | 'history'; setDetailTab: (t: 'summary' | 'history') => void; onEdit: () => void; onDelete: () => void }) {
  return <Card className="h-fit rounded-lg shadow-sm"><CardHeader><CardTitle>{selected.name}</CardTitle><CardDescription>{selected.mr} · {selected.phone}</CardDescription></CardHeader><CardContent>
    <div className="mb-4 flex gap-2 border-b">
      <button type="button" onClick={() => setDetailTab('summary')} className={cn('pb-2 text-sm font-medium', detailTab === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground')}>Summary</button>
      <button type="button" onClick={() => setDetailTab('history')} className={cn('pb-2 text-sm font-medium', detailTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground')}>Treatment history</button>
    </div>
    {detailTab === 'summary' ? <div className="space-y-4">
      <dl className="space-y-3 text-sm">
        <Pair label={nutrition ? 'Program' : 'Treatment plan'} value={selected.dietPlan || selected.treatmentPlan}/>
        <Pair label={nutrition ? 'Dietitian' : 'Practitioner'} value={selected.clinician}/>
        <Pair label="Review date" value={selected.review}/>
        <Pair label="Status" value={selected.status}/>
      </dl>
      <div className="border-t pt-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Notes</p>
        <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.notes || selected.observations || selected.diagnosis || 'No notes'}</p></div>
      </div>
      {nutrition && <div><p className="mb-2 text-xs font-medium text-muted-foreground">Recommendations</p><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.recommendations || 'Not specified'}</p></div></div>}
      {!nutrition && <div className="space-y-3">
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Medicines</p><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.medicines || 'Not specified'}</p></div></div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Procedures</p><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.procedures || 'Not specified'}</p></div></div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Therapies</p><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.therapies || 'Not specified'}</p></div></div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Advice</p><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{selected.advice || 'Not specified'}</p></div></div>
      </div>}
      <div className="flex gap-2 border-t pt-4">
        <Button className="flex-1" size="sm" onClick={onEdit}><Pencil className="mr-2 size-4"/>Edit</Button>
        <Button className="flex-1" size="sm" variant="outline" onClick={() => alert('Exported.')}><Download className="mr-2 size-4"/>Export</Button>
        <Button className="flex-1" size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 size-4"/>Print</Button>
        <Button className="flex-1" size="sm" variant="destructive" onClick={onDelete}><Trash2 className="mr-2 size-4"/>Delete</Button>
      </div>
    </div> : <div className="space-y-3">
      <div className="rounded-lg bg-muted p-4 text-sm"><p className="font-medium">Initial consultation</p><p className="mt-1 text-xs text-muted-foreground">02 Jun 2026 · Clinical notes recorded</p></div>
      <div className="rounded-lg bg-muted p-4 text-sm"><p className="font-medium">Follow-up review</p><p className="mt-1 text-xs text-muted-foreground">16 Jul 2026 · {selected.review}</p></div>
    </div>}
  </CardContent></Card>
}
function Pair({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div> }
function CareEditor({ nutrition, patient, onClose }: { nutrition: boolean; patient: AnyRow | null; onClose: () => void }) {
  const [saved, setSaved] = useState(false)
  const fields = nutrition
    ? ['Assessment date','Program','Weight','BMI','Body fat','Diet plan','Observations','Recommendations','Notes','Review date','Dietitian']
    : ['Diagnosis','Treatment plan','Medicines','Procedures','Therapies','Advice','Notes','Practitioner','Review date']
  const multiFields = ['Diet plan','Observations','Recommendations','Notes','Advice','Diagnosis','Treatment plan','Medicines','Procedures','Therapies']
  const dateFields = ['Assessment date','Review date']
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
    <Card className="max-h-[90svh] w-full max-w-3xl overflow-y-auto rounded-lg shadow-xl">
      <CardHeader className="flex-row justify-between">
        <div><CardTitle>{nutrition ? 'Nutrition assessment' : 'Ayurcare treatment plan'}</CardTitle><CardDescription>{patient ? `${patient.name} · ${patient.mr}` : 'Enter an MR number to begin a new clinical record.'}</CardDescription></div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close editor"><X className="size-4"/></Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">MR number</Label><div className="mt-1.5 flex gap-2"><Input defaultValue={patient?.mr} placeholder={nutrition ? 'NU000001' : 'AY000001'}/><Button variant="outline" size="sm">Fetch patient</Button></div></div>
        {fields.map((field) => {
          const isMulti = multiFields.includes(field)
          const isDate = dateFields.includes(field)
          const defaultValue = field === 'Program' || field === 'Treatment plan' ? (patient?.dietPlan || patient?.treatmentPlan || '') : field === 'Dietitian' || field === 'Practitioner' ? (patient?.clinician || '') : ''
          return <div key={field} className={isMulti ? 'md:col-span-2' : ''}><Label className="text-xs text-muted-foreground">{field}</Label>{isMulti ? <Textarea className="mt-1.5 min-h-20" placeholder={field} defaultValue={defaultValue}/> : <Input className="mt-1.5" type={isDate ? 'date' : 'text'} defaultValue={defaultValue}/>}</div>
        })}
        <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { setSaved(true); setTimeout(onClose, 500) }}>{saved ? <><Check className="mr-2 size-4"/>Saved</> : <><Plus className="mr-2 size-4"/>Save record</>}</Button>
        </div>
      </CardContent>
    </Card>
  </div>
}
