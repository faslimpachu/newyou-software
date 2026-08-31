'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Printer, Stethoscope, CheckCircle2, AlertCircle } from 'lucide-react'

type PatientMatch = {
  mr: string
  patientName: string
  mobileNumber: string
  age: number | null
}

type Product = {
  id: string
  name: string
  sku: string | null
  unit: string
  sellingPrice: number
  currentStock: number
}

type Batch = {
  id: string
  batchNumber: string
  quantity: number
  sellingPrice: number
  expiryDate: string | null
}

type SaleReceipt = {
  saleNumber: string
  customerName: string
  customerPhone: string | null
  productName: string
  batchNumber: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentMethod: string
  createdAt: string
}

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK'] as const

const printMoney = (value: number) => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

function buildReceiptHtml(sale: SaleReceipt): string {
  return `<!doctype html>
<html>
<head>
  <title>Pharmacy Sale ${escapeHtml(sale.saleNumber)}</title>
  <style>
    @page { size: A5 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 11px; }
    .letterhead { border-bottom: 2px solid #111827; padding-bottom: 8px; text-align: center; }
    .letterhead h1 { font-size: 20px; margin: 0; }
    .letterhead p { color: #4b5563; line-height: 1.4; margin: 3px 0 0; }
    .title { display: flex; justify-content: space-between; margin: 12px 0; }
    .title h2 { font-size: 14px; margin: 0; text-transform: uppercase; }
    .box { border: 1px solid #d1d5db; display: grid; gap: 6px 18px; grid-template-columns: 1fr 1fr; padding: 10px; }
    .label { color: #6b7280; display: block; font-size: 10px; text-transform: uppercase; }
    table { border-collapse: collapse; margin-top: 14px; width: 100%; }
    th { border-bottom: 2px solid #111827; font-size: 10px; padding: 6px 5px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #e5e7eb; padding: 7px 5px; vertical-align: top; }
    .right { text-align: right; }
    .totals { margin-left: auto; margin-top: 12px; width: 230px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { border-top: 2px solid #111827; font-size: 13px; font-weight: 700; margin-top: 4px; padding-top: 6px; }
    .footer { color: #6b7280; font-size: 10px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <header class="letterhead">
    <h1>NEW YOU</h1>
    <p>Center for Weight Management</p>
    <p>Onden Road, Kannur - 670001, Kerala<br>PH: 8111999581 / 8111999582</p>
  </header>
  <section class="title">
    <div>
      <h2>Pharmacy Sale</h2>
      <p><strong>${escapeHtml(sale.saleNumber)}</strong></p>
    </div>
    <div class="right">
      <p><span class="label">Date</span>${escapeHtml(new Date(sale.createdAt).toLocaleDateString('en-IN'))}</p>
      <p><span class="label">Payment</span>${escapeHtml(sale.paymentMethod)}</p>
    </div>
  </section>
  <section class="box">
    <div><span class="label">Customer</span>${escapeHtml(sale.customerName)}</div>
    <div><span class="label">Phone</span>${escapeHtml(sale.customerPhone || '-')}</div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Batch</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(sale.productName)}</td>
        <td>${escapeHtml(sale.batchNumber || '-')}</td>
        <td class="right">${escapeHtml(sale.quantity)}</td>
        <td class="right">${escapeHtml(printMoney(sale.unitPrice))}</td>
        <td class="right">${escapeHtml(printMoney(sale.totalAmount))}</td>
      </tr>
    </tbody>
  </table>
  <section class="totals">
    <div class="grand"><span>Total</span><span>${escapeHtml(printMoney(sale.totalAmount))}</span></div>
  </section>
  <p class="footer">This is a computer-generated pharmacy sale receipt.</p>
</body>
</html>`
}

function printReceipt(sale: SaleReceipt) {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document
  if (!frameDoc) {
    window.alert('Unable to create print preview. Please try again.')
    document.body.removeChild(printFrame)
    return
  }

  frameDoc.open()
  frameDoc.write(buildReceiptHtml(sale))
  frameDoc.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    setTimeout(() => {
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame)
      }
    }, 1000)
  }

  printFrame.onload = doPrint
  setTimeout(doPrint, 100)
}

