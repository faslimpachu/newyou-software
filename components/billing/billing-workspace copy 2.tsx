'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileText, Plus, Printer, ReceiptText, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

const emptyPatient: Patient = { name: '', mrNumber: '', age: '', dob: '', gender: '', bloodGroup: '', address: '', contact: '' }

const money = (value: number) => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

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

const UI_FONT = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", ui-sans-serif, system-ui, sans-serif'
const PRINT_FONT = '"Times New Roman", Times, Georgia, serif'

function computeTotals(items: Line[], discount: number, tax: number, paid: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const discountValue = subtotal * (discount / 100)
  const taxable = subtotal - discountValue
  const taxValue = taxable * (tax / 100)
  const total = taxable + taxValue
  const balance = Math.max(0, total - paid)
  return { subtotal, discountValue, taxValue, total, balance }
}

function mapDbInvoiceToFrontend(invoice: any): Invoice {
  return {
    id: invoice.invoiceNumber,
    center: invoice.center as Center,
    billType: invoice.billType,
    patient: {
      name: invoice.patientName,
      mrNumber: invoice.patientMrNumber,
      age: invoice.patientAge || '',
      dob: invoice.patientDob || '',
      gender: invoice.patientGender || '',
      bloodGroup: invoice.patientBloodGroup || '',
      address: invoice.patientAddress || '',
      contact: invoice.patientContact || '',
    },
    date: invoice.invoiceDate,
    items: invoice.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      rate: item.rate,
    })),
    discount: invoice.discount,
    tax: invoice.tax,
    paid: invoice.paid,
    paymentMethod: invoice.paymentMethod || 'Cash',
  }
}

