'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, FileText, Plus, Printer, ReceiptText, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Center = 'nutrition' | 'ayurcare'

type Patient = {
  name: string
  mrNumber: string
  age: string
  dob: string
  gender: string
  bloodGroup: string
  address: string
  contact: string
}

type Line = { id: number; name: string; quantity: number; rate: number }

type Invoice = {
  id: string
  center: Center
  billType: string
  patient: Patient
  date: string
  items: Line[]
  discount: number
  tax: number
  paid: number
  paymentMethod: string
}

/* ------------------------------------------------------------------ */
/*  Center letterheads                                                  */
/* ------------------------------------------------------------------ */

const CENTERS: Record<Center, { name: string; subheading?: string; tagline?: string; address: string; phones: string }> = {
  nutrition: {
    name: 'New You',
    subheading: 'Lose Weight. Choose Health.',
    tagline: 'Center for Professional Weight Management',
    address: 'Jubilee Bazar, Onden Road, Kannur - 670001, Kerala, India',
    phones: 'Ph: 8111999581, 8111999582',
  },
  ayurcare: {
    name: 'Ayurcare Center',
    address: 'Jubilee Bazar, Onden Road, Kannur - 670001, Kerala, India',
    phones: 'Ph: 8111999581, 8111999582',
  },
}

const BILL_TYPE_PRESETS = ['Consultation Bill', 'Lab Test Bill', 'Pharmacy Bill', 'Therapy / Procedure Bill', 'Package Bill', 'Other']

/* ------------------------------------------------------------------ */
/*  Patient directory — lookup by MR number (replace with a real API   */
/*  call in production, e.g. GET /api/patients/:mrNumber)              */
/* ------------------------------------------------------------------ */

const PATIENT_DIRECTORY: Record<string, Omit<Patient, 'mrNumber'>> = {
  NU000001: { name: 'Aarav Sharma', age: '34', dob: '1992-03-12', gender: 'Male', bloodGroup: 'B+', address: 'Thalassery, Kannur', contact: '9847012345' },
  AY000001: { name: 'Rohan Mehta', age: '41', dob: '1985-07-05', gender: 'Male', bloodGroup: 'O+', address: 'Kannur Town', contact: '9847098765' },
  NU000002: { name: 'Priya Nair', age: '29', dob: '1997-01-18', gender: 'Female', bloodGroup: 'A+', address: 'Kanhangad, Kasaragod', contact: '9847011223' },
}

/* ------------------------------------------------------------------ */
/*  Date / age / validation helpers                                    */
/* ------------------------------------------------------------------ */

function computeAgeFromDob(dob: string): string {
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
}

