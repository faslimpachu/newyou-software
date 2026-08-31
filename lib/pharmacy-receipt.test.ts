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
    expect(html).not.toContain(
      'This is a computer-generated pharmacy sale receipt.',
    )
  })
})
