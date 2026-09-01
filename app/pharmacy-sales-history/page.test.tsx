import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PharmacySalesHistoryPage from '@/app/pharmacy-sales-history/page'
import { printReceipt } from '@/lib/pharmacy-receipt'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pharmacy-sales-history',
}))

vi.mock('@/lib/pharmacy-receipt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pharmacy-receipt')>()
  return {
    ...actual,
    printReceipt: vi.fn(),
  }
})

const salesResponse = {
  sales: [
    {
      saleGroup: 'PSALE-20260101-0001',
      saleNumber: 'PSALE-20260101-0001',
      customerName: 'Alice',
      customerPhone: '919845012345',
      patientMr: 'MR000111',
      paymentMethod: 'CASH',
      createdAt: '2026-01-01T10:00:00.000Z',
      itemsCount: 2,
      totalAmount: 50,
      items: [
        {
          id: 'i1',
          saleNumber: 'PSALE-20260101-0001-1',
          productId: 'p1',
          productName: 'Paracetamol',
          batchId: 'b1',
          batchNumber: 'B1',
          quantity: 2,
          unitPrice: 10,
          totalAmount: 20,
        },
        {
          id: 'i2',
          saleNumber: 'PSALE-20260101-0001-2',
          productId: 'p1',
          productName: 'Paracetamol',
          batchId: 'b1',
          batchNumber: 'B1',
          quantity: 1,
          unitPrice: 30,
          totalAmount: 30,
        },
      ],
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  totalSaleAmount: 50,
}

const summaryResponse = {
  totalSaleAmount: 500,
  todaySaleAmount: 75,
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/pharmacy-sales?summary=true')) {
      return Promise.resolve({ ok: true, json: async () => summaryResponse })
    }
    if (url.includes('/api/pharmacy-sales')) {
      return Promise.resolve({ ok: true, json: async () => salesResponse })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  })
})

describe('PharmacySalesHistoryPage', () => {
  it('renders the sales history table with grouped sales', async () => {
    render(<PharmacySalesHistoryPage />)
    expect(
      screen.getByRole('heading', { name: 'Pharmacy Sales History' }),
    ).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy(),
    )
    expect(screen.getByText(/Alice \(MR000111\)/)).toBeTruthy()
    expect(screen.getByText('CASH')).toBeTruthy()
    expect(screen.getByText('Rs. 50.00')).toBeTruthy()
  })

  it('renders unfiltered total and today sale cards above filters', async () => {
    render(<PharmacySalesHistoryPage />)

    expect(await screen.findByText('Total Sale')).toBeTruthy()
    expect(screen.getByText('Today Sale')).toBeTruthy()
    expect(screen.getByText('Rs. 500.00')).toBeTruthy()
    expect(screen.getByText('Rs. 75.00')).toBeTruthy()

    const calls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
    expect(calls).toContain('/api/pharmacy-sales?summary=true')
  })

  it('expands a sale to show line items', async () => {
    render(<PharmacySalesHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: /Expand sale/i }))
    expect(await screen.findAllByText('Paracetamol')).toHaveLength(2)
    expect(screen.getAllByText('B1')).toHaveLength(2)
  })

  it('reprints an A5 receipt using the existing print helper', async () => {
    render(<PharmacySalesHistoryPage />)
    await waitFor(() =>
      expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: /Reprint/i }))

    expect(printReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        saleGroup: 'PSALE-20260101-0001',
        totalAmount: 50,
      }),
    )
  })
})
