import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PharmacySalesHistoryPage from '@/app/pharmacy-sales-history/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/pharmacy-sales-history',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockSales = [
  {
    saleGroup: 'PSALE-20260830-0001',
    saleNumber: 'PSALE-20260830-0001',
    customerName: 'Test Patient',
    customerPhone: '9845012345',
    patientMr: 'MR000001',
    paymentMethod: 'CASH',
    createdAt: '2026-08-30T10:00:00.000Z',
    itemsCount: 1,
    totalAmount: 50,
    items: [
      {
        id: 'line-1',
        saleNumber: 'PSALE-20260830-0001',
        productName: 'Paracetamol',
        batchNumber: 'BATCH-001',
        quantity: 2,
        unitPrice: 25,
        totalAmount: 50,
      },
    ],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      sales: mockSales,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      totalSaleAmount: 50,
    }),
  } as Response)
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('PharmacySalesHistoryPage', () => {
  it('renders grouped pharmacy sales', async () => {
    render(<PharmacySalesHistoryPage />)

    expect(await screen.findByRole('heading', { name: 'Pharmacy Sales History' })).toBeTruthy()
    expect(await screen.findByText('PSALE-20260830-0001')).toBeTruthy()
    expect(screen.getByText(/MR000001/)).toBeTruthy()
    expect(screen.getByText(/Total sale - Rs\. 50\.00/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reprint/i })).toBeTruthy()
  })

  it('expands sale rows to show receipt line items', async () => {
    render(<PharmacySalesHistoryPage />)

    await screen.findByText('PSALE-20260830-0001')
    act(() => {
      fireEvent.click(screen.getByLabelText('Expand sale'))
    })

    expect(await screen.findByText('Paracetamol')).toBeTruthy()
    expect(screen.getByText('BATCH-001')).toBeTruthy()
  })

  it('sends backend pagination params', async () => {
    render(<PharmacySalesHistoryPage />)

    await screen.findByText('PSALE-20260830-0001')
    const calls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
    expect(calls.some((url: string) => url.includes('/api/pharmacy-sales') && url.includes('page=1') && url.includes('pageSize=20'))).toBe(true)
  })

  it('sends filters to the backend and resets to page 1', async () => {
    render(<PharmacySalesHistoryPage />)

    await screen.findByText('PSALE-20260830-0001')

    act(() => {
      fireEvent.change(screen.getByLabelText('MR Number / Name'), { target: { value: 'Test Patient' } })
      fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-30' } })
    })

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
      const lastCall = calls.filter((url: string) => url.includes('/api/pharmacy-sales')).at(-1)
      expect(lastCall).toContain('search=Test+Patient')
      expect(lastCall).toContain('startDate=2026-08-30')
      expect(lastCall).toContain('page=1')
    })
  })

  it('shows pagination controls and navigates to the next backend page', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const page = url.includes('page=2') ? 2 : 1
      return Promise.resolve({
        ok: true,
        json: async () => ({
          sales: mockSales,
          page,
          pageSize: 20,
          total: 25,
          totalPages: 2,
          totalSaleAmount: 1250,
        }),
      } as Response)
    })

    render(<PharmacySalesHistoryPage />)

    const nextButton = await screen.findByRole('button', { name: /Next/i })
    act(() => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
      expect(calls.some((url: string) => url.includes('/api/pharmacy-sales') && url.includes('page=2'))).toBe(true)
    })
  })

  it('polls the current backend page every 3 seconds', async () => {
    render(<PharmacySalesHistoryPage />)

    await screen.findByText('PSALE-20260830-0001')
    const baselineCalls = (global.fetch as any).mock.calls.length
    expect(baselineCalls).toBeGreaterThan(0)

    await waitFor(() => {
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(baselineCalls)
    }, { timeout: 3500 })

    const calls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
    expect(calls.at(-1)).toContain('/api/pharmacy-sales')
    expect(calls.at(-1)).toContain('page=1')
    expect(calls.at(-1)).toContain('pageSize=20')
  }, 5000)
})
