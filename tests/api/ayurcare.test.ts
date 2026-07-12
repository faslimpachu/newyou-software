import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/ayurcare/treatments/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.ayurcareTreatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Ayurcare API', () => {
  it('POST creates an ayurcare treatment', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'AY000001', consultationType: 'AYURCARE', patientName: 'Test', parentName: 'P',
        gender: 'Female', mobileNumber: '8888888888', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const req = new Request('http://localhost/api/ayurcare/treatments', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, diagnosis: 'Arthritis', treatmentPlan: 'Oil massage', medicines: 'Herbal' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.treatment.diagnosis).toBe('Arthritis');
  });

  it('GET returns empty list when no treatments', async () => {
    const req = new Request('http://localhost/api/ayurcare/treatments', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.treatments).toEqual([]);
  });
});
