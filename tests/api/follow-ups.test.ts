import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/follow-ups/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.followUp.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Follow-ups API', () => {
  it('POST creates a follow-up', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'NU000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const req = new Request('http://localhost/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify({ patientMr: patient.mr, program: 'Weight Loss', reviewDate: '2026-07-19', priority: 'High', status: 'Pending' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.followUp.program).toBe('Weight Loss');
  });

  it('GET returns empty list when no follow-ups', async () => {
    const req = new Request('http://localhost/api/follow-ups', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toEqual([]);
  });
});