export default function PharmacySalesPage() {
  const [mrNumber, setMrNumber] = useState('')
  const [patientMatches, setPatientMatches] = useState<PatientMatch[]>([])
  const [patientSearchStatus, setPatientSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [mrLinked, setMrLinked] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [address, setAddress] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successSale, setSuccessSale] = useState<SaleReceipt | null>(null)

  const searchAbortRef = useRef<AbortController | null>(null)
  const patientAbortRef = useRef<AbortController | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?active=true')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const loadBatches = useCallback(async (pid: string) => {
    if (!pid) {
      setBatches([])
      return
    }
    try {
      const res = await fetch(`/api/batches?productId=${encodeURIComponent(pid)}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(
          (data.batches || [])
            .map((b: any) => ({
              id: b.id,
              batchNumber: b.batchNumber,
              quantity: Number(b.quantity),
              sellingPrice: Number(b.sellingPrice),
              expiryDate: b.expiryDate,
            }))
            .filter((b: Batch) => b.quantity > 0)
        )
      }
    } catch {
      // ignore
    }
  }, [])

  const handleMrChange = (value: string) => {
    const next = value.toUpperCase()
    setMrNumber(next)
    setPatientMatches([])
    setMrLinked(false)
    setPatientSearchStatus('idle')
  }

  useEffect(() => {
    const trimmed = mrNumber.trim()
    if (!trimmed) {
      setPatientMatches([])
      setPatientSearchStatus('idle')
      return
    }
    if (searchAbortRef.current) searchAbortRef.current.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setPatientSearchStatus('loading')
    fetch(`/api/patients?search=${encodeURIComponent(trimmed)}&limit=20`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to search patients')
        const data = await res.json()
        setPatientMatches(data.patients || [])
        setPatientSearchStatus('idle')
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return
        setPatientMatches([])
        setPatientSearchStatus('error')
      })
    return () => controller.abort()
  }, [mrNumber])

  const selectPatient = useCallback(async (mr: string) => {
    if (patientAbortRef.current) patientAbortRef.current.abort()
    const controller = new AbortController()
    patientAbortRef.current = controller
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(mr)}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Unable to load patient')
      const { patient } = await res.json()
      setMrNumber(patient.mr || mr)
      setCustomerName(patient.patientName || '')
      setCustomerPhone(patient.mobileNumber || '')
      setGender(patient.gender || '')
      setAge(patient.age === null || patient.age === undefined ? '' : String(patient.age))
      setDateOfBirth(patient.dob ? new Date(patient.dob).toISOString().slice(0, 10) : '')
      setBloodGroup(patient.bloodGroup || '')
      const addressParts = [patient.address, patient.district, patient.state, patient.pinCode].filter(Boolean)
      setAddress(addressParts.join(', '))
      setMrLinked(true)
      setPatientMatches([])
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      setError('Unable to load patient details. Please enter manually.')
    } finally {
      if (patientAbortRef.current === controller) patientAbortRef.current = null
    }
  }, [])

  const handleProductChange = (value: string) => {
    setProductId(value || '')
    setBatchId('')
    setUnitPrice('')
    void loadBatches(value)
  }

  const handleBatchChange = (value: string) => {
    setBatchId(value || '')
    const batch = batches.find((b) => b.id === value)
    if (batch) {
      const price = batch.sellingPrice > 0 ? batch.sellingPrice : productSellingPrice
      setUnitPrice(price ? String(price) : '')
    }
  }

  const productSellingPrice = products.find((p) => p.id === productId)?.sellingPrice || 0
  const selectedBatch = batches.find((b) => b.id === batchId)
  const qtyNum = Number(quantity) || 0
  const stockError = selectedBatch && qtyNum > Number(selectedBatch.quantity)
    ? `Only ${Number(selectedBatch.quantity)} in stock for this batch`
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessSale(null)

    if (!mrNumber.trim()) {
      setError('MR number is required')
      return
    }
    if (!mrLinked) {
      setError('Please select a patient from the MR number search results')
      return
    }
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }
    if (!productId) {
      setError('Please select a product')
      return
    }
    if (!batchId) {
      setError('Please select a batch')
      return
    }
    if (qtyNum <= 0) {
      setError('Quantity must be greater than zero')
      return
    }
    if (stockError) {
      setError(stockError)
      return
    }
    if (!paymentMethod) {
      setError('Please select a payment method')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/pharmacy-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMr: mrLinked ? mrNumber.trim() : null,
          customerName,
          customerPhone,
          gender,
          age,
          dateOfBirth,
          bloodGroup,
          address,
          productId,
          batchId,
          quantity: qtyNum,
          unitPrice: unitPrice ? Number(unitPrice) : 0,
          paymentMethod,
          notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to record sale')
        return
      }
      const product = products.find((p) => p.id === productId)
      const sale: SaleReceipt = {
        saleNumber: data.sale.saleNumber,
        customerName: data.sale.customerName,
        customerPhone: data.sale.customerPhone,
        productName: product?.name || '-',
        batchNumber: selectedBatch?.batchNumber || '-',
        quantity: Number(data.sale.quantity),
        unitPrice: Number(data.sale.unitPrice),
        totalAmount: Number(data.sale.totalAmount),
        paymentMethod: data.sale.paymentMethod,
        createdAt: data.sale.createdAt,
      }
      setSuccessSale(sale)
      // reset form
      setMrNumber('')
      setMrLinked(false)
      setCustomerName('')
      setCustomerPhone('')
      setGender('')
      setAge('')
      setDateOfBirth('')
      setBloodGroup('')
      setAddress('')
      setProductId('')
      setBatchId('')
      setBatches([])
      setQuantity('')
      setUnitPrice('')
      setNotes('')
      void loadProducts()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Pharmacy Sales
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sell medicines/products from stock and print a receipt
          </p>
        </div>

        {successSale && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Sale {successSale.saleNumber} recorded
                  </p>
                  <p className="text-xs text-green-800">
                    {successSale.productName} · {successSale.quantity} · {printMoney(successSale.totalAmount)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => printReceipt(successSale)}>
                  <Printer className="mr-2 size-4" />
                  Print Receipt
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSuccessSale(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="size-4" />
              New Sale
            </CardTitle>
            <CardDescription>Enter a patient MR number to auto-fill and lock their details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mrNumber">MR Number <span className="text-destructive">*</span></Label>
                  {mrLinked ? (
                    <div className="flex items-center gap-2">
                      <Input id="mrNumber" value={mrNumber} readOnly aria-readonly="true" className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMrLinked(false)
                          setPatientMatches([])
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="mrNumber"
                        value={mrNumber}
                        onChange={(e) => handleMrChange(e.target.value)}
                        placeholder="e.g. MR000003"
                        aria-autocomplete="list"
                        aria-expanded={patientMatches.length > 0}
                        required
                      />
                      {patientMatches.length > 0 && !mrLinked && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-md" role="listbox">
                          {patientMatches.map((match) => (
                            <button
                              type="button"
                              key={match.mr}
                              role="option"
                              className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => void selectPatient(match.mr)}
                            >
                              <span className="font-medium">{match.mr} — {match.patientName}</span>
                              <span className="block text-xs text-muted-foreground">
                                Mobile: {match.mobileNumber || '-'} · Age: {match.age ?? '-'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {patientSearchStatus === 'loading' && (
                    <p className="text-xs text-muted-foreground">Searching patients...</p>
                  )}
                  {mrLinked && (
                    <p className="text-xs font-medium text-primary">Patient linked — details auto-filled and locked.</p>
                  )}
                  {mrNumber.trim() && patientSearchStatus === 'idle' && !mrLinked && patientMatches.length === 0 && (
                    <p className="text-xs text-muted-foreground">No matching patient found. The MR number must belong to an existing patient.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Auto-filled from MR lookup"
                    required
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Auto-filled from MR lookup"
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender || undefined} onValueChange={setGender} disabled>
                    <SelectTrigger id="gender" className="bg-muted">
                      <SelectValue placeholder="Auto-filled" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Auto-filled"
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="Auto-filled"
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Auto-filled from MR lookup"
                    readOnly
                    aria-readonly="true"
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale details</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product</Label>
                    <SearchableSelect
                      value={productId || ''}
                      onValueChange={handleProductChange}
                      placeholder="Select product"
                      renderValue={(id) => {
                        const product = products.find((p) => p.id === id)
                        return product ? `${product.name}${product.sku ? ` (${product.sku})` : ''}` : 'Select product'
                      }}
                    >
                      {products.map((product) => (
                        <SearchableSelectItem key={product.id} value={product.id}>
                          {product.name}{product.sku ? ` (${product.sku})` : ''}
                        </SearchableSelectItem>
                      ))}
                    </SearchableSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchId">Batch</Label>
                    <Select value={batchId || undefined} onValueChange={handleBatchChange}>
                      <SelectTrigger id="batchId">
                        <SelectValue placeholder={productId ? 'Select batch' : 'Select product first'}>
                          {selectedBatch
                            ? `${selectedBatch.batchNumber} — ${Number(selectedBatch.quantity)} left`
                            : productId
                              ? 'Select batch'
                              : 'Select product first'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber} — {Number(batch.quantity)} left
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {batches.length === 0 && productId && (
                      <p className="text-xs text-muted-foreground">No stock available for this product</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    {stockError && <p className="text-sm text-destructive">{stockError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                {productId && batchId && qtyNum > 0 && (
                  <div className="mt-4 flex justify-end">
                    <div className="w-full max-w-xs space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="tabular-nums">
                          ₹{((Number(unitPrice) || 0) * qtyNum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Recording...' : 'Record Sale'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
