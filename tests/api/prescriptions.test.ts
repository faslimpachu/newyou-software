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
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit.id, opSheetId: opSheet.id, diagnosis: 'Flu', medicines: 'Paracetamol' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.prescription.diagnosis).toBe('Flu');
  });

  it('POST returns 404 for missing patient', async () => {
    const req = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: 'MR999999', visitId: 'NU999999', opSheetId: 'missing' }),
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

  it('POST creates a prescription without opSheetId', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000002', consultationType: 'NUTRITION', patientName: 'Test2', parentName: 'P',
        gender: 'Female', mobileNumber: '8888888888', address: 'Addr2', district: 'D2', state: 'S2', pinCode: '654321',
      },
    });

    const visit = await prisma.visit.create({
      data: { id: 'NU000002', patientMr: patient.mr, status: 'Waiting' },
    });

    const req = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit.id, diagnosis: 'Cold', medicines: 'Dolo' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.prescription.diagnosis).toBe('Cold');
    expect(data.prescription.opSheetId).toBeNull();
  });

  it('POST creates multiple prescriptions without opSheetId', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000003', consultationType: 'AYURCARE', patientName: 'Test3', parentName: 'P',
        gender: 'Male', mobileNumber: '7777777777', address: 'Addr3', district: 'D3', state: 'S3', pinCode: '111111',
      },
    });

    const visit1 = await prisma.visit.create({
      data: { id: 'NU000003', patientMr: patient.mr, status: 'Waiting' },
    });

    const visit2 = await prisma.visit.create({
      data: { id: 'NU000004', patientMr: patient.mr, status: 'Waiting' },
    });

    const req1 = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit1.id, diagnosis: 'Fever', medicines: 'Crocin' }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(201);

    const req2 = new Request('http://localhost/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, visitId: visit2.id, diagnosis: 'Cough', medicines: 'Benadryl' }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(201);

    const listReq = new Request('http://localhost/api/prescriptions?patientMr=' + patient.mr, { method: 'GET' });
    const listRes = await GET(listReq);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.prescriptions).toHaveLength(2);
  });
});
