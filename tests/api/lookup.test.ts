import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET } from '@/app/api/lookup/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.staff.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

describe('Lookup API', () => {
  it('GET returns staff, centers, and statuses', async () => {
    await prisma.staff.createMany({
      data: [
        { name: 'Dr. Smith', role: 'doctor', email: `smith-${makeId()}@test.com`, centerType: 'both', active: true },
        { name: 'Dietitian Doe', role: 'dietitian', email: `diet-${makeId()}@test.com`, centerType: 'nutrition', active: true },
        { name: 'Inactive Staff', role: 'doctor', email: `inactive-${makeId()}@test.com`, centerType: 'ayurcare', active: false },
      ],
    });

    const req = new Request('http://localhost/api/lookup');
    const res = await (GET as any)(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.staff).toHaveLength(2);
    expect(data.centers).toEqual(['NUTRITION', 'AYURCARE']);
    expect(data.statuses).toEqual(['Active', 'Inactive', 'Waiting', 'Consulting', 'Completed', 'Cancelled', 'Follow-up']);
    expect(data.visitStatuses).toEqual(['Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show', 'Follow-up']);
  });

  it('GET returns empty staff array when no active staff', async () => {
    await prisma.staff.createMany({
      data: [
        { name: 'Inactive 1', role: 'doctor', email: `ia1-${makeId()}@test.com`, centerType: 'both', active: false },
        { name: 'Inactive 2', role: 'dietitian', email: `ia2-${makeId()}@test.com`, centerType: 'nutrition', active: false },
      ],
    });

    const req = new Request('http://localhost/api/lookup');
    const res = await (GET as any)(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.staff).toHaveLength(0);
    expect(data.centers).toEqual(['NUTRITION', 'AYURCARE']);
    expect(data.statuses).toEqual(['Active', 'Inactive', 'Waiting', 'Consulting', 'Completed', 'Cancelled', 'Follow-up']);
  });

  it('GET returns staff ordered by name', async () => {
    await prisma.staff.createMany({
      data: [
        { name: 'Zoe', role: 'doctor', email: `z-${makeId()}@test.com`, centerType: 'both', active: true },
        { name: 'Alice', role: 'dietitian', email: `a-${makeId()}@test.com`, centerType: 'nutrition', active: true },
        { name: 'Bob', role: 'doctor', email: `b-${makeId()}@test.com`, centerType: 'ayurcare', active: true },
      ],
    });

    const req = new Request('http://localhost/api/lookup');
    const res = await (GET as any)(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.staff[0].name).toBe('Alice');
    expect(data.staff[1].name).toBe('Bob');
    expect(data.staff[2].name).toBe('Zoe');
  });
});