export function BillingWorkspace() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing?limit=100')
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      const mapped = (data.invoices || []).map(mapDbInvoiceToFrontend)
      setInvoices(mapped)
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

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

  const handleSaveInvoice = async (invoice: Invoice) => {
    setSaving(true)
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center: invoice.center,
          billType: invoice.billType,
          patient: invoice.patient,
          items: invoice.items.map((item) => ({ name: item.name, quantity: item.quantity, rate: item.rate })),
          discount: invoice.discount,
          tax: invoice.tax,
          paid: invoice.paid,
          paymentMethod: invoice.paymentMethod,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create invoice')
      }

      const data = await res.json()
      const saved = mapDbInvoiceToFrontend(data.invoice)
      setInvoices((current) => [saved, ...current])
      setCreating(false)
      setViewInvoice(saved)
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
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
          <Button variant="outline" size="sm" onClick={() => { const csv = invoices.map(inv => [inv.id, CENTERS[inv.center].name, inv.patient.name, inv.billType, inv.date, computeTotals(inv.items, inv.discount, inv.tax, inv.paid).total].join(',')); const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `billing_${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url); }}>
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} disabled={saving}>
            <Plus className="mr-2 size-4" />
            New invoice
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

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
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Loading invoices...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No invoices found.</td></tr>
                ) : (
                  invoices.map((invoice) => {
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {creating && <NewInvoiceModal onClose={() => setCreating(false)} onSave={handleSaveInvoice} saving={saving} />}
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

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 print:static print:bg-transparent print:p-0" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`no-print-shadow w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} rounded-xl bg-background shadow-2xl print:max-w-none print:rounded-none print:shadow-none`}>
        {children}
      </div>
    </div>
  )
}

function NewInvoiceModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (invoice: Invoice) => void; saving: boolean }) {
  const [center, setCenter] = useState<Center>('nutrition')
  const [billType, setBillType] = useState(BILL_TYPE_PRESETS[0])
  const [patient, setPatient] = useState<Patient>(emptyPatient)
  const [mrStatus, setMrStatus] = useState<'idle' | 'found' | 'new' | 'loading'>('idle')
  const [items, setItems] = useState<Line[]>([{ id: Date.now(), name: '', quantity: 1, rate: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [paid, setPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const mrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const totals = useMemo(() => computeTotals(items, discount, tax, paid), [items, discount, tax, paid])

  const updateLine = (id: number, key: keyof Line, value: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: key === 'name' ? value : Math.max(0, Number(value) || 0) } : item)))

  const updatePatient = (key: keyof Patient, value: string) => setPatient((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    return () => {
      if (mrTimerRef.current) clearTimeout(mrTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const handleMrNumberChange = useCallback(async (value: string) => {
    const mrNumber = value.toUpperCase()
    if (!mrNumber.trim()) {
      setPatient(emptyPatient)
      setMrStatus('idle')
      return
    }
    if (mrTimerRef.current) clearTimeout(mrTimerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()
    setMrStatus('loading')
    const timer = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      try {
        const res = await fetch(`/api/patients/${encodeURIComponent(mrNumber)}`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          const p = data.patient
          const record: Patient = {
            name: p.patientName,
            mrNumber: p.mr,
            age: p.age ? String(p.age) : '',
            dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '',
            gender: p.gender,
            bloodGroup: p.bloodGroup || '',
            address: [p.address, p.district, p.state, p.pinCode].filter(Boolean).join(', '),
            contact: p.mobileNumber,
          }
          setPatient(record)
          setMrStatus('found')
        } else {
          setPatient((current) => ({ ...current, mrNumber }))
          setMrStatus('new')
        }
      } catch {
        setPatient((current) => ({ ...current, mrNumber }))
        setMrStatus('new')
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    }, 400)
    mrTimerRef.current = timer
  }, [])

  const handleDobChange = (value: string) => {
    setPatient((current) => ({ ...current, dob: value, age: value ? computeAgeFromDob(value) : current.age }))
  }

  const handleContactChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
    setPatient((current) => ({ ...current, contact: digitsOnly }))
  }

  const mrNumberValid = patient.mrNumber.trim().length > 0
  const contactValid = patient.contact.length === 0 || MOBILE_REGEX.test(patient.contact)
  const contactComplete = MOBILE_REGEX.test(patient.contact)

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!patient.mrNumber.trim()) errors.mrNumber = 'MR number is required.'
    if (!patient.name.trim()) errors.patientName = 'Patient name is required.'
    if (!contactComplete) errors.contact = 'Enter a valid 10-digit mobile number.'
    const hasValidItem = items.some((item) => item.name.trim().length > 0 && item.rate > 0)
    if (!hasValidItem) errors.items = 'Add at least one item with a name and rate.'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const invoice: Invoice = {
      id: `INV-${Date.now().toString(36).toUpperCase()}`,
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
              {mrStatus === 'loading' && <p className="mt-1 text-xs text-muted-foreground">Looking up patient...</p>}
              {mrStatus === 'new' && <p className="mt-1 text-xs text-muted-foreground">No record on file — enter details for a new patient.</p>}
              {!mrNumberValid && validationErrors.mrNumber && <p className="mt-1 text-xs text-destructive">{validationErrors.mrNumber}</p>}
            </FormField>
            <FormField label="Patient name" required><Input value={patient.name} onChange={(e) => updatePatient('name', e.target.value)} className={validationErrors.patientName ? 'border-destructive' : undefined} /></FormField>
            {validationErrors.patientName && <p className="mt-1 text-xs text-destructive col-span-1">{validationErrors.patientName}</p>}
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
                className={(!contactValid || (patient.contact.length > 0 && !contactComplete) || !!validationErrors.contact) ? 'border-destructive' : undefined}
              />
              {patient.contact.length > 0 && !contactComplete && <p className="mt-1 text-xs text-destructive">Enter a valid 10-digit mobile number.</p>}
              {validationErrors.contact && <p className="mt-1 text-xs text-destructive">{validationErrors.contact}</p>}
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
          {validationErrors.items && <p className="mt-2 text-xs text-destructive">{validationErrors.items}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Discount %"><Input inputMode="decimal" value={discount.toString()} onChange={(e) => setDiscount(Number(e.target.value) || 0)} /></FormField>
          <FormField label="Tax %"><Input inputMode="decimal" value={tax.toString()} onChange={(e) => setTax(Number(e.target.value) || 0)} /></FormField>
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
          <FormField label="Amount paid now"><Input inputMode="decimal" value={paid.toString()} onChange={(e) => setPaid(Number(e.target.value) || 0)} /></FormField>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex justify-between border-t mt-2 pt-2 font-semibold"><span>Grand total</span><span>{money(totals.total)}</span></div>
            <div className="flex justify-between font-medium text-destructive"><span>Balance</span><span>{money(totals.balance)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save & preview bill'}</Button>
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

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const totals = computeTotals(invoice.items, invoice.discount, invoice.tax, invoice.paid)
  const letterhead = CENTERS[invoice.center]

  const handlePrint = () => {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return
    const content = printRef.current.innerHTML
    printWindow.document.write(`<!doctype html><html><head><title>Invoice ${invoice.id}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px;text-align:center}.clinic{font-size:22px;font-weight:700;color:#167b91}.address{color:#4b5563;margin-top:4px;font-size:11px}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.meta{font-size:11px;margin-bottom:12px;color:#4b5563}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}.table{width:100%;border-collapse:collapse;margin-top:8px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:11px}.table th{background:#edf5f6}.totals{width:100%;max-width:280px;margin-left:auto;margin-top:12px}.signature{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:100px;text-align:center}.signature div{border-top:1px solid #17202a;padding-top:8px}@media print{body{margin:0}}</style></head><body>${content}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleExportPdf = async () => {
    if (!printRef.current) return
    setExporting(true)
    try {
      const html2canvasModule = await import('html2canvas')
      const jsPDFModule = await import('jspdf')
      const html2canvas = html2canvasModule.default || html2canvasModule
      const jsPDF = jsPDFModule.default || jsPDFModule
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style')
          style.textContent = `* { color: rgb(0,0,0) !important; background-color: rgb(255,255,255) !important; border-color: rgb(128,128,128) !important; }`
          clonedDoc.head.appendChild(style)
        },
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
      pdf.save(`${invoice.id}-${invoice.patient.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed. Ensure "jspdf" and "html2canvas" are installed.', err)
      alert('PDF export failed. Please try again or use Print instead.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex items-center justify-between border-b px-6 py-4">
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

      <div className="max-h-[80vh] overflow-y-auto bg-muted/30 px-6 py-6">
        <div
          id="invoice-print-area"
          ref={printRef}
          className="mx-auto w-full max-w-[210mm] bg-white p-10 text-black shadow-sm"
          style={{ fontFamily: PRINT_FONT }}
        >
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-3xl font-bold tracking-wide">{letterhead.name}</h1>
            {letterhead.subheading && <p className="mt-0.5 text-sm italic text-neutral-700">{letterhead.subheading}</p>}
            {letterhead.tagline && <p className="mt-0.5 text-xs uppercase tracking-wider text-neutral-600">{letterhead.tagline}</p>}
            <p className="mt-2 text-xs text-neutral-700">{letterhead.address}</p>
            <p className="text-xs text-neutral-700">{letterhead.phones}</p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="font-semibold uppercase tracking-wide">{invoice.billType}</p>
            <div className="text-right">
              <p><span className="text-neutral-500">Invoice No: </span>{invoice.id}</p>
              <p><span className="text-neutral-500">Date: </span>{invoice.date}</p>
            </div>
          </div>

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

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-neutral-600"><span>Discount ({invoice.discount}%)</span><span>- {money(totals.discountValue)}</span></div>}
              {invoice.tax > 0 && <div className="flex justify-between text-neutral-600"><span>Tax ({invoice.tax}%)</span><span>- {money(totals.taxValue)}</span></div>}
              <div className="flex justify-between border-t-2 border-black pt-1.5 text-base font-bold"><span>Grand Total</span><span>{money(totals.total)}</span></div>
              <div className="flex justify-between"><span>Amount Paid</span><span>{money(invoice.paid)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance Due</span><span>{money(totals.balance)}</span></div>
              <p className="pt-1 text-xs text-neutral-500">Payment method: {invoice.paymentMethod}</p>
            </div>
          </div>

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
