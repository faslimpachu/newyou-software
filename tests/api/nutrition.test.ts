import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/nutrition/assessments/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.nutritionAssessment.deleteMany();
  await prisma.ayurcareTreatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Nutrition API', () => {
  it('POST creates a nutrition assessment', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const req = new Request('http://localhost/api/nutrition/assessments', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, assessmentDate: '2026-07-12', program: 'Weight Loss', weight: 70, bmi: 25 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.assessment.program).toBe('Weight Loss');
  });

  it('POST returns 404 for missing patient', async () => {
    const req = new Request('http://localhost/api/nutrition/assessments', {
      method: 'POST',
      body: JSON.stringify({ patientMr: 'MR999999', assessmentDate: '2026-07-12' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('GET returns empty list when no assessments', async () => {
    const req = new Request('http://localhost/api/nutrition/assessments', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assessments).toEqual([]);
  });
});
