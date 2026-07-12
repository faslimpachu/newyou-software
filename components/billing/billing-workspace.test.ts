import { describe, it, expect } from 'vitest'
import { money, invoicePrintHTML } from '@/components/billing/billing-workspace'

describe('billing-workspace', () => {
  it('formats money in Indian format with Rs.', () => {
    expect(money(1800)).toBe('Rs. 1,800.00')
    expect(money(0)).toBe('Rs. 0.00')
    expect(money(1234567.89)).toBe('Rs. 12,34,567.89')
  })

  it('generates A4 invoice HTML with correct clinic header', () => {
    const invoice = {
      id: 'INV-001',
      patient: 'Aarav Sharma',
      mr: 'NU000001',
      center: 'Nutrition Center' as const,
      age: 34,
      dob: '15/06/1992',
      bloodGroup: 'O+',
      address: 'Bengaluru',
      phone: '98450 12345',
      date: '12 Jul 2026',
      consultationType: 'Nutrition Consultation',
      items: [{ id: 1, name: 'Consultation', quantity: 1, rate: 1500, amount: 1500 }],
      discount: 0,
      tax: 0,
      paid: 0,
      total: 1500,
      balance: 1500,
      status: 'Pending' as const,
      paymentMethod: '',
      remarks: '',
    }
    const html = invoicePrintHTML(invoice)
    expect(html).toContain('NEW YOU')
    expect(html).toContain('Lose Weight. Choose Health.')
    expect(html).toContain('INV-001')
    expect(html).toContain('Aarav Sharma')
    expect(html).toContain('NU000001')
    expect(html).toContain('O+')
    expect(html).toContain('98450 12345')
    expect(html).toContain('Rs. 1,500.00')
    expect(html).toContain('@page{size:A4 portrait')
  })

  it('generates Ayurcare header for ayurcare invoices', () => {
    const invoice = {
      id: 'INV-099',
      patient: 'Test Patient',
      mr: 'AY000001',
      center: 'Ayurcare Center' as const,
      age: 40,
      dob: '',
      bloodGroup: 'B+',
      address: 'Pune',
      phone: '90080 33221',
      date: '12 Jul 2026',
      consultationType: 'Panchakarma',
      items: [{ id: 1, name: 'Session', quantity: 1, rate: 5000, amount: 5000 }],
      discount: 0,
      tax: 0,
      paid: 0,
      total: 5000,
      balance: 5000,
      status: 'Pending' as const,
      paymentMethod: '',
      remarks: '',
    }
    const html = invoicePrintHTML(invoice)
    expect(html).toContain('Ayurcare Center')
    expect(html).toContain('Jubilee Bazar')
    expect(html).toContain('AY000001')
  })
})
