'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, Plus, Printer, ReceiptText, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Line = { id: number; name: string; quantity: number; rate: number; amount: number }
type Invoice = {
  id: string; patient: string; mr: string; center: 'Nutrition Center' | 'Ayurcare Center'
  age: number; dob: string; bloodGroup: string; address: string; phone: string
  date: string; consultationType: string; items: Line[]; discount: number; tax: number
  paid: number; total: number; balance: number; status: 'Paid' | 'Pending' | 'Overdue'
  paymentMethod: string; remarks: string
}

const defaultInvoices: Invoice[] = [
  { id:'INV-90112', patient:'Aarav Sharma', mr:'NU000001', center:'Nutrition Center', age:34, dob:'15/06/1992', bloodGroup:'O+', address:'Bengaluru, Karnataka', phone:'98450 12345', date:'02 Jun 2026', consultationType:'Nutrition Consultation', items:[{id:1,name:'Nutrition consultation',quantity:1,rate:1800,amount:1800}], discount:0, tax:0, paid:0, total:1800, balance:1800, status:'Pending', paymentMethod:'', remarks:'' },
  { id:'INV-90230', patient:'Rohan Mehta', mr:'AY000001', center:'Ayurcare Center', age:45, dob:'10/03/1981', bloodGroup:'B+', address:'Pune, Maharashtra', phone:'90080 33221', date:'30 May 2026', consultationType:'Ayurcare Package', items:[{id:1,name:'Panchakarma session',quantity:1,rate:8900,amount:8900}], discount:0, tax:0, paid:0, total:8900, balance:8900, status:'Pending', paymentMethod:'', remarks:'' },
  { id:'INV-90301', patient:'Priya Nair', mr:'NU000002', center:'Nutrition Center', age:28, dob:'05/11/1998', bloodGroup:'A+', address:'Kochi, Kerala', phone:'99860 45678', date:'21 May 2026', consultationType:'Diet Review', items:[{id:1,name:'Weight management',quantity:1,rate:1200,amount:1200}], discount:0, tax:0, paid:1200, total:1200, balance:0, status:'Paid', paymentMethod:'UPI', remarks:'' },
]

