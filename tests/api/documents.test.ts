import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST, PATCH, DELETE } from '@/app/api/patients/[mr]/documents/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.document.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Documents API', () => {
  it('POST creates a document', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const req = new Request(`http://localhost/api/patients/${patient.mr}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Report', category: 'Lab', fileName: 'report.pdf', filePath: '/uploads/report.pdf', fileType: 'pdf' }),
    });
    const res = await (POST as any)(req, { params: { mr: patient.mr } });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.document.title).toBe('Report');
  });

  it('GET returns documents for patient', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    await prisma.document.create({
      data: { patientMr: patient.mr, title: 'Doc1', fileName: 'f.pdf', filePath: '/f.pdf' },
    });

    const req = new Request(`http://localhost/api/patients/${patient.mr}/documents`, { method: 'GET' });
    const res = await (GET as any)(req, { params: { mr: patient.mr } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documents.length).toBe(1);
  });

  it('PATCH updates document', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const doc = await prisma.document.create({
      data: { patientMr: patient.mr, title: 'Doc1', fileName: 'f.pdf', filePath: '/f.pdf' },
    });

    const req = new Request(`http://localhost/api/patients/${patient.mr}/documents`, {
      method: 'PATCH',
      body: JSON.stringify({ id: doc.id, title: 'Updated' }),
    });
    const res = await (PATCH as any)(req, { params: { mr: patient.mr } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.document.title).toBe('Updated');
  });

  it('DELETE removes document', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const doc = await prisma.document.create({
      data: { patientMr: patient.mr, title: 'Doc1', fileName: 'f.pdf', filePath: '/f.pdf' },
    });

    const req = new Request(`http://localhost/api/patients/${patient.mr}/documents`, {
      method: 'DELETE',
      body: JSON.stringify({ id: doc.id }),
    });
    const res = await (DELETE as any)(req, { params: { mr: patient.mr } });
    expect(res.status).toBe(200);
  });
});