function formatDob(dob: string): string {
  if (!dob) return '-'
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return dob
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MOBILE_REGEX = /^\d{10}$/

// Professional, standard fonts — clean sans for the on-screen workspace,
// classic serif for the printed/exported hospital bill.
const UI_FONT = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", ui-sans-serif, system-ui, sans-serif'
const PRINT_FONT = '"Times New Roman", Times, Georgia, serif'

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */

const emptyPatient: Patient = { name: '', mrNumber: '', age: '', dob: '', gender: '', bloodGroup: '', address: '', contact: '' }

const seedInvoices: Invoice[] = [
  {
    id: 'INV-90112',
    center: 'nutrition',
    billType: 'Consultation Bill',
    patient: { name: 'Aarav Sharma', mrNumber: 'NU000001', age: '34', dob: '1992-03-12', gender: 'Male', bloodGroup: 'B+', address: 'Thalassery, Kannur', contact: '9847012345' },
    date: '02 Jun 2026',
    items: [{ id: 1, name: 'Nutrition consultation', quantity: 1, rate: 1800 }],
    discount: 0,
    tax: 0,
    paid: 0,
    paymentMethod: 'Cash',
  },
  {
    id: 'INV-90230',
    center: 'ayurcare',
    billType: 'Therapy / Procedure Bill',
    patient: { name: 'Rohan Mehta', mrNumber: 'AY000001', age: '41', dob: '1985-07-05', gender: 'Male', bloodGroup: 'O+', address: 'Kannur Town', contact: '9847098765' },
    date: '30 May 2026',
    items: [
      { id: 1, name: 'Abhyanga therapy (7 days)', quantity: 7, rate: 900 },
      { id: 2, name: 'Consultation fee', quantity: 1, rate: 800 },
    ],
    discount: 5,
    tax: 0,
    paid: 0,
    paymentMethod: 'UPI',
  },
  {
    id: 'INV-90301',
    center: 'nutrition',
    billType: 'Consultation Bill',
    patient: { name: 'Priya Nair', mrNumber: 'NU000002', age: '29', dob: '1997-01-18', gender: 'Female', bloodGroup: 'A+', address: 'Kanhangad, Kasaragod', contact: '9847011223' },
    date: '21 May 2026',
    items: [{ id: 1, name: 'Follow-up consultation', quantity: 1, rate: 1200 }],
    discount: 0,
    tax: 0,
    paid: 1200,
    paymentMethod: 'Card',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (value: number) => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function computeTotals(items: Line[], discount: number, tax: number, paid: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const discountValue = subtotal * (discount / 100)
  const taxable = subtotal - discountValue
  const taxValue = taxable * (tax / 100)
  const total = taxable + taxValue
  const balance = Math.max(0, total - paid)
  return { subtotal, discountValue, taxValue, total, balance }
}

/* ------------------------------------------------------------------ */
/*  Root workspace                                                      */
/* ------------------------------------------------------------------ */

export function BillingWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)

  const todayCollected = useMemo(
    () => invoices.reduce((sum, inv) => sum + Math.min(inv.paid, computeTotals(inv.items, inv.discount, inv.tax, inv.paid).total), 0),
    [invoices],
  )
  const outstanding = useMemo(
    () => invoices.reduce((sum, inv) => sum + computeTotals(inv.items, inv.discount, inv.tax, inv.paid).balance, 0),
    [invoices],
  )
  const openCount = useMemo(
    () => invoices.filter((inv) => computeTotals(inv.items, inv.discount, inv.tax, inv.paid).balance > 0).length,
    [invoices],
  )

  const handleSaveInvoice = (invoice: Invoice) => {
    setInvoices((current) => {
      const exists = current.some((inv) => inv.id === invoice.id)
      return exists ? current.map((inv) => (inv.id === invoice.id ? invoice : inv)) : [invoice, ...current]
    })
    setCreating(false)
    setViewInvoice(invoice)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6" style={{ fontFamily: UI_FONT }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Accounts</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Central Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create invoices, record payments, and manage clinic receivables across New You Nutrition Center and Ayurcare Center.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print list
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 size-4" />
            New invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Today collected" value={money(todayCollected)} />
        <Metric label="Outstanding" value={money(outstanding)} />
        <Metric label="Open invoices" value={String(openCount)} />
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Click any row to view, print, or export the bill.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Center</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Bill type</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const totals = computeTotals(invoice.items, invoice.discount, invoice.tax, invoice.paid)
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => setViewInvoice(invoice)}
                      className="cursor-pointer border-b hover:bg-muted/50"
                    >
                      <td className="px-5 py-4 font-medium text-primary">{invoice.id}</td>
                      <td className="px-5 py-4 text-muted-foreground">{CENTERS[invoice.center].name}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{invoice.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.patient.mrNumber}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{invoice.billType}</td>
                      <td className="px-5 py-4 text-muted-foreground">{invoice.date}</td>
                      <td className="px-5 py-4 text-right">{money(totals.total)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={totals.balance ? 'text-destructive' : 'text-primary'}>{money(totals.balance)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {creating && <NewInvoiceModal onClose={() => setCreating(false)} onSave={handleSaveInvoice} />}
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Modal shell (self-contained, no external Dialog dependency)         */
/* ------------------------------------------------------------------ */

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 print:static print:bg-transparent print:p-0" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`no-print-shadow w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} rounded-xl bg-background shadow-2xl print:max-w-none print:rounded-none print:shadow-none`}>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  New invoice creation                                                */
/* ------------------------------------------------------------------ */

function NewInvoiceModal({ onClose, onSave }: { onClose: () => void; onSave: (invoice: Invoice) => void }) {
  const [center, setCenter] = useState<Center>('nutrition')
  const [billType, setBillType] = useState(BILL_TYPE_PRESETS[0])
  const [patient, setPatient] = useState<Patient>(emptyPatient)
  const [mrStatus, setMrStatus] = useState<'idle' | 'found' | 'new'>('idle')
  const [items, setItems] = useState<Line[]>([{ id: Date.now(), name: '', quantity: 1, rate: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [paid, setPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  const totals = useMemo(() => computeTotals(items, discount, tax, paid), [items, discount, tax, paid])

  const updateLine = (id: number, key: keyof Line, value: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: key === 'name' ? value : Math.max(0, Number(value) || 0) } : item)))

  const updatePatient = (key: keyof Patient, value: string) => setPatient((current) => ({ ...current, [key]: value }))

  // MR number is the lookup key: as soon as it matches a record on file,
  // the rest of the patient's details are fetched and auto-filled.
  const handleMrNumberChange = (value: string) => {
    const mrNumber = value.toUpperCase()
    const record = PATIENT_DIRECTORY[mrNumber]
    if (record) {
      setPatient({ ...record, mrNumber })
      setMrStatus('found')
    } else {
      setPatient((current) => ({ ...current, mrNumber }))
      setMrStatus(mrNumber.trim().length > 0 ? 'new' : 'idle')
    }
  }

  // DOB drives Age automatically; Age stays editable for cases where DOB is unknown.
  const handleDobChange = (value: string) => {
    setPatient((current) => ({ ...current, dob: value, age: value ? computeAgeFromDob(value) : current.age }))
  }

  // Mobile number: digits only, capped at 10, validated before save.
  const handleContactChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
    setPatient((current) => ({ ...current, contact: digitsOnly }))
  }

  const mrNumberValid = patient.mrNumber.trim().length > 0
  const contactValid = patient.contact.length === 0 || MOBILE_REGEX.test(patient.contact)
  const contactComplete = MOBILE_REGEX.test(patient.contact)

  const canSave =
    mrNumberValid &&
    patient.name.trim().length > 0 &&
    contactComplete &&
    items.some((item) => item.name.trim().length > 0 && item.rate > 0)

  const handleSave = () => {
    if (!canSave) return
    const invoice: Invoice = {
      id: `INV-${Math.floor(90000 + Math.random() * 9999)}`,
      center,
      billType,
      patient,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: items.filter((item) => item.name.trim().length > 0),
      discount,
      tax,
      paid,
      paymentMethod,
    }
    onSave(invoice)
  }

  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Create invoice</h2>
          <p className="text-sm text-muted-foreground">Build any type of bill — consultation, lab, pharmacy, therapy, or custom.</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Consulting center">
            <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={center} onChange={(e) => setCenter(e.target.value as Center)}>
              <option value="nutrition">New You — Nutrition Center</option>
              <option value="ayurcare">Ayurcare Center</option>
            </select>
          </FormField>
          <FormField label="Bill type">
            <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={billType} onChange={(e) => setBillType(e.target.value)}>
              {BILL_TYPE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient details</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="MR number" required>
              <Input
                value={patient.mrNumber}
                onChange={(e) => handleMrNumberChange(e.target.value)}
                placeholder="e.g. NU000003"
                className={!mrNumberValid ? 'border-destructive' : undefined}
              />
              {mrStatus === 'found' && <p className="mt-1 text-xs font-medium text-primary">Existing patient found — details auto-filled.</p>}
              {mrStatus === 'new' && <p className="mt-1 text-xs text-muted-foreground">No record on file — enter details for a new patient.</p>}
              {!mrNumberValid && <p className="mt-1 text-xs text-destructive">MR number is required.</p>}
            </FormField>
            <FormField label="Patient name" required><Input value={patient.name} onChange={(e) => updatePatient('name', e.target.value)} /></FormField>
            <FormField label="Gender">
              <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={patient.gender} onChange={(e) => updatePatient('gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField label="Date of birth">
              <Input type="date" value={patient.dob} onChange={(e) => handleDobChange(e.target.value)} />
            </FormField>
            <FormField label="Age">
              <Input value={patient.age} onChange={(e) => updatePatient('age', e.target.value)} placeholder="Auto-calculated from DOB" />
            </FormField>
            <FormField label="Blood group"><Input placeholder="e.g. B+" value={patient.bloodGroup} onChange={(e) => updatePatient('bloodGroup', e.target.value)} /></FormField>
            <FormField label="Contact number" required>
              <Input
                inputMode="numeric"
                value={patient.contact}
                onChange={(e) => handleContactChange(e.target.value)}
                placeholder="10-digit mobile number"
                className={!contactValid || (patient.contact.length > 0 && !contactComplete) ? 'border-destructive' : undefined}
              />
              {patient.contact.length > 0 && !contactComplete && <p className="mt-1 text-xs text-destructive">Enter a valid 10-digit mobile number.</p>}
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Address"><Input value={patient.address} onChange={(e) => updatePatient('address', e.target.value)} /></FormField>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing items</p>
            <Button variant="ghost" size="sm" onClick={() => setItems((current) => [...current, { id: Date.now(), name: '', quantity: 1, rate: 0 }])}>
              <Plus className="mr-1 size-3.5" />
              Add item
            </Button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_70px_100px_28px] gap-1.5 px-1 text-xs text-muted-foreground">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span />
            </div>
            {items.map((item) => (
              <div className="grid grid-cols-[1fr_70px_100px_28px] gap-1.5" key={item.id}>
                <Input placeholder="Any service, test, medicine, or package" value={item.name} onChange={(e) => updateLine(item.id, 'name', e.target.value)} />
                <Input inputMode="numeric" value={item.quantity} onChange={(e) => updateLine(item.id, 'quantity', e.target.value)} />
                <Input inputMode="decimal" value={item.rate} onChange={(e) => updateLine(item.id, 'rate', e.target.value)} />
                <Button variant="ghost" size="icon-sm" aria-label="Remove item" onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Discount %"><Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} /></FormField>
          <FormField label="Tax %"><Input inputMode="decimal" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} /></FormField>
          <FormField label="Payment method">
            <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Amount paid now"><Input inputMode="decimal" value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} /></FormField>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex justify-between border-t mt-2 pt-2 font-semibold"><span>Grand total</span><span>{money(totals.total)}</span></div>
            <div className="flex justify-between font-medium text-destructive"><span>Balance</span><span>{money(totals.balance)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave}>Save & preview bill</Button>
      </div>
    </ModalShell>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Invoice view / print / export modal                                 */
/* ------------------------------------------------------------------ */

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const totals = computeTotals(invoice.items, invoice.discount, invoice.tax, invoice.paid)
  const letterhead = CENTERS[invoice.center]

  const handlePrint = () => window.print()

  const handleExportPdf = async () => {
    if (!printRef.current) return
    setExporting(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
      pdf.save(`${invoice.id}-${invoice.patient.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed. Ensure "jspdf" and "html2canvas" are installed (npm install jspdf html2canvas).', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} wide>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area {
            position: absolute;
            inset: 0;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div>
          <h2 className="font-display text-lg font-semibold">Invoice preview</h2>
          <p className="text-sm text-muted-foreground">{invoice.id} · A4 print-ready format</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button size="sm" onClick={handleExportPdf} disabled={exporting}>
            <FileText className="mr-2 size-4" />
            {exporting ? 'Exporting…' : 'Export as PDF'}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[80vh] overflow-y-auto bg-muted/30 px-6 py-6 print:max-h-none print:overflow-visible print:bg-transparent print:px-0 print:py-0">
        <div
          id="invoice-print-area"
          ref={printRef}
          className="mx-auto w-full max-w-[210mm] bg-white p-10 text-black shadow-sm print:shadow-none"
          style={{ fontFamily: PRINT_FONT }}
        >
          {/* Letterhead */}
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-3xl font-bold tracking-wide">{letterhead.name}</h1>
            {letterhead.subheading && <p className="mt-0.5 text-sm italic text-neutral-700">{letterhead.subheading}</p>}
            {letterhead.tagline && <p className="mt-0.5 text-xs uppercase tracking-wider text-neutral-600">{letterhead.tagline}</p>}
            <p className="mt-2 text-xs text-neutral-700">{letterhead.address}</p>
            <p className="text-xs text-neutral-700">{letterhead.phones}</p>
          </div>

          {/* Bill title bar */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="font-semibold uppercase tracking-wide">{invoice.billType}</p>
            <div className="text-right">
              <p><span className="text-neutral-500">Invoice No: </span>{invoice.id}</p>
              <p><span className="text-neutral-500">Date: </span>{invoice.date}</p>
            </div>
          </div>

          {/* Patient details */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-neutral-300 p-4 text-sm">
            <p><span className="text-neutral-500">Patient Name: </span>{invoice.patient.name || '-'}</p>
            <p><span className="text-neutral-500">MR Number: </span>{invoice.patient.mrNumber || '-'}</p>
            <p><span className="text-neutral-500">Age: </span>{invoice.patient.age || '-'}</p>
            <p><span className="text-neutral-500">Date of Birth: </span>{formatDob(invoice.patient.dob)}</p>
            <p><span className="text-neutral-500">Gender: </span>{invoice.patient.gender || '-'}</p>
            <p><span className="text-neutral-500">Blood Group: </span>{invoice.patient.bloodGroup || '-'}</p>
            <p className="col-span-2"><span className="text-neutral-500">Address: </span>{invoice.patient.address || '-'}</p>
            <p className="col-span-2"><span className="text-neutral-500">Contact: </span>{invoice.patient.contact || '-'}</p>
          </div>

          {/* Items table */}
          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-b border-neutral-300">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{money(item.rate)}</td>
                  <td className="py-2 text-right">{money(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-neutral-600"><span>Discount ({invoice.discount}%)</span><span>- {money(totals.discountValue)}</span></div>}
              {invoice.tax > 0 && <div className="flex justify-between text-neutral-600"><span>Tax ({invoice.tax}%)</span><span>{money(totals.taxValue)}</span></div>}
              <div className="flex justify-between border-t-2 border-black pt-1.5 text-base font-bold"><span>Grand Total</span><span>{money(totals.total)}</span></div>
              <div className="flex justify-between"><span>Amount Paid</span><span>{money(invoice.paid)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance Due</span><span>{money(totals.balance)}</span></div>
              <p className="pt-1 text-xs text-neutral-500">Payment method: {invoice.paymentMethod}</p>
            </div>
          </div>

          {/* Footer / signatures */}
          <div className="mt-16 flex items-end justify-between text-xs text-neutral-600">
            <div className="text-center">
              <div className="w-40 border-t border-neutral-500 pt-1">Patient / Guardian Signature</div>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-neutral-500 pt-1">Authorized Signatory</div>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] text-neutral-400">This is a computer-generated bill and does not require a physical stamp unless stated otherwise.</p>
        </div>
      </div>
    </ModalShell>
  )
}