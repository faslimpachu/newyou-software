import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/app/api/billing/route';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.mRSequence.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Billing API', () => {
  it('POST creates an invoice', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    const req = new Request('http://localhost/api/billing', {
      method: 'POST',
      body: JSON.stringify({
        center: 'NUTRITION',
        billType: 'Consultation',
        patient: { name: 'Test', mrNumber: patient.mr, age: '', gender: 'Male', contact: '9999999999', address: 'Addr' },
        items: [{ name: 'Consultation', quantity: 1, rate: 100 }],
        discount: 0,
        tax: 10,
        paid: 110,
        paymentMethod: 'Cash',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.invoice.grandTotal).toBe(110);
  });

  it('GET returns invoices for patient', async () => {
    const patient = await prisma.patient.create({
      data: {
        mr: 'MR000001', consultationType: 'NUTRITION', patientName: 'Test', parentName: 'P',
        gender: 'Male', mobileNumber: '9999999999', address: 'Addr', district: 'D', state: 'S', pinCode: '123456',
      },
    });

    await prisma.invoice.create({
      data: { patientMrNumber: patient.mr, invoiceNumber: 'INV-001', center: 'NUTRITION', billType: 'Consultation', patientName: 'Test', invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), subtotal: 100, tax: 10, grandTotal: 110, paid: 110, balance: 0 },
    });

    const req = new Request('http://localhost/api/billing?patientMr=' + patient.mr, { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoices.length).toBe(1);
  });
});
