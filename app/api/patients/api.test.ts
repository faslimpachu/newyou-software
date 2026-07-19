import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as registerPost } from '@/app/api/register/route'
import { PATCH as patientPatch, GET as patientGet } from '@/app/api/patients/[mr]/route'
import { prisma } from '@/lib/prisma'

function uniqueMobile() {
  return `${Date.now()}`.slice(-10)
}

describe('Patient register and update APIs', () => {
  it('register persists emergency, medical, lifestyle, and email fields', async () => {
    const mobile = uniqueMobile()
    const payload = {
      consultationType: 'NUTRITION',
      patientName: 'Test Patient',
      parentName: 'Parent Name',
      gender: 'Male',
      mobileNumber: mobile,
      email: 'test@example.com',
      address: '123 Test St',
      district: 'TestCity',
      state: 'Karnataka',
      pinCode: '560001',
      dob: '1990-05-15',
      age: 34,
      bloodGroup: 'O+',
      doctor: 'Dr. Test',
      emergencyName: 'Emergency Contact',
      emergencyPhone: '9876543210',
      emergencyRelation: 'Spouse',
      allergies: 'Peanuts',
      conditions: 'None',
      medications: 'None',
      smoking: 'Never',
      alcohol: 'Never',
      exercise: 'Moderate',
      diet: 'Vegetarian',
    }

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const response = await registerPost(request)
    expect(response.status).toBe(201)
    const body = await response.json()
    const mr = body.mr as string

    const patient = await prisma.patient.findUnique({
      where: { mr },
    })

    expect(patient).not.toBeNull()
    expect(patient!.emergencyContactName).toBe('Emergency Contact')
    expect(patient!.emergencyContactPhone).toBe('9876543210')
    expect(patient!.emergencyContactRelation).toBe('Spouse')
    expect(patient!.allergies).toBe('Peanuts')
    expect(patient!.conditions).toBe('None')
    expect(patient!.medications).toBe('None')
    expect(patient!.smoking).toBe('Never')
    expect(patient!.alcohol).toBe('Never')
    expect(patient!.exercise).toBe('Moderate')
    expect(patient!.diet).toBe('Vegetarian')
    expect(patient!.email).toBe('test@example.com')
    expect(patient!.dob).not.toBeNull()
    expect(new Date(patient!.dob!).toISOString().slice(0, 10)).toBe('1990-05-15')

    await prisma.visit.deleteMany({ where: { patientMr: mr } })
    await prisma.patient.delete({ where: { mr } })
  })

  it('PATCH updates email and other patient fields', async () => {
    const mobile = uniqueMobile()
    const created = await prisma.patient.create({
      data: {
        mr: `NU${mobile.slice(-6)}`,
        consultationType: 'NUTRITION',
        patientName: 'Patch Test',
        parentName: 'Parent',
        gender: 'Male',
        mobileNumber: mobile,
        address: 'Patch St',
        district: 'PatchCity',
        state: 'Karnataka',
        pinCode: '560001',
      },
    })

    const payload = {
      email: 'updated@example.com',
      emergencyName: 'Updated Emergency',
      emergencyPhone: '9999999999',
      emergencyRelation: 'Parent',
      allergies: 'Dust',
      conditions: 'Asthma',
      medications: 'Inhaler',
      smoking: 'Former',
      alcohol: 'Occasional',
      exercise: 'Active',
      diet: 'Non-Vegetarian',
      dob: '1985-03-20',
    }

    const request = new NextRequest(`http://localhost/api/patients/${encodeURIComponent(created.mr)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const response = await patientPatch(request, { params: Promise.resolve({ mr: created.mr }) } as any)
    expect(response.status).toBe(200)

    const patient = await prisma.patient.findUnique({
      where: { mr: created.mr },
    })

    expect(patient).not.toBeNull()
    expect(patient!.email).toBe('updated@example.com')
    expect(patient!.emergencyContactName).toBe('Updated Emergency')
    expect(patient!.emergencyContactPhone).toBe('9999999999')
    expect(patient!.emergencyContactRelation).toBe('Parent')
    expect(patient!.allergies).toBe('Dust')
    expect(patient!.conditions).toBe('Asthma')
    expect(patient!.medications).toBe('Inhaler')
    expect(patient!.smoking).toBe('Former')
    expect(patient!.alcohol).toBe('Occasional')
    expect(patient!.exercise).toBe('Active')
    expect(patient!.diet).toBe('Non-Vegetarian')
    expect(patient!.dob).not.toBeNull()
    expect(new Date(patient!.dob!).toISOString().slice(0, 10)).toBe('1985-03-20')

    await prisma.visit.deleteMany({ where: { patientMr: created.mr } })
    await prisma.patient.delete({ where: { mr: created.mr } })
  })

  it('GET returns patient with all new fields', async () => {
    const mobile = uniqueMobile()
    const created = await prisma.patient.create({
      data: {
        mr: `NU${mobile.slice(-6)}`,
        consultationType: 'NUTRITION',
        patientName: 'Get Test',
        parentName: 'Parent',
        gender: 'Male',
        mobileNumber: mobile,
        email: 'get@example.com',
        address: 'Get St',
        district: 'GetCity',
        state: 'Karnataka',
        pinCode: '560001',
        allergies: 'Pollen',
        conditions: 'Fever',
        medications: 'Paracetamol',
        emergencyContactName: 'Emergency',
        emergencyContactPhone: '9876543297',
        emergencyContactRelation: 'Friend',
        smoking: 'Never',
        alcohol: 'Never',
        exercise: 'Light',
        diet: 'Vegan',
      },
    })

    const request = new NextRequest(`http://localhost/api/patients/${encodeURIComponent(created.mr)}`, {
      method: 'GET',
    })

    const response = await patientGet(request, { params: Promise.resolve({ mr: created.mr }) } as any)
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.patient.allergies).toBe('Pollen')
    expect(body.patient.conditions).toBe('Fever')
    expect(body.patient.medications).toBe('Paracetamol')
    expect(body.patient.emergencyContactName).toBe('Emergency')
    expect(body.patient.emergencyContactPhone).toBe('9876543297')
    expect(body.patient.emergencyContactRelation).toBe('Friend')
    expect(body.patient.smoking).toBe('Never')
    expect(body.patient.alcohol).toBe('Never')
    expect(body.patient.exercise).toBe('Light')
    expect(body.patient.diet).toBe('Vegan')
    expect(body.patient.email).toBe('get@example.com')

    await prisma.visit.deleteMany({ where: { patientMr: created.mr } })
    await prisma.patient.delete({ where: { mr: created.mr } })
  })
})
