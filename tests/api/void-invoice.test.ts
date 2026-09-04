import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/billing/[id]/route'
import { GET as billingGet } from '@/app/api/billing/route'
import { GET as summaryGet } from '@/app/api/billing/summary/route'
import { prisma } from '@/lib/prisma'
import { encryptSession, hashPassword } from '@/lib/session'

function authHeaders(userId: string, role: string) {
  const token = encryptSession({
    userId,
    role,
    expiresAt: Date.now() + 86400000,
  })
  return { Cookie: `session=${token}` }
}

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.patient.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Void Invoice', () => {
  it('PATCH voids an invoice and sets void fields', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.upsert({
      where: { username: 'voiduser' },
      update: {},
      create: {
        username: 'voiduser',
        name: 'Void User',
        passwordHash,
        role: 'receptionist',
        active: true,
      },
    })

    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-001',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'Paid',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
      include: { items: true },
    })

    const req = new NextRequest(`http://localhost/api/billing/${encodeURIComponent(invoice.invoiceNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user.id, 'receptionist') },
      body: JSON.stringify({ status: 'VOID', voidReason: 'Duplicate invoice' }),
    })

    const res = await PATCH(req, { params: { id: invoice.invoiceNumber } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoice.status).toBe('VOID')
    expect(data.invoice.voidedBy).toBe('Void User')
    expect(data.invoice.voidReason).toBe('Duplicate invoice')
    expect(data.invoice.voidedAt).toBeTruthy()
  })

  it('PATCH rejects voiding an already voided invoice', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.upsert({
      where: { username: 'voiduser2' },
      update: {},
      create: {
        username: 'voiduser2',
        name: 'Void User 2',
        passwordHash,
        role: 'receptionist',
        active: true,
      },
    })

    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000002', consultationType: 'NUTRITION', patientName: 'Test2', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999998', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-002',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test2',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'VOID',
        voidedAt: new Date(),
        voidedBy: 'Someone',
        voidReason: 'Duplicate',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
      include: { items: true },
    })

    const req = new NextRequest(`http://localhost/api/billing/${encodeURIComponent(invoice.invoiceNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user.id, 'receptionist') },
      body: JSON.stringify({ status: 'VOID', voidReason: 'Another reason' }),
    })

    const res = await PATCH(req, { params: { id: invoice.invoiceNumber } })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invoice is already voided')
  })

  it('PATCH rejects void without voidReason', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.upsert({
      where: { username: 'voiduser3' },
      update: {},
      create: {
        username: 'voiduser3',
        name: 'Void User 3',
        passwordHash,
        role: 'receptionist',
        active: true,
      },
    })

    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000003', consultationType: 'NUTRITION', patientName: 'Test3', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999997', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-003',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test3',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'Paid',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
      include: { items: true },
    })

    const req = new NextRequest(`http://localhost/api/billing/${encodeURIComponent(invoice.invoiceNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user.id, 'receptionist') },
      body: JSON.stringify({ status: 'VOID' }),
    })

    const res = await PATCH(req, { params: { id: invoice.invoiceNumber } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('voidReason is required')
  })

  it('PATCH rejects void without session', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000004', consultationType: 'NUTRITION', patientName: 'Test4', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999996', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-004',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test4',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'Paid',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
      include: { items: true },
    })

    const req = new NextRequest(`http://localhost/api/billing/${encodeURIComponent(invoice.invoiceNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VOID', voidReason: 'Duplicate' }),
    })

    const res = await PATCH(req, { params: { id: invoice.invoiceNumber } })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('GET excludes voided invoices', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000005', consultationType: 'NUTRITION', patientName: 'Test5', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999995', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-005',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test5',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'VOID',
        voidedAt: new Date(),
        voidedBy: 'Tester',
        voidReason: 'Duplicate',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
    })

    const req = new NextRequest('http://localhost/api/billing', { method: 'GET' })
    const res = await billingGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoices.find((inv: any) => inv.invoiceNumber === 'INV-005')).toBeUndefined()
  })

  it('GET returns voided invoice when requested by ID', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000006', consultationType: 'NUTRITION', patientName: 'Test6', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999994', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-006',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test6',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'VOID',
        voidedAt: new Date(),
        voidedBy: 'Tester',
        voidReason: 'Duplicate',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
    })

    const { GET } = await import('@/app/api/billing/[id]/route')
    const req = new NextRequest('http://localhost/api/billing/INV-006', { method: 'GET' })
    const res = await GET(req, { params: { id: 'INV-006' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.invoice.id).toBe('INV-006')
  })

  it('summary excludes voided invoices', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000007', consultationType: 'NUTRITION', patientName: 'Test7', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999993', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    })

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-007',
        patientMrNumber: patient.mr,
        center: 'NUTRITION',
        billType: 'Consultation',
        patientName: 'Test7',
        invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        subtotal: 100,
        tax: 10,
        grandTotal: 110,
        paid: 110,
        balance: 0,
        status: 'VOID',
        voidedAt: new Date(),
        voidedBy: 'Tester',
        voidReason: 'Duplicate',
        items: {
          create: { name: 'Consultation', quantity: 1, rate: 100 },
        },
      },
    })

    const req = new NextRequest('http://localhost/api/billing/summary', { method: 'GET' })
    const res = await summaryGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalRevenue).toBe(0)
    expect(data.outstandingPatientBills).toBe(0)
  })
})
