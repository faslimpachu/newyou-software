import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET } from '@/app/api/lookup/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.user.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.mRSequence.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect();
});

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

describe('Lookup API', () => {
  it('GET returns staff, centers, and statuses', async () => {
    await prisma.user.createMany({
      data: [
        { name: 'Dr. Smith', role: 'doctor', username: `smith-${makeId()}`, centerType: 'both', active: true, passwordHash: 'hash' },
        { name: 'Dietitian Doe', role: 'dietitian', username: `diet-${makeId()}`, centerType: 'nutrition', active: true, passwordHash: 'hash' },
        { name: 'Inactive Staff', role: 'doctor', username: `inactive-${makeId()}`, centerType: 'ayurcare', active: false, passwordHash: 'hash' },
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
    await prisma.user.createMany({
      data: [
        { name: 'Inactive 1', role: 'doctor', username: `ia1-${makeId()}`, centerType: 'both', active: false, passwordHash: 'hash' },
        { name: 'Inactive 2', role: 'dietitian', username: `ia2-${makeId()}`, centerType: 'nutrition', active: false, passwordHash: 'hash' },
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
    await prisma.user.createMany({
      data: [
        { name: 'Zoe', role: 'doctor', username: `z-${makeId()}`, centerType: 'both', active: true, passwordHash: 'hash' },
        { name: 'Alice', role: 'dietitian', username: `a-${makeId()}`, centerType: 'nutrition', active: true, passwordHash: 'hash' },
        { name: 'Bob', role: 'doctor', username: `b-${makeId()}`, centerType: 'ayurcare', active: true, passwordHash: 'hash' },
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
