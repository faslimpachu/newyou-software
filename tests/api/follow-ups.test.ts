import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, PATCH, POST } from '@/app/api/follow-ups/route';
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
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
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

  it('GET filters follow-ups by patientMr', async () => {
    const first = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'First', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999991', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    const second = await prisma.patient.create({
      data: {
        mr: 'MR000002', consultationType: 'NUTRITION', patientName: 'Second', parentName: 'P',
        gender: 'Female', mobileNumber: '9999999992', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    await prisma.followUp.create({ data: { patientMr: first.mr, program: 'Weight Loss' } });
    await prisma.followUp.create({ data: { patientMr: second.mr, program: 'Therapy review' } });

    const req = new Request('http://localhost/api/follow-ups?patientMr=' + first.mr, { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toHaveLength(1);
    expect(data.followUps[0].patientMr).toBe(first.mr);
    expect(data.followUps[0].program).toBe('Weight Loss');
  });

  it('GET paginates follow-ups when page and limit are provided', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Paged Patient', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999991', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'First follow-up' } });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Second follow-up' } });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Third follow-up' } });

    const req = new Request('http://localhost/api/follow-ups?page=2&limit=2', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toHaveLength(1);
    expect(data.total).toBe(3);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(2);
    expect(data.totalPages).toBe(2);
  });

  it('GET searches follow-ups by patient and follow-up fields before pagination', async () => {
    const first = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Anu Nair', parentName: 'P',
        gender: 'Female', mobileNumber: '9999999991', address: 'Addr', district: 'Kannur', state: 'S', pinCode: '123456',
      },
    });
    const second = await prisma.patient.create({
      data: {
        mr: 'MR000002', consultationType: 'NUTRITION', patientName: 'Ravi Menon', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999992', address: 'Addr', district: 'Kochi', state: 'S', pinCode: '123456',
      },
    });
    await prisma.followUp.create({ data: { patientMr: first.mr, program: 'Diet review', assignedTo: 'Front desk' } });
    await prisma.followUp.create({ data: { patientMr: second.mr, program: 'Therapy review', assignedTo: 'Care team' } });

    const req = new Request('http://localhost/api/follow-ups?page=1&limit=20&search=Anu', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toHaveLength(1);
    expect(data.followUps[0].patientMr).toBe(first.mr);
    expect(data.followUps[0].patient.patientName).toBe('Anu Nair');
    expect(data.total).toBe(1);
  });

  it('PATCH updates a follow-up without requiring a visit', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    const followUp = await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Diet review', status: 'Pending' } });

    const req = new Request('http://localhost/api/follow-ups', {
      method: 'PATCH',
      body: JSON.stringify({ id: followUp.id, status: 'Completed', remarks: 'Called patient' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUp.status).toBe('Completed');
    expect(data.followUp.remarks).toBe('Called patient');
    expect(data.followUp.patientMr).toBe(patient.mr);
  });

  it('GET filters follow-ups by status', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Filter Patient', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999991', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Diet review', status: 'Pending' } });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Therapy review', status: 'Completed' } });

    const req = new Request('http://localhost/api/follow-ups?status=Pending', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toHaveLength(1);
    expect(data.followUps[0].status).toBe('Pending');
  });

  it('GET filters follow-ups by reviewDate range', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Date Patient', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999991', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Diet review', reviewDate: new Date('2026-08-01') } });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Therapy review', reviewDate: new Date('2026-08-05') } });
    await prisma.followUp.create({ data: { patientMr: patient.mr, program: 'Follow-up', reviewDate: new Date('2026-08-10') } });

    const req = new Request('http://localhost/api/follow-ups?reviewDateFrom=2026-08-01&reviewDateTo=2026-08-05', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.followUps).toHaveLength(2);
  })
});
