import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, PATCH, POST } from '@/app/api/op-sheets/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.oPSheet.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
  await prisma.visitSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('OP Sheets API', () => {
  it('POST creates an OP sheet', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const visit = await prisma.visit.create({
      data: { id: 'NU000001', patientMr: patient.mr, status: 'Waiting' },
    });

    const req = new Request('http://localhost/api/op-sheets', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit.id, clinicalExamination: 'Notes', vitals: 'BP 120/80' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.sheet.patientMr).toBe(patient.mr);
    expect(data.sheet.visitId).toBe(visit.id);
  });

  it('POST accepts long clinical textarea fields', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000010', consultationType: 'NUTRITION', patientName: 'Long OP', parentName: 'P',
        gender: 'Male', mobileNumber: '6666666666', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const visit = await prisma.visit.create({
      data: { id: 'NU000010', patientMr: patient.mr, status: 'Waiting' },
    });

    const clinicalExamination = 'Clinical examination note '.repeat(20);
    const vitals = JSON.stringify({ bloodPressure: '120/80', pulse: '72', notes: 'Vitals observations '.repeat(20) });
    const diagnosis = 'OP diagnosis note '.repeat(20);
    const symptoms = 'Symptom details '.repeat(20);

    expect(clinicalExamination.length).toBeGreaterThan(191);
    expect(vitals.length).toBeGreaterThan(191);
    expect(diagnosis.length).toBeGreaterThan(191);
    expect(symptoms.length).toBeGreaterThan(191);

    const req = new Request('http://localhost/api/op-sheets', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit.id, clinicalExamination, vitals, diagnosis, symptoms }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.sheet.clinicalExamination).toBe(clinicalExamination);
    expect(data.sheet.vitals).toBe(vitals);
    expect(data.sheet.diagnosis).toBe(diagnosis);
    expect(data.sheet.symptoms).toBe(symptoms);
  });

  it('POST returns 400 if missing fields', async () => {
    const req = new Request('http://localhost/api/op-sheets', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('PATCH updates an existing OP sheet', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000011', consultationType: 'NUTRITION', patientName: 'Edit OP', parentName: 'P',
        gender: 'Male', mobileNumber: '5555555555', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const visit = await prisma.visit.create({
      data: { id: 'NU000011', patientMr: patient.mr, status: 'Waiting' },
    });

    const sheet = await prisma.oPSheet.create({
      data: {
        patientMr: patient.mr,
        visitId: visit.id,
        clinicalExamination: 'Old clinical notes',
        vitals: '{}',
        diagnosis: 'Old treatment plan',
        symptoms: 'Old investigations',
      },
    });

    const vitals = JSON.stringify({ Weight: ['70', '68', '', '', '-2'] });
    const req = new Request('http://localhost/api/op-sheets', {
      method: 'PATCH',
      body: JSON.stringify({
        id: sheet.id,
        clinicalExamination: 'Updated clinical notes',
        vitals,
        diagnosis: 'Updated treatment plan',
        symptoms: 'Updated investigations',
        status: 'Completed',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sheet.id).toBe(sheet.id);
    expect(data.sheet.clinicalExamination).toBe('Updated clinical notes');
    expect(data.sheet.vitals).toBe(vitals);
    expect(data.sheet.diagnosis).toBe('Updated treatment plan');
    expect(data.sheet.symptoms).toBe('Updated investigations');
    expect(data.sheet.status).toBe('Completed');

    const saved = await prisma.oPSheet.findUniqueOrThrow({ where: { id: sheet.id } });
    expect(saved.clinicalExamination).toBe('Updated clinical notes');
  });

  it('PATCH returns 404 for missing OP sheet', async () => {
    const req = new Request('http://localhost/api/op-sheets', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'missing-op', clinicalExamination: 'Nope' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it('GET returns empty list when no sheets', async () => {
    const req = new Request('http://localhost/api/op-sheets', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sheets).toEqual([]);
  });
});
