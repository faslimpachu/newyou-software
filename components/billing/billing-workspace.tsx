'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  Download,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  X,
  Search,
  Pencil,
  Eye,
  Paperclip,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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

type ApiPatientSummary = {
  mr: string
  patientName: string
  mobileNumber: string
  age?: number | null
}

type ApiPatient = ApiPatientSummary & {
  dob?: string | null
  gender?: string | null
  bloodGroup?: string | null
  address?: string | null
  district?: string | null
  state?: string | null
  pinCode?: string | null
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

type Expense = {
  id: string
  expenseNumber: string
  date: string // ISO yyyy-mm-dd
  category: string
  description: string
  amount: number
  paymentMethod: string
  paidTo: string
  remarks: string
  receiptName?: string
  receiptDataUrl?: string
  addedBy: string
  createdDate: string // display date, set once on creation
  createdAt?: string
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

const DEFAULT_EXPENSE_CATEGORIES = [
  'Salary',
  'Rent',
  'Electricity',
  'Water',
  'Internet',
  'Medicines',
  'Medical Supplies',
  'Equipment Purchase',
  'Equipment Maintenance',
  'Cleaning & Housekeeping',
  'Stationery',
  'Transportation',
  'Marketing',
  'Miscellaneous',
]

const EXPENSE_PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card']

/* ------------------------------------------------------------------ */
/*  Patient directory — lookup by MR number (replace with a real API   */
/*  call in production, e.g. GET /api/patients/:mrNumber)              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Date / age / validation helpers                                    */
/* ------------------------------------------------------------------ */

function formatDob(dob: string): string {
  if (!dob) return '-'
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return dob
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateDisplay(iso: string): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toISOString().slice(0, 10)
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  if (key === 'unknown') return 'Unknown'
  const [year, month] = key.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// Professional, standard fonts — clean sans for the on-screen workspace,
// classic serif for the printed/exported hospital bill.
const UI_FONT = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", ui-sans-serif, system-ui, sans-serif'
const PRINT_FONT = '"Times New Roman", Times, Georgia, serif'

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */

const emptyPatient: Patient = { name: '', mrNumber: '', age: '', dob: '', gender: '', bloodGroup: '', address: '', contact: '' }

function toInvoicePatient(patient: ApiPatient): Patient {
  return {
    name: patient.patientName || '',
    mrNumber: patient.mr || '',
    age: patient.age === null || patient.age === undefined ? '' : String(patient.age),
    dob: patient.dob ? new Date(patient.dob).toISOString().slice(0, 10) : '',
    gender: patient.gender || '',
    bloodGroup: patient.bloodGroup || '',
    address: [patient.address, patient.district, patient.state, patient.pinCode].filter(Boolean).join(', '),
    contact: patient.mobileNumber || '',
  }
}

type Pagination = { page: number; pageSize: number; total: number; totalPages: number }
type SortOrder = 'latest' | 'oldest'
type BillingSummary = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  outstandingPatientBills: number
}

const PAGE_SIZE = 20
const emptyPagination: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 }
const emptyBillingSummary: BillingSummary = { totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingPatientBills: 0 }

const seedInvoices: Invoice[] = [
  {
    id: 'INV-90112',
    center: 'nutrition',
    billType: 'Consultation Bill',
    patient: { name: 'Aarav Sharma', mrNumber: 'MR000001', age: '34', dob: '1992-03-12', gender: 'Male', bloodGroup: 'B+', address: 'Thalassery, Kannur', contact: '9847012345' },
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
    patient: { name: 'Rohan Mehta', mrNumber: 'MR000002', age: '41', dob: '1985-07-05', gender: 'Male', bloodGroup: 'O+', address: 'Kannur Town', contact: '9847098765' },
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
    patient: { name: 'Priya Nair', mrNumber: 'MR000002', age: '29', dob: '1997-01-18', gender: 'Female', bloodGroup: 'A+', address: 'Kanhangad, Kasaragod', contact: '9847011223' },
    date: '21 May 2026',
    items: [{ id: 1, name: 'Follow-up consultation', quantity: 1, rate: 1200 }],
    discount: 0,
    tax: 0,
    paid: 1200,
    paymentMethod: 'Card',
  },
]

const seedExpenses: Expense[] = [
  {
    id: 'EXP-10001',
    expenseNumber: 'EXP-10001',
    date: '2026-06-01',
    category: 'Rent',
    description: 'Monthly clinic rent — Jubilee Bazar premises',
    amount: 45000,
    paymentMethod: 'Bank Transfer',
    paidTo: 'Property Owner',
    remarks: '',
    addedBy: 'Front Office',
    createdDate: '01 Jun 2026',
  },
  {
    id: 'EXP-10002',
    expenseNumber: 'EXP-10002',
    date: '2026-06-03',
    category: 'Medical Supplies',
    description: 'Ayurvedic oils and therapy consumables restock',
    amount: 8600,
    paymentMethod: 'UPI',
    paidTo: 'Kannur Herbal Suppliers',
    remarks: 'Monthly restock',
    addedBy: 'Front Office',
    createdDate: '03 Jun 2026',
  },
  {
    id: 'EXP-10003',
    expenseNumber: 'EXP-10003',
    date: '2026-06-05',
    category: 'Electricity',
    description: 'KSEB electricity bill — May',
    amount: 5200,
    paymentMethod: 'Cash',
    paidTo: 'KSEB',
    remarks: '',
    addedBy: 'Admin',
    createdDate: '05 Jun 2026',
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

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function exportRowsToExcel(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) throw new Error('There are no records to export.')
  try {
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
    XLSX.writeFile(workbook, filename)
  } catch {
    // Fallback to CSV if the xlsx package isn't available in this environment.
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    downloadBlob(csv, filename.replace(/\.xlsx$/, '.csv'), 'text/csv')
  }
}

async function exportNodeToPdf(node: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = (canvas.height * pageWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  pdf.save(filename)
}

/* ------------------------------------------------------------------ */
/*  Root workspace                                                      */
/* ------------------------------------------------------------------ */

type ModuleTab = 'billing' | 'expenses'

export function BillingWorkspace() {
  const invoiceRequestId = useRef(0)
  const expenseRequestId = useRef(0)
  const summaryRequestId = useRef(0)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<SortOrder>('latest')
  const [invoicePagination, setInvoicePagination] = useState<Pagination>(emptyPagination)
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseDateFrom, setExpenseDateFrom] = useState('')
  const [expenseDateTo, setExpenseDateTo] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('all')
  const [expenseSortOrder, setExpenseSortOrder] = useState<SortOrder>('latest')
  const [expensePagination, setExpensePagination] = useState<Pagination>(emptyPagination)
  const [invoiceRefresh, setInvoiceRefresh] = useState(0)
  const [expenseRefresh, setExpenseRefresh] = useState(0)
  const [summaryRefresh, setSummaryRefresh] = useState(0)
  const [billingSummary, setBillingSummary] = useState<BillingSummary>(emptyBillingSummary)
  const [exporting, setExporting] = useState<'billing' | 'expense' | null>(null)
  const [exportError, setExportError] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<ModuleTab>('billing')

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [errorInvoices, setErrorInvoices] = useState('')

  const [viewExpense, setViewExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [addingExpense, setAddingExpense] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [errorExpenses, setErrorExpenses] = useState('')
  const [errorSummary, setErrorSummary] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  /* ---------------- dashboard summary ---------------- */

  const openCount = useMemo(
    () => invoices.filter((inv) => computeTotals(inv.items, inv.discount, inv.tax, inv.paid).balance > 0).length,
    [invoices],
  )

  const fetchInvoices = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++invoiceRequestId.current
    try {
      const params = new URLSearchParams({ page: String(invoicePagination.page), pageSize: String(PAGE_SIZE), sortOrder: invoiceSortOrder })
      if (invoiceSearch.trim()) params.set('search', invoiceSearch.trim())
      const res = await fetch(`/api/billing?${params}`, { signal })
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      if (signal?.aborted || requestId !== invoiceRequestId.current) return
      const mapped = (data.invoices || []).map(mapDbInvoiceToFrontend)
      setInvoices(mapped)
      const total = data.total ?? mapped.length
      setInvoicePagination({ page: data.page ?? invoicePagination.page, pageSize: data.pageSize ?? PAGE_SIZE, total, totalPages: data.totalPages ?? Math.ceil(total / PAGE_SIZE) })
      setErrorInvoices('')
    } catch (err: any) {
      if (signal?.aborted || requestId !== invoiceRequestId.current) return
      setErrorInvoices(err.message || 'Failed to load invoices')
    }
  }, [invoicePagination.page, invoiceSearch, invoiceSortOrder, invoiceRefresh])

  const fetchExpenses = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++expenseRequestId.current
    try {
      const params = new URLSearchParams({ page: String(expensePagination.page), pageSize: String(PAGE_SIZE), sortOrder: expenseSortOrder, category: expenseCategory })
      if (expenseSearch.trim()) params.set('search', expenseSearch.trim())
      if (expenseDateFrom) params.set('dateFrom', expenseDateFrom)
      if (expenseDateTo) params.set('dateTo', expenseDateTo)
      const res = await fetch(`/api/expenses?${params}`, { signal })
      if (!res.ok) throw new Error('Failed to load expenses')
      const data = await res.json()
      if (signal?.aborted || requestId !== expenseRequestId.current) return
      setExpenses(data.expenses || [])
      const total = data.total ?? data.expenses?.length ?? 0
      setExpensePagination({ page: data.page ?? expensePagination.page, pageSize: data.pageSize ?? PAGE_SIZE, total, totalPages: data.totalPages ?? Math.ceil(total / PAGE_SIZE) })
      setErrorExpenses('')
    } catch (err: any) {
      if (signal?.aborted || requestId !== expenseRequestId.current) return
      setErrorExpenses(err.message || 'Failed to load expenses')
    }
  }, [expensePagination.page, expenseSearch, expenseDateFrom, expenseDateTo, expenseCategory, expenseSortOrder, expenseRefresh])

  const fetchBillingSummary = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++summaryRequestId.current
    try {
      const res = await fetch('/api/billing/summary', { signal })
      if (!res.ok) throw new Error('Failed to load billing summary')
      const data = await res.json()
      if (signal?.aborted || requestId !== summaryRequestId.current) return
      setBillingSummary({
        totalRevenue: data.totalRevenue ?? 0,
        totalExpenses: data.totalExpenses ?? 0,
        netProfit: data.netProfit ?? 0,
        outstandingPatientBills: data.outstandingPatientBills ?? 0,
      })
    } catch (err: any) {
      if (signal?.aborted || requestId !== summaryRequestId.current) return
      setErrorSummary(err.message || 'Failed to load billing summary')
    }
  }, [summaryRefresh])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingInvoices(true)
    fetchInvoices(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoadingInvoices(false)
    })
    return () => controller.abort()
  }, [fetchInvoices])

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchInvoices()
    }, 3000)
    return () => clearInterval(timer)
  }, [fetchInvoices])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingExpenses(true)
    fetchExpenses(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoadingExpenses(false)
    })
    return () => controller.abort()
  }, [fetchExpenses])

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchExpenses()
    }, 3000)
    return () => clearInterval(timer)
  }, [fetchExpenses])

  useEffect(() => {
    const controller = new AbortController()
    void fetchBillingSummary(controller.signal)
    return () => controller.abort()
  }, [fetchBillingSummary])

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchBillingSummary()
    }, 3000)
    return () => clearInterval(timer)
  }, [fetchBillingSummary])

  const handleSaveInvoice = async (invoice: Invoice) => {
    setSavingInvoice(true)
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
      setInvoicePagination((current) => ({ ...current, page: 1 }))
      setInvoiceRefresh((current) => current + 1)
      setSummaryRefresh((current) => current + 1)
      setCreating(false)
      setViewInvoice(saved)
    } catch (err: any) {
      setErrorInvoices(err.message || 'Failed to create invoice')
    } finally {
      setSavingInvoice(false)
    }
  }

  const handleExport = async (type: 'billing' | 'expense') => {
    setExportMenuOpen(false)
    setExporting(type)
    setExportError('')
    try {
      const rows = type === 'billing'
        ? invoices.map((inv) => {
            const totals = computeTotals(inv.items, inv.discount, inv.tax, inv.paid)
            return {
              Invoice: inv.id,
              Center: CENTERS[inv.center].name,
              Patient: inv.patient.name,
              MR: inv.patient.mrNumber,
              'Bill type': inv.billType,
              Date: inv.date,
              Items: inv.items.map((item) => item.name).join('; '),
              Subtotal: totals.subtotal,
              Discount: inv.discount,
              Tax: inv.tax,
              Total: totals.total,
              Paid: inv.paid,
              Balance: totals.balance,
              'Payment method': inv.paymentMethod,
            }
          })
        : expenses.map((expense) => ({
            'Expense number': expense.expenseNumber,
            Date: expense.date,
            Category: expense.category,
            Description: expense.description,
            Amount: expense.amount,
            'Payment method': expense.paymentMethod,
            'Paid to': expense.paidTo,
            Remarks: expense.remarks,
            'Added by': expense.addedBy,
            'Created date': expense.createdDate,
          }))
      await exportRowsToExcel(rows, `${type === 'billing' ? 'billing-invoices' : 'expenses'}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err: any) {
      setExportError(err.message || `Failed to export ${type} records.`)
    } finally {
      setExporting(null)
    }
  }

  const handleSaveExpense = async (expense: Expense) => {
    setSavingExpense(true)
    try {
      const isEdit = Boolean(expense.expenseNumber && expense.expenseNumber.length > 0 && expense.expenseNumber.startsWith('EXP-'))
      const url = isEdit ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save expense')
      }

      const data = await res.json()
      const saved = data.expense
      setExpensePagination((current) => ({ ...current, page: 1 }))
      setExpenseRefresh((current) => current + 1)
      setSummaryRefresh((current) => current + 1)
      setAddingExpense(false)
      setEditingExpense(null)
      setViewExpense(saved)
    } catch (err: any) {
      setErrorExpenses(err.message || 'Failed to save expense')
    } finally {
      setSavingExpense(false)
    }
  }

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete expense')
      }
      setExpensePagination((current) => ({ ...current, page: current.page > 1 && current.total <= (current.page - 1) * PAGE_SIZE + 1 ? current.page - 1 : current.page }))
      setExpenseRefresh((current) => current + 1)
      setSummaryRefresh((current) => current + 1)
      setDeleteTarget(null)
      if (viewExpense?.id === expense.id) setViewExpense(null)
    } catch (err: any) {
      setErrorExpenses(err.message || 'Failed to delete expense')
    }
  }

  const handleAddCategory = (category: string) => {
    setExpenseCategories((current) => (current.includes(category) ? current : [...current, category]))
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6" style={{ fontFamily: UI_FONT }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Accounts</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Central Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create invoices, track expenses, and manage clinic finances across New You Nutrition Center and Ayurcare Center.</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={exporting !== null}>
                  <Download className="mr-2 size-4" />
                  {exporting ? 'Exporting…' : 'Export'}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => void handleExport('billing')}>Export Billing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport('expense')}>Export Expense</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 size-4" />
            New invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Revenue" value={money(billingSummary.totalRevenue)} icon={<TrendingUp className="size-4" />} />
        <Metric label="Total Expenses" value={money(billingSummary.totalExpenses)} icon={<TrendingDown className="size-4" />} />
        <Metric label="Net Profit" value={money(billingSummary.netProfit)} icon={<Wallet className="size-4" />} tone={billingSummary.netProfit >= 0 ? 'positive' : 'negative'} />
        <Metric label="Outstanding Patient Bills" value={money(billingSummary.outstandingPatientBills)} tone={billingSummary.outstandingPatientBills > 0 ? 'negative' : undefined} />
      </div>

      {errorInvoices && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorInvoices}</div>}
      {errorExpenses && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorExpenses}</div>}
      {errorSummary && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{errorSummary}</div>}
      {exportError && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{exportError}</div>}

      {/* Module tabs — Billing / Expenses */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {(
          [
            { key: 'billing', label: 'Billing & Revenue' },
            { key: 'expenses', label: 'Expenses' },
          ] as { key: ModuleTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'billing' && (
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Click any row to view, print, or export the bill. {openCount} invoice{openCount === 1 ? '' : 's'} currently open.</CardDescription>
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <Input className="max-w-sm" placeholder="Search invoice, patient, MR, or bill type" value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePagination((current) => ({ ...current, page: 1 })) }} />
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={invoiceSortOrder} onChange={(e) => { setInvoiceSortOrder(e.target.value as SortOrder); setInvoicePagination((current) => ({ ...current, page: 1 })) }}>
                <option value="latest">Sort: Latest first</option>
                <option value="oldest">Sort: Oldest first</option>
              </select>
            </div>
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
                  {loadingInvoices ? (
                    <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Loading invoices...</td></tr>
                  ) : errorInvoices ? (
                    <tr><td colSpan={7} className="p-8 text-center text-sm text-destructive">{errorInvoices}</td></tr>
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
            <PaginationControls pagination={invoicePagination} onPageChange={(page) => setInvoicePagination((current) => ({ ...current, page }))} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <ExpensesPanel
          expenses={expenses}
          categories={expenseCategories}
          search={expenseSearch}
          dateFrom={expenseDateFrom}
          dateTo={expenseDateTo}
          filterCategory={expenseCategory}
          sortOrder={expenseSortOrder}
          pagination={expensePagination}
          onSearchChange={(value) => { setExpenseSearch(value); setExpensePagination((current) => ({ ...current, page: 1 })) }}
          onDateFromChange={(value) => { setExpenseDateFrom(value); setExpensePagination((current) => ({ ...current, page: 1 })) }}
          onDateToChange={(value) => { setExpenseDateTo(value); setExpensePagination((current) => ({ ...current, page: 1 })) }}
          onCategoryChange={(value) => { setExpenseCategory(value); setExpensePagination((current) => ({ ...current, page: 1 })) }}
          onSortOrderChange={(value) => { setExpenseSortOrder(value); setExpensePagination((current) => ({ ...current, page: 1 })) }}
          onPageChange={(page) => setExpensePagination((current) => ({ ...current, page }))}
          onAdd={() => setAddingExpense(true)}
          onView={setViewExpense}
          onEdit={setEditingExpense}
          onDelete={setDeleteTarget}
        />
      )}

      {creating && <NewInvoiceModal onClose={() => setCreating(false)} onSave={handleSaveInvoice} saving={savingInvoice} />}
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

      {(addingExpense || editingExpense) && (
        <NewExpenseModal
          initial={editingExpense ?? undefined}
          categories={expenseCategories}
          onAddCategory={handleAddCategory}
          onClose={() => {
            setAddingExpense(false)
            setEditingExpense(null)
          }}
          onSave={handleSaveExpense}
          saving={savingExpense}
        />
      )}

      {viewExpense && !editingExpense && (
        <ExpenseDetailModal
          expense={viewExpense}
          onClose={() => setViewExpense(null)}
          onEdit={() => {
            setEditingExpense(viewExpense)
          }}
          onDelete={() => setDeleteTarget(viewExpense)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this expense?"
          description={`This will permanently remove ${deleteTarget.id} (${money(deleteTarget.amount)} — ${deleteTarget.category}) from your records. This cannot be undone.`}
          confirmLabel="Delete expense"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDeleteExpense(deleteTarget)}
        />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  tone?: 'positive' | 'negative'
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={`mt-1 text-xl font-semibold ${tone === 'positive' ? 'text-primary' : tone === 'negative' ? 'text-destructive' : ''}`}>{value}</p>
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

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ModalShell onClose={onCancel}>
      <div className="p-6">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  New invoice creation                                                */
/* ------------------------------------------------------------------ */

function NewInvoiceModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (invoice: Invoice) => void; saving: boolean }) {
  const [center, setCenter] = useState<Center>('nutrition')
  const [billType, setBillType] = useState(BILL_TYPE_PRESETS[0])
  const [patient, setPatient] = useState<Patient>(emptyPatient)
  const [patientMatches, setPatientMatches] = useState<ApiPatientSummary[]>([])
  const [patientSearchStatus, setPatientSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [patientLoadStatus, setPatientLoadStatus] = useState<'idle' | 'loading' | 'selected' | 'error'>('idle')
  const [items, setItems] = useState<Line[]>([{ id: Date.now(), name: '', quantity: 1, rate: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [paid, setPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const searchAbortControllerRef = useRef<AbortController | null>(null)
  const patientAbortControllerRef = useRef<AbortController | null>(null)

  const totals = useMemo(() => computeTotals(items, discount, tax, paid), [items, discount, tax, paid])

  const updateLine = (id: number, key: keyof Line, value: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: key === 'name' ? value : Math.max(0, Number(value) || 0) } : item)))

  const patientSelected = patientLoadStatus === 'selected'

  useEffect(() => {
    return () => {
      if (searchAbortControllerRef.current) searchAbortControllerRef.current.abort()
      if (patientAbortControllerRef.current) patientAbortControllerRef.current.abort()
    }
  }, [])

  const handleMrNumberChange = (value: string) => {
    const mrNumber = value.toUpperCase()
    setPatient({ ...emptyPatient, mrNumber })
    setPatientMatches([])
    setPatientLoadStatus('idle')
    setValidationErrors((current) => ({ ...current, mrNumber: '', patientName: '', contact: '' }))
  }

  useEffect(() => {
    const mrNumber = patient.mrNumber.trim()
    if (!mrNumber.trim()) {
      setPatientMatches([])
      setPatientSearchStatus('idle')
      return
    }
    if (searchAbortControllerRef.current) searchAbortControllerRef.current.abort()
    const controller = new AbortController()
    searchAbortControllerRef.current = controller
    setPatientSearchStatus('loading')

    fetch(`/api/patients?search=${encodeURIComponent(mrNumber)}&limit=20`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to search patients')
        const data = await res.json()
        setPatientMatches(data.patients || [])
        setPatientSearchStatus('idle')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setPatientMatches([])
        setPatientSearchStatus('error')
      })

    return () => controller.abort()
  }, [patient.mrNumber])

  const selectPatient = useCallback(async (mrNumber: string) => {
    if (patientAbortControllerRef.current) patientAbortControllerRef.current.abort()
    const controller = new AbortController()
    patientAbortControllerRef.current = controller
    setPatientLoadStatus('loading')
    setPatientMatches([])
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(mrNumber)}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Unable to load patient')
      const { patient: record } = await res.json()
      setPatient(toInvoicePatient(record))
      setPatientLoadStatus('selected')
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'AbortError') return
      setPatientLoadStatus('error')
    } finally {
      if (patientAbortControllerRef.current === controller) patientAbortControllerRef.current = null
    }
  }, [])

  const mrNumberValid = patient.mrNumber.trim().length > 0
  const validate = () => {
    const errors: Record<string, string> = {}
    if (!patient.mrNumber.trim()) errors.mrNumber = 'MR number is required.'
    if (!patientSelected) errors.mrNumber = 'Select a patient from the MR number search results.'
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
                placeholder="e.g. MR000003"
                className={!mrNumberValid ? 'border-destructive' : undefined}
                aria-autocomplete="list"
                aria-expanded={patientMatches.length > 0}
              />
              {patientSearchStatus === 'loading' && <p className="mt-1 text-xs text-muted-foreground">Searching patients...</p>}
              {patientSearchStatus === 'error' && <p className="mt-1 text-xs text-destructive">Unable to search patients. Please try again.</p>}
              {patientLoadStatus === 'loading' && <p className="mt-1 text-xs text-muted-foreground">Loading patient details...</p>}
              {patientLoadStatus === 'selected' && <p className="mt-1 text-xs font-medium text-primary">Patient selected — details auto-filled and locked.</p>}
              {patientLoadStatus === 'error' && <p className="mt-1 text-xs text-destructive">Unable to load patient details. Please select the patient again.</p>}
              {patient.mrNumber && patientSearchStatus === 'idle' && !patientSelected && patientLoadStatus !== 'loading' && patientMatches.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No matching patients found.</p>}
              {patientMatches.length > 0 && !patientSelected && (
                <div className="relative z-10 mt-1 rounded-lg border bg-popover shadow-md" role="listbox" aria-label="Matching patients">
                  {patientMatches.map((match) => (
                    <button type="button" key={match.mr} role="option" className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none" onClick={() => selectPatient(match.mr)}>
                      <span className="font-medium">{match.mr} — {match.patientName}</span>
                      <span className="block text-xs text-muted-foreground">Mobile: {match.mobileNumber || '-'} · Age: {match.age ?? '-'}</span>
                    </button>
                  ))}
                </div>
              )}
              {!mrNumberValid && validationErrors.mrNumber && <p className="mt-1 text-xs text-destructive">{validationErrors.mrNumber}</p>}
            </FormField>
            <FormField label="Patient name" required>
              <Input value={patient.name} readOnly aria-readonly="true" />
            </FormField>
            <FormField label="Gender">
              <select className="h-9 w-full rounded-lg border border-input bg-muted px-2 text-sm" value={patient.gender} disabled>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField label="Date of birth">
              <Input type="date" value={patient.dob} readOnly aria-readonly="true" />
            </FormField>
            <FormField label="Age">
              <Input value={patient.age} readOnly aria-readonly="true" />
            </FormField>
            <FormField label="Blood group"><Input value={patient.bloodGroup} readOnly aria-readonly="true" /></FormField>
            <FormField label="Contact number" required>
              <Input
                inputMode="numeric"
                value={patient.contact}
                readOnly
                aria-readonly="true"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Address"><Input value={patient.address} readOnly aria-readonly="true" /></FormField>
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
      await exportNodeToPdf(printRef.current, `${invoice.id}-${invoice.patient.name.replace(/\s+/g, '_')}.pdf`)
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

/* ------------------------------------------------------------------ */
/*  Expenses panel — list, search, filter                               */
/* ------------------------------------------------------------------ */

function PaginationControls({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null
  const pages = Array.from({ length: pagination.totalPages }, (_, index) => index + 1).filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 1)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm text-muted-foreground">
      <span>{pagination.total} records · Page {pagination.page} of {pagination.totalPages}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={pagination.page === 1}>First</Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1}>Previous</Button>
        {pages.map((page, index) => <Button key={page} variant={page === pagination.page ? 'default' : 'outline'} size="sm" onClick={() => onPageChange(page)}>{index > 0 && page - pages[index - 1] > 1 ? `… ${page}` : page}</Button>)}
        <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Next</Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.totalPages)} disabled={pagination.page === pagination.totalPages}>Last</Button>
      </div>
    </div>
  )
}

function ExpensesPanel({
  expenses,
  categories,
  search,
  dateFrom,
  dateTo,
  filterCategory,
  sortOrder,
  pagination,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onCategoryChange,
  onSortOrderChange,
  onPageChange,
  onAdd,
  onView,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  categories: string[]
  search: string
  dateFrom: string
  dateTo: string
  filterCategory: string
  sortOrder: SortOrder
  pagination: Pagination
  onSearchChange: (value: string) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSortOrderChange: (value: SortOrder) => void
  onPageChange: (page: number) => void
  onAdd: () => void
  onView: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Track clinic expenditure across both centers. {pagination.total} record{pagination.total === 1 ? '' : 's'} · {money(total)}</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 size-4" />
          Add expense
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search description, vendor, category…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} aria-label="From date" />
          <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} aria-label="To date" />
          <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={filterCategory} onChange={(e) => onCategoryChange(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(dateFrom || dateTo || filterCategory !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSearchChange('')
                  onDateFromChange('')
                  onDateToChange('')
                  onCategoryChange('all')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
          <select className="h-8 rounded-lg border border-input bg-background px-2 text-xs" value={sortOrder} onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}>
            <option value="latest">Sort: Latest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Paid To</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Added By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-primary">{exp.expenseNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateDisplay(exp.date)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{exp.category}</span></td>
                  <td className="px-4 py-3 max-w-[220px] truncate" title={exp.description}>{exp.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exp.paidTo}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(exp.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exp.paymentMethod}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exp.addedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => onView(exp)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => onEdit(exp)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => onDelete(exp)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No expenses match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Add / edit expense                                                  */
/* ------------------------------------------------------------------ */

function NewExpenseModal({
  initial,
  categories,
  onAddCategory,
  onClose,
  onSave,
  saving,
}: {
  initial?: Expense
  categories: string[]
  onAddCategory: (category: string) => void
  onClose: () => void
  onSave: (expense: Expense) => void
  saving?: boolean
}) {
  const isEdit = Boolean(initial)
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? '')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? EXPENSE_PAYMENT_METHODS[0])
  const [paidTo, setPaidTo] = useState(initial?.paidTo ?? '')
  const [remarks, setRemarks] = useState(initial?.remarks ?? '')
  const [receiptName, setReceiptName] = useState(initial?.receiptName)
  const [receiptDataUrl, setReceiptDataUrl] = useState(initial?.receiptDataUrl)
  const [addedBy, setAddedBy] = useState(initial?.addedBy ?? '')
  const [touched, setTouched] = useState(false)

  const dateValid = date.trim().length > 0
  const categoryValid = category.trim().length > 0
  const descriptionValid = description.trim().length > 0
  const amountValid = amount > 0
  const canSave = dateValid && categoryValid && descriptionValid && amountValid

  const handleAmountChange = (value: string) => {
    const num = Number(value)
    setAmount(Number.isNaN(num) ? 0 : Math.max(0, num))
  }

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setReceiptName(undefined)
      setReceiptDataUrl(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptName(file.name)
      setReceiptDataUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const confirmNewCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    onAddCategory(trimmed)
    setCategory(trimmed)
    setNewCategoryName('')
    setAddingCategory(false)
  }

  const handleSave = () => {
    setTouched(true)
    if (!canSave) return
    const expense: Expense = {
      id: initial?.id ?? `EXP-${Math.floor(10000 + Math.random() * 89999)}`,
      expenseNumber: initial?.expenseNumber ?? '',
      date,
      category,
      description: description.trim(),
      amount,
      paymentMethod,
      paidTo: paidTo.trim(),
      remarks: remarks.trim(),
      receiptName,
      receiptDataUrl,
      addedBy: addedBy.trim() || 'Front Office',
      createdDate: initial?.createdDate ?? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }
    onSave(expense)
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{isEdit ? 'Edit expense' : 'Add expense'}</h2>
          <p className="text-sm text-muted-foreground">{isEdit ? initial!.id : 'Record a new clinic expense.'}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Expense date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={touched && !dateValid ? 'border-destructive' : undefined} />
            {touched && !dateValid && <p className="mt-1 text-xs text-destructive">Expense date is required.</p>}
          </FormField>
          <FormField label="Category" required>
            {!addingCategory ? (
              <select
                className={`h-9 w-full rounded-lg border bg-background px-2 text-sm ${touched && !categoryValid ? 'border-destructive' : 'border-input'}`}
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setAddingCategory(true)
                  } else {
                    setCategory(e.target.value)
                  }
                }}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__new__">+ Add new category…</option>
              </select>
            ) : (
              <div className="flex gap-1.5">
                <Input autoFocus placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button size="sm" onClick={confirmNewCategory}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingCategory(false); setNewCategoryName('') }}>Cancel</Button>
              </div>
            )}
            {touched && !categoryValid && <p className="mt-1 text-xs text-destructive">Category is required.</p>}
          </FormField>
        </div>

        <FormField label="Description" required>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" className={touched && !descriptionValid ? 'border-destructive' : undefined} />
          {touched && !descriptionValid && <p className="mt-1 text-xs text-destructive">Description is required.</p>}
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Amount" required>
            <Input inputMode="decimal" value={amount} onChange={(e) => handleAmountChange(e.target.value)} className={touched && !amountValid ? 'border-destructive' : undefined} />
            {touched && !amountValid && <p className="mt-1 text-xs text-destructive">Amount must be greater than zero.</p>}
          </FormField>
          <FormField label="Payment method">
            <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {EXPENSE_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Paid to (vendor / person)"><Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} /></FormField>
          <FormField label="Added by"><Input value={addedBy} onChange={(e) => setAddedBy(e.target.value)} placeholder="Staff name" /></FormField>
        </div>

        <FormField label="Remarks (optional)"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormField>

        <FormField label="Bill / receipt upload (optional)">
          <div className="flex items-center gap-2">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-muted/50">
              <Paperclip className="size-3.5" />
              {receiptName ? 'Replace file' : 'Attach file'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </label>
            {receiptName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {receiptName}
                <button type="button" onClick={() => handleFileChange(null)} className="text-destructive" aria-label="Remove attachment">
                  <X className="size-3.5" />
                </button>
              </span>
            )}
          </div>
        </FormField>

        {isEdit && (
          <p className="text-xs text-muted-foreground">Created: {initial!.createdDate} · Expense ID: {initial!.id}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={touched && !canSave || saving}>{saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Save expense')}</Button>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Expense detail / print modal                                        */
/* ------------------------------------------------------------------ */

function ExpenseDetailModal({
  expense,
  onClose,
  onEdit,
  onDelete,
}: {
  expense: Expense
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const printRef = useRef<HTMLDivElement>(null)

  return (
    <ModalShell onClose={onClose} wide>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #expense-print-area, #expense-print-area * { visibility: visible; }
          #expense-print-area {
            position: absolute;
            inset: 0;
            width: 210mm;
            margin: 0 auto;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div>
          <h2 className="font-display text-lg font-semibold">Expense details</h2>
          <p className="text-sm text-muted-foreground">{expense.expenseNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 size-4 text-destructive" />
            Delete
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[80vh] overflow-y-auto bg-muted/30 px-6 py-6 print:max-h-none print:overflow-visible print:bg-transparent print:px-0 print:py-0">
        <div id="expense-print-area" ref={printRef} className="mx-auto w-full max-w-[210mm] space-y-5 bg-white p-10 text-black shadow-sm print:shadow-none" style={{ fontFamily: PRINT_FONT }}>
          <div className="border-b-2 border-black pb-3 text-center">
            <h1 className="text-2xl font-bold tracking-wide">Expense Voucher</h1>
            <p className="mt-1 text-xs text-neutral-600">New You Nutrition Center &amp; Ayurcare Center</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p><span className="text-neutral-500">Expense ID: </span>{expense.expenseNumber}</p>
            <p><span className="text-neutral-500">Date: </span>{formatDateDisplay(expense.date)}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border border-neutral-300 p-4 text-sm">
            <p><span className="text-neutral-500">Category: </span>{expense.category}</p>
            <p><span className="text-neutral-500">Amount: </span>{money(expense.amount)}</p>
            <p><span className="text-neutral-500">Payment method: </span>{expense.paymentMethod}</p>
            <p><span className="text-neutral-500">Paid to: </span>{expense.paidTo || '-'}</p>
            <p className="col-span-2"><span className="text-neutral-500">Description: </span>{expense.description}</p>
            {expense.remarks && <p className="col-span-2"><span className="text-neutral-500">Remarks: </span>{expense.remarks}</p>}
            <p><span className="text-neutral-500">Added by: </span>{expense.addedBy}</p>
            <p><span className="text-neutral-500">Created: </span>{expense.createdDate}</p>
          </div>

          {expense.receiptDataUrl && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Attached receipt</p>
              {expense.receiptDataUrl.startsWith('data:image') ? (
                <img src={expense.receiptDataUrl} alt={expense.receiptName ?? 'Receipt'} className="max-h-80 rounded border border-neutral-300 object-contain" />
              ) : (
                <a href={expense.receiptDataUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  {expense.receiptName ?? 'View attached file'}
                </a>
              )}
            </div>
          )}

          <div className="mt-16 flex items-end justify-between text-xs text-neutral-600">
            <div className="text-center">
              <div className="w-40 border-t border-neutral-500 pt-1">Prepared By</div>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-neutral-500 pt-1">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

