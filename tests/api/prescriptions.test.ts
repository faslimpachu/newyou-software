import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/prescriptions/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.prescription.deleteMany();
  await prisma.oPSheet.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
  await prisma.visitSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Prescriptions API', () => {
  it('POST creates a prescription', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const visit = await prisma.visit.create({
      data: { id: 'NU000001', patientMr: patient.mr, status: 'Waiting' },
    });

    const opSheet = await prisma.oPSheet.create({
      data: { patientMr: patient.mr, visitId: visit.id },
    });

    const req = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, opSheetId: opSheet.id, diagnosis: 'Flu', medicines: 'Paracetamol' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.prescription.diagnosis).toBe('Flu');
  });

  it('POST returns 404 for missing patient', async () => {
    const req = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: 'MR999999', opSheetId: 'missing' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('GET returns empty list when no prescriptions', async () => {
    const req = new Request('http://localhost/api/prescriptions', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.prescriptions).toEqual([]);
  });
});
