import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET } from '@/app/api/reports/route';
import { GET as ExportGET } from '@/app/api/reports/export/route';
import { GET as LookupGET } from '@/app/api/lookup/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.oPSheet.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.nutritionAssessment.deleteMany();
  await prisma.ayurcareTreatment.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.document.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Reports API', () => {
  it('GET /api/reports returns counts', async () => {
    const req = new Request('http://localhost/api/reports', { method: 'GET' });
    const res = await (GET as any)(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.patients).toBe(0);
  });

  it('GET /api/reports/export returns CSV', async () => {
    const req = new Request('http://localhost/api/reports/export', { method: 'GET' });
    const res = await (ExportGET as any)(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
  });
});
