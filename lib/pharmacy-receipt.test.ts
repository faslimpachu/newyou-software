import { describe, expect, it } from 'vitest'
import { buildReceiptHtml, type SaleReceipt } from '@/lib/pharmacy-receipt'

describe('pharmacy receipt print template', () => {
  it('prints as A5 without the computer-generated footer', () => {
    const sale: SaleReceipt = {
      saleGroup: 'PSALE-20260831-0001',
      customerName: 'Test Patient',
      customerPhone: '9845012345',
      paymentMethod: 'CASH',
      createdAt: '2026-08-31T10:00:00.000Z',
      lines: [
        {
          id: 'line-1',
          saleNumber: 'PSALE-20260831-0001',
          productName: 'Paracetamol',
          batchNumber: 'B1',
          quantity: 2,
          unitPrice: 10,
          totalAmount: 20,
        },
      ],
      totalAmount: 20,
    }

    const html = buildReceiptHtml(sale)

    expect(html).toContain('@page { size: A5 portrait; margin: 10mm; }')
    expect(html).toContain('New You')
    expect(html).toContain('Lose Weight. Choose Health.')
    expect(html).toContain('Center for Professional Weight Management')
    expect(html).toContain('Jubilee Bazar, Onden Road, Kannur - 670001, Kerala, India')
    expect(html).toContain('Ph: 8111999581, 8111999582')
    expect(html).toContain('"Times New Roman", Times, Georgia, serif')
    expect(html).not.toContain(
      'This is a computer-generated pharmacy sale receipt.',
    )
  })
})
