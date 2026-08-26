import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/visits/route'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.visit.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.visitSequence.deleteMany()
  await prisma.mRSequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function createPatient(mr: string, patientName: string, mobileNumber: string) {
  return prisma.patient.create({
    data: {
      mr,
      consultationType: 'NUTRITION',
      patientName,
      parentName: 'Parent',
      gender: 'Male',
      mobileNumber,
      address: 'Address',
      district: 'Kannur',
      state: 'Kerala',
      pinCode: '670001',
    },
  })
}

describe('Visits API', () => {
  it('GET paginates visits when page and limit are provided', async () => {
    const patient = await createPatient('MR000001', 'Paged Patient', '9999999991')
    await prisma.visit.create({ data: { id: 'NU000001', patientMr: patient.mr, center: 'Nutrition Center', status: 'Waiting' } })
    await prisma.visit.create({ data: { id: 'NU000002', patientMr: patient.mr, center: 'Nutrition Center', status: 'Active' } })
    await prisma.visit.create({ data: { id: 'NU000003', patientMr: patient.mr, center: 'Nutrition Center', status: 'Completed' } })

    const req = new Request('http://localhost/api/visits?page=2&limit=2', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visits).toHaveLength(1)
    expect(data.total).toBe(3)
    expect(data.page).toBe(2)
    expect(data.limit).toBe(2)
    expect(data.totalPages).toBe(2)
  })

  it('GET applies search and filters before pagination', async () => {
    const first = await createPatient('MR000001', 'Anu Nair', '9999999991')
    const second = await createPatient('MR000002', 'Ravi Menon', '9999999992')
    await prisma.visit.create({ data: { id: 'NU000001', patientMr: first.mr, doctor: 'Dr. Neha', center: 'Nutrition Center', status: 'Waiting' } })
    await prisma.visit.create({ data: { id: 'AY000001', patientMr: second.mr, doctor: 'Dr. Arun', center: 'Ayurcare Center', status: 'Waiting' } })

    const req = new Request('http://localhost/api/visits?page=1&limit=20&search=Anu&center=Nutrition%20Center&status=Waiting', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visits).toHaveLength(1)
    expect(data.visits[0].patientMr).toBe(first.mr)
    expect(data.visits[0].patient.patientName).toBe('Anu Nair')
    expect(data.total).toBe(1)
  })
})
