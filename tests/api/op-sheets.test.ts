import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/op-sheets/route';
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
      data: { patientMr: patient.mr, status: 'Waiting' },
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

  it('POST returns 400 if missing fields', async () => {
    const req = new Request('http://localhost/api/op-sheets', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('GET returns empty list when no sheets', async () => {
    const req = new Request('http://localhost/api/op-sheets', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sheets).toEqual([]);
  });
});