export function money(value: number) {
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function invoicePrintHTML(invoice: Invoice) {
  const nutrition = invoice.center === 'Nutrition Center'
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const tagline = nutrition ? 'Lose Weight. Choose Health.' : 'Jubilee Bazar'
  const subline = nutrition ? 'Centre for Professional Weight Management' : ''
  const rowsHtml = invoice.items.map((item) => {
    const r = money(item.rate).replace('Rs. ', '')
    const a = money(item.amount).replace('Rs. ', '')
    return `<tr><td class="p-2 text-left">${item.name}</td><td class="p-2 text-center">${item.quantity}</td><td class="p-2 text-right">${r}</td><td class="p-2 text-right">${a}</td></tr>`
  }).join('')
  const disc = invoice.items.reduce((s, i) => s + i.amount, 0) * invoice.discount / 100
  const tax = invoice.items.reduce((s, i) => s + i.amount, 0) * (1 - invoice.discount / 100) * invoice.tax / 100
  return `<!doctype html><html><head><title>Invoice ${invoice.id}</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:11px}.header{text-align:center;border-bottom:2px solid #167b91;padding-bottom:10px;margin-bottom:12px}.clinic{font-size:24px;font-weight:700;color:#167b91}.tag{font-size:13px;font-weight:600;margin-top:2px}.subline{font-size:11px;color:#4b5563;margin-top:1px}.address{font-size:11px;color:#4b5563;margin-top:2px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px}.box{border:1px solid #b8c7cc;padding:8px 10px;border-radius:4px;background:#f7fafb}.box h4{margin:0 0 4px;font-size:11px;color:#167b91;text-transform:uppercase}.box p{margin:1px 0;font-size:11px}.title{font-size:13px;font-weight:700;text-transform:uppercase;margin:14px 0 6px}.table{width:100%;border-collapse:collapse;margin-top:6px}.table th,.table td{border:1px solid #b8c7cc;padding:6px 8px;text-align:left;font-size:11px}.table th{background:#edf5f6;font-weight:600}.summary{margin-top:10px;display:flex;justify-content:flex-end}.totals{width:260px}.row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px dotted #d1d5db}.row.grand{font-weight:700;font-size:13px;border-bottom:none;border-top:2px solid #167b91;padding-top:6px;margin-top:4px}.footer{margin-top:20px;text-align:center;font-size:10px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:6px}@media print{body{margin:0}}</style></head><body><div class="header"><div class="clinic">${clinic}</div><div class="tag">${tagline}</div>${subline ? '<div class="subline">' + subline + '</div>' : ''}<div class="address">JUBILEE BAZAR, ONDEN ROAD, KANNUR - 670001, KERALA<br>PH: 8111999581 / 8111999582</div></div><div class="two-col"><div class="box"><h4>Billed To</h4><p><b>${invoice.patient}</b></p><p>MR: ${invoice.mr} | Age: ${invoice.age} | BG: ${invoice.bloodGroup}</p><p>${invoice.address}</p><p>${invoice.phone}</p></div><div class="box"><h4>Invoice Details</h4><p><b>Invoice:</b> ${invoice.id}</p><p><b>Date:</b> ${invoice.date}</p><p><b>Type:</b> ${invoice.consultationType}</p><p><b>Status:</b> ${invoice.status}</p></div></div><div class="title">Invoice Items</div><table class="table"><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="4" class="center">No items</td></tr>'}</tbody></table><div class="summary"><div class="totals"><div class="row"><span>Subtotal</span><span>${money(invoice.items.reduce((s,i)=>s+i.amount,0))}</span></div>${invoice.discount ? '<div class="row"><span>Discount (' + invoice.discount + '%)</span><span>- ' + money(disc) + '</span></div>' : ''}<div class="row"><span>Tax (' + invoice.tax + '%)</span><span>' + money(tax) + '</span></div><div class="row grand"><span>Grand Total</span><span>' + money(invoice.total) + '</span></div><div class="row"><span>Paid</span><span>' + money(invoice.paid) + '</span></div><div class="row grand"><span>Balance</span><span>' + money(invoice.balance) + '</span></div></div></div><div class="footer">' + clinic + ' · Jubilee Bazar, Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582<br>Thank you for choosing us.</div></body></html>`
}

export function BillingWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>(defaultInvoices)
  const [selected, setSelected] = useState<Invoice | null>(defaultInvoices[0])
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Invoice>(defaultInvoices[0])
  const totals = useMemo(() => {
    const sub = formData.items.reduce((s, i) => s + i.amount, 0)
    const disc = sub * formData.discount / 100
    const taxable = sub - disc
    const tax = taxable * formData.tax / 100
    const total = taxable + tax
    return { subtotal: sub, discountValue: disc, taxValue: tax, total, balance: Math.max(0, total - formData.paid) }
  }, [formData])
  const updateForm = (key: keyof Invoice, value: any) => setFormData((p) => ({ ...p, [key]: value }))
  const updateLine = (id: number, key: keyof Line, value: string) => setFormData((p) => ({ ...p, items: p.items.map((item) => item.id === id ? { ...item, [key]: key === 'name' ? value : Math.max(0, Number(value) || 0), amount: key === 'quantity' ? Math.max(0, Number(value) || 0) * item.rate : key === 'rate' ? item.quantity * Math.max(0, Number(value) || 0) : item.amount } : item) }))
  const addLine = () => setFormData((p) => ({ ...p, items: [...p.items, { id: Date.now(), name: '', quantity: 1, rate: 0, amount: 0 }] }))
  const removeLine = (id: number) => setFormData((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }))
  const handleNewInvoice = () => {
    const newInvoice: Invoice = { id: 'INV-' + String(Date.now()).slice(-6), patient: '', mr: '', center: 'Nutrition Center', age: 0, dob: '', bloodGroup: '', address: '', phone: '', date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), consultationType: '', items: [{ id: Date.now(), name: '', quantity: 1, rate: 0, amount: 0 }], discount: 0, tax: 0, paid: 0, total: 0, balance: 0, status: 'Pending', paymentMethod: '', remarks: '' }
    setFormData(newInvoice)
    setSelected(newInvoice)
    setEditing(true)
  }
  const handleSave = () => { setInvoices((prev) => { const idx = prev.findIndex((inv) => inv.id === formData.id); if (idx >= 0) { const next = [...prev]; next[idx] = formData; return next } return [...prev, formData] }); setSelected(formData); setEditing(false) }
  const handlePrint = (invoice: Invoice) => { const w = window.open('', '_blank', 'noopener,noreferrer'); if (!w) return; w.document.write(invoicePrintHTML(invoice)); w.document.close(); w.focus(); w.print() }
  const handleExportPDF = (invoice: Invoice) => { const w = window.open('', '_blank', 'noopener,noreferrer'); if (!w) return; w.document.write(invoicePrintHTML(invoice)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300) }
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-medium uppercase tracking-wider text-primary">Accounts</p><h1 className="mt-1 font-display text-2xl font-semibold">Central Billing</h1><p className="mt-1 text-sm text-muted-foreground">Create invoices, record payments, and manage clinic receivables.</p></div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 size-4"/>Print list</Button>
        <Button variant="outline" size="sm" onClick={() => { const csv = invoices.map(i => [i.id,i.patient,i.mr,i.center,i.date,i.consultationType,money(i.total),i.status].join(',')).join('\n'); const blob = new Blob(['\uFEFFInvoice,Patient,MR,Center,Date,Type,Total,Status\n' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'billing_' + new Date().toISOString().slice(0,10) + '.csv'; a.click(); URL.revokeObjectURL(url) }}><FileText className="mr-2 size-4"/>Export</Button>
        <Button size="sm" onClick={handleNewInvoice}><Plus className="mr-2 size-4"/>New invoice</Button>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Today collected" value={money(invoices.reduce((s, i) => s + (i.status === 'Paid' ? i.total : 0), 0))}/>
      <Metric label="Outstanding" value={money(invoices.reduce((s, i) => s + i.balance, 0))}/>
      <Metric label="Open invoices" value={String(invoices.length)}/>
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader><CardTitle>Invoices</CardTitle><CardDescription>Select an invoice to review its billing details.</CardDescription></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Centre</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-right">Balance</th></tr></thead>
              <tbody>{invoices.map((invoice) => <tr key={invoice.id} onClick={() => { setSelected(invoice); setEditing(false) }} className={'cursor-pointer border-b hover:bg-muted/50 ' + (selected && selected.id === invoice.id ? 'bg-primary/5' : '')}><td className="px-5 py-4 font-medium text-primary">{invoice.id}</td><td className="px-5 py-4"><p className="font-medium">{invoice.patient || '—'}</p><p className="text-xs text-muted-foreground">{invoice.mr}</p></td><td className="px-5 py-4 text-sm text-muted-foreground">{invoice.center}</td><td className="px-5 py-4 text-sm text-muted-foreground">{invoice.date}</td><td className="px-5 py-4 text-right font-semibold">{money(invoice.total)}</td><td className="px-5 py-4 text-right"><span className={cn('rounded-md px-2.5 py-0.5 text-xs font-semibold', invoice.status === 'Paid' ? 'bg-primary/10 text-primary' : invoice.status === 'Overdue' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800')}>{invoice.status}</span><p className="text-xs text-muted-foreground">{money(invoice.balance)}</p></td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {selected && !editing ? <InvoiceDetail invoice={selected} onEdit={() => { setFormData(selected); setEditing(true) }} onPrint={() => handlePrint(selected)} onExport={() => handleExportPDF(selected)} /> : editing && selected ? <InvoiceEditor invoice={formData} updateForm={updateForm} updateLine={updateLine} totals={totals} addLine={addLine} removeLine={removeLine} onClose={() => { setEditing(false); setFormData(selected) }} onSave={handleSave} /> : <InvoiceEmpty onNew={handleNewInvoice} />}
    </div>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <Card className="rounded-lg shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></CardContent></Card> }
function InvoiceEmpty({ onNew }: { onNew: () => void }) { return <Card className="h-fit rounded-lg shadow-sm"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><ReceiptText className="size-10 text-muted-foreground mb-3"/><p className="text-sm font-medium">No invoice selected</p><p className="mt-1 text-xs text-muted-foreground">Select an invoice from the list or create a new one.</p><Button className="mt-4" size="sm" onClick={onNew}><Plus className="mr-2 size-4"/>New invoice</Button></CardContent></Card> }
function InvoiceDetail({ invoice, onEdit, onPrint, onExport }: { invoice: Invoice; onEdit: () => void; onPrint: () => void; onExport: () => void }) {
  const nutrition = invoice.center === 'Nutrition Center'
  return <Card className="h-fit rounded-lg shadow-sm">
    <CardHeader className="border-b">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1"><span className="font-display text-lg font-semibold">{nutrition ? 'NEW YOU' : 'Ayurcare Center'}</span></div>
          <p className="text-xs text-muted-foreground">{nutrition ? 'Centre for Professional Weight Management' : 'Jubilee Bazar'}</p>
          <p className="text-xs text-muted-foreground">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</p>
        </div>
        <span className={cn('rounded-md px-2 py-1 text-xs font-medium', invoice.status === 'Paid' ? 'bg-primary/10 text-primary' : invoice.status === 'Overdue' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-800')}>{invoice.status}</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="font-semibold">{invoice.patient}</p><p className="text-xs text-muted-foreground">MR: {invoice.mr}</p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">{invoice.id}</p><p className="text-xs text-muted-foreground">{invoice.date}</p></div>
        <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Age: {invoice.age}</span><span>Blood: {invoice.bloodGroup}</span><span>Phone: {invoice.phone}</span>
          <span className="col-span-2">{invoice.address}</span>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(invoice.items.reduce((s,i)=>s+i.amount,0))}</span></div>
        {invoice.discount > 0 && <div className="flex justify-between text-sm"><span>Discount ({invoice.discount}%)</span><span>- {money(invoice.items.reduce((s,i)=>s+i.amount,0)*invoice.discount/100)}</span></div>}
        <div className="flex justify-between text-sm"><span>Tax ({invoice.tax}%)</span><span>{money(invoice.items.reduce((s,i)=>s+i.amount,0)*(1-invoice.discount/100)*invoice.tax/100)}</span></div>
        <div className="flex justify-between border-t pt-2 font-semibold text-base"><span>Grand Total</span><span>{money(invoice.total)}</span></div>
        <div className="flex justify-between text-sm"><span>Paid</span><span>{money(invoice.paid)}</span></div>
        <div className="flex justify-between font-semibold text-destructive"><span>Balance due</span><span>{money(invoice.balance)}</span></div>
      </div>
      <p className="text-xs text-muted-foreground"><b>Consultation:</b> {invoice.consultationType || 'General'} · <b>Method:</b> {invoice.paymentMethod || 'Not specified'}</p>
      {invoice.remarks && <p className="text-xs text-muted-foreground"><b>Remarks:</b> {invoice.remarks}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onEdit}>Edit invoice</Button>
        <Button size="sm" variant="outline" onClick={onPrint}><Printer className="mr-2 size-4"/>Print</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button className="w-full" size="sm" variant="outline" onClick={onExport}><Download className="mr-2 size-4"/>Export PDF</Button>
        <Button className="w-full" size="sm" variant="outline"><ReceiptText className="mr-2 size-4"/>Record payment</Button>
      </div>
    </CardContent>
  </Card>
}
function InvoiceEditor({ invoice, updateForm, updateLine, totals, addLine, removeLine, onClose, onSave }: { invoice: Invoice; updateForm: (k: keyof Invoice, v: any) => void; updateLine: (id: number, key: keyof Line, value: string) => void; totals: { subtotal: number; discountValue: number; taxValue: number; total: number; balance: number }; addLine: () => void; removeLine: (id: number) => void; onClose: () => void; onSave: () => void }) {
  const fmt = (v: number) => 'Rs. ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  return <Card className="h-fit rounded-lg shadow-sm">
    <CardHeader className="flex-row items-start justify-between border-b">
      <div>
        <span className="font-display text-lg font-semibold">{(invoice.center === 'Nutrition Center' ? 'NEW YOU' : 'Ayurcare Center')}</span>
        <p className="text-xs text-muted-foreground">{(invoice.center === 'Nutrition Center' ? 'Centre for Professional Weight Management' : 'Jubilee Bazar')}</p>
        <p className="text-xs text-muted-foreground">Onden Road, Kannur - 670001, Kerala · PH: 8111999581 / 8111999582</p>
        <p className="text-xs text-muted-foreground mt-1">Invoice: {invoice.id} · Date: {invoice.date}</p>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close editor"><X className="size-4"/></Button>
    </CardHeader>
    <CardContent className="space-y-4 pt-5">
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Patient name"><Input value={invoice.patient} onChange={(e) => updateForm('patient', e.target.value)}/></FormField>
        <FormField label="MR number"><Input value={invoice.mr} onChange={(e) => updateForm('mr', e.target.value)}/></FormField>
        <FormField label="Centre">
          <select className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm" value={invoice.center} onChange={(e) => updateForm('center', e.target.value)}><option>Nutrition Center</option><option>Ayurcare Center</option></select>
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Age"><Input inputMode="numeric" value={String(invoice.age)} onChange={(e) => updateForm('age', Number(e.target.value) || 0)}/></FormField>
        <FormField label="Blood Group">
          <select className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm" value={invoice.bloodGroup} onChange={(e) => updateForm('bloodGroup', e.target.value)}><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select>
        </FormField>
        <FormField label="Phone"><Input value={invoice.phone} onChange={(e) => updateForm('phone', e.target.value)}/></FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Address"><Textarea className="min-h-16" value={invoice.address} onChange={(e) => updateForm('address', e.target.value)}/></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Invoice Date"><Input value={invoice.date} onChange={(e) => updateForm('date', e.target.value)}/></FormField>
          <FormField label="Type"><Input value={invoice.consultationType} onChange={(e) => updateForm('consultationType', e.target.value)}/></FormField>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Discount (%)"><Input type="number" value={invoice.discount} onChange={(e) => updateForm('discount', Number(e.target.value) || 0)}/></FormField>
        <FormField label="Tax (%)"><Input type="number" value={invoice.tax} onChange={(e) => updateForm('tax', Number(e.target.value) || 0)}/></FormField>
        <FormField label="Payment">
          <select className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm" value={invoice.paymentMethod} onChange={(e) => updateForm('paymentMethod', e.target.value)}><option value="">Select</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank</option><option>Insurance</option></select>
        </FormField>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between"><Label className="text-xs text-muted-foreground">Billing items</Label><Button variant="ghost" size="sm" onClick={addLine}><Plus className="mr-1 size-3.5"/>Add item</Button></div>
        <div className="space-y-2">{invoice.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_56px_72px_28px] gap-1.5">
          <Input placeholder="Service" value={item.name} onChange={(e) => updateLine(item.id,'name',e.target.value)}/>
          <Input value={String(item.quantity)} onChange={(e) => updateLine(item.id,'quantity',e.target.value)} className="text-center"/>
          <Input value={String(item.rate)} onChange={(e) => updateLine(item.id,'rate',e.target.value)} className="text-right"/>
          <Button variant="ghost" size="icon-sm" onClick={() => removeLine(item.id)} className="size-7" aria-label="Remove"><Trash2 className="size-3.5 text-destructive"/></Button>
        </div>)}</div>
      </div>
      <div className="rounded-lg bg-muted p-3 space-y-1">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
        {totals.discountValue > 0 && <div className="flex justify-between text-sm"><span>Discount</span><span>- {fmt(totals.discountValue)}</span></div>}
        <div className="flex justify-between text-sm"><span>Tax</span><span>{fmt(totals.taxValue)}</span></div>
        <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{fmt(totals.total)}</span></div>
        <div className="flex justify-between text-sm"><span>Paid</span><span>{fmt(invoice.paid)}</span></div>
        <div className="flex justify-between font-semibold text-destructive"><span>Balance</span><span>{fmt(totals.balance)}</span></div>
      </div>
      <FormField label="Remarks"><Textarea className="min-h-16" value={invoice.remarks} onChange={(e) => updateForm('remarks', e.target.value)} placeholder="Payment terms or notes"/></FormField>
      <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave}>Save invoice</Button></div>
    </CardContent>
  </Card>
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="text-xs text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div> }
