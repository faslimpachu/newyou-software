import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PharmacySalesHistoryPage from '@/app/pharmacy-sales-history/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pharmacy-sales-history',
}))

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
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/pharmacy-sales')) {
      return Promise.resolve({ ok: true, json: async () => salesResponse })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  })
})

describe('PharmacySalesHistoryPage', () => {
  it('renders the sales history table with grouped sales', async () => {
    render(<PharmacySalesHistoryPage />)
    expect(screen.getByRole('heading', { name: 'Pharmacy Sales History' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy())
    expect(screen.getByText(/Alice \(MR000111\)/)).toBeTruthy()
    expect(screen.getByText('CASH')).toBeTruthy()
    expect(screen.getByText('Rs. 50.00')).toBeTruthy()
  })

  it('expands a sale to show line items', async () => {
    render(<PharmacySalesHistoryPage />)
    await waitFor(() => expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Expand sale/i }))
    expect(await screen.findByText('Paracetamol')).toBeTruthy()
    expect(screen.getByText('B1')).toBeTruthy()
  })

  it('reprints an A5 receipt using the existing print helper', async () => {
    const writeSpy = vi.fn()
    const printSpy = vi.fn()
    const fakeFrame: any = {
      style: {},
      contentDocument: { open: vi.fn(), write: writeSpy, close: vi.fn() },
      contentWindow: { focus: vi.fn(), print: printSpy },
      parentNode: null,
      set onload(fn: any) {
        if (fn) fn()
      },
    }
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(fakeFrame as any)
    const appendSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => fakeFrame as any)

    render(<PharmacySalesHistoryPage />)
    await waitFor(() => expect(screen.getByText('PSALE-20260101-0001')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Reprint/i }))

    await waitFor(() => expect(writeSpy).toHaveBeenCalled())
    expect(writeSpy.mock.calls[0][0]).toContain('@page { size: A5 portrait; margin: 10mm; }')
    expect(printSpy).toHaveBeenCalled()

    createSpy.mockRestore()
    appendSpy.mockRestore()
  })
})
