'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RegistrationChart } from '@/components/dashboard/registration-chart'
import { ConsultationPie } from '@/components/dashboard/consultation-pie'

const reportRows = [
  ['Daily Revenue Summary', '11 Jul 2026', 'Revenue, payments, outstanding'],
  ['Patient Registration Report', '01-11 Jul 2026', 'New registrations by centre'],
  ['Consultation Activity', '01-11 Jul 2026', 'Visits by clinician and status'],
  ['Pending Bills', 'As of 11 Jul 2026', 'Unsettled invoice balances'],
]

export function ReportsWorkspace() {
  const [from, setFrom] = useState('2026-07-01')
  const [to, setTo] = useState('2026-07-11')
  const [center, setCenter] = useState('All centres')
  const printReport = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Clinic Reports</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px;text-align:center}.clinic{font-size:22px;font-weight:700;color:#167b91}.address{color:#4b5563;margin-top:4px;font-size:11px}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.meta{display:flex;justify-content:space-between;font-size:11px;margin-bottom:12px;color:#4b5563}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:11px}.table th{background:#edf5f6}.section{margin-top:18px}.sub{font-size:13px;font-weight:600;margin:14px 0 6px}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">NEW YOU & Ayurcare Center</div><div class="address">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</div></header><div class="title">Operational Reports</div><div class="meta"><span>Period: ${from} to ${to}</span><span>Center: ${center}</span></div><table class="table"><thead><tr><th>Report</th><th>Period</th><th>Description</th></tr></thead><tbody>${reportRows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table><div class="section"><p class="sub">Summaries</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="border:1px solid #b8c7cc;padding:10px;border-radius:4px;background:#f7fafb"><p style="font-size:11px;color:#4b5563">Total Revenue</p><p style="font-size:16px;font-weight:700;margin-top:4px">Rs. 4,82,600</p></div><div style="border:1px solid #b8c7cc;padding:10px;border-radius:4px;background:#f7fafb"><p style="font-size:11px;color:#4b5563">Outstanding</p><p style="font-size:16px;font-weight:700;margin-top:4px">Rs. 1,12,400</p></div></div></div></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }
  return <div className="mx-auto max-w-[1600px] space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">Analytics</p><h1 className="mt-1 font-display text-2xl font-semibold">Reports & Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Operational, financial, and patient-care performance across the clinic.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={printReport}><Printer className="mr-2 size-4"/>Print report</Button><Button variant="outline" size="sm" onClick={() => alert('PDF report queued for the selected period.')}><Download className="mr-2 size-4"/>Export PDF</Button><Button size="sm" onClick={() => alert('Excel export queued for the selected period.')}><FileSpreadsheet className="mr-2 size-4"/>Export Excel</Button></div></div><Card className="rounded-lg shadow-sm"><CardContent className="flex flex-wrap items-end gap-3 p-4"><div><label className="text-xs text-muted-foreground">From date</label><Input className="mt-1.5" type="date" value={from} onChange={(e) => setFrom(e.target.value)}/></div><div><label className="text-xs text-muted-foreground">To date</label><Input className="mt-1.5" type="date" value={to} onChange={(e) => setTo(e.target.value)}/></div><div><label className="text-xs text-muted-foreground">Consultation centre</label><select value={center} onChange={(e) => setCenter(e.target.value)} className="mt-1.5 h-8 min-w-40 rounded-lg border border-input bg-background px-2.5 text-sm"><option>All centres</option><option>Nutrition Center</option><option>Ayurcare Center</option></select></div><Button size="sm">Apply filters</Button><p className="ml-auto text-xs text-muted-foreground">Period: {from} to {to} · {center}</p></CardContent></Card><div className="grid grid-cols-2 gap-4 xl:grid-cols-5"><Kpi label="Revenue" value="Rs. 4,82,600" trend="12.4% vs prior period"/><Kpi label="Registrations" value="128" trend="8.1% vs prior period"/><Kpi label="Visits" value="342" trend="4.3% vs prior period"/><Kpi label="Pending bills" value="Rs. 1,12,400" trend="2 overdue"/><Kpi label="Occupancy" value="86%" trend="+4% vs prior period"/></div><div className="grid gap-4 lg:grid-cols-3"><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader><CardContent><RevenueChart /></CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Registrations</CardTitle></CardHeader><CardContent><RegistrationChart /></CardContent></Card><Card className="rounded-lg shadow-sm"><CardHeader><CardTitle>Consultation mix</CardTitle></CardHeader><CardContent><ConsultationPie /></CardContent></Card></div></div>
}
function Kpi({ label, value, trend }: { label: string; value: string; trend: string }) { return <Card className="rounded-lg shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-2 text-xs text-primary">{trend}</p></CardContent></Card> }
