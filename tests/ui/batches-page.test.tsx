import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import BatchesPage from '@/app/batches/page'

const mockBatches = [
  {
    id: 'batch-1',
    productId: 'prod-1',
    product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001', unit: 'strip' },
    batchNumber: 'BATCH-001',
    expiryDate: '2027-12-31',
    quantity: 100,
    avgCost: 10,
    status: 'OK',
    receipts: [
      {
        id: 'receipt-1',
        supplierName: 'ABC Pharma',
        purchaseInvoiceId: 'pinv-1',
        remainingQuantity: 100,
        purchaseRate: 10,
        createdAt: '2026-08-18T00:00:00.000Z',
      },
    ],
  },
]

const defaultFetch = async (url: string) => {
  if (url.includes('/api/batches')) {
    return {
      ok: true,
      json: async () => ({
        batches: mockBatches,
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      }),
    } as Response
  }
  return {
    ok: true,
    json: async () => ({}),
  } as Response
}

beforeEach(() => {
  global.fetch = defaultFetch
})

afterEach(() => {
  cleanup()
})

describe('Batches Page UI', () => {
  describe('rendering', () => {
    it('renders page heading', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Batches' })).toBeDefined()
      })
    })

    it('displays existing batches', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeDefined()
      })
    })

    it('shows batch number', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByText('BATCH-001')).toBeDefined()
      })
    })

    it('shows batch quantity', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByText('100')).toBeDefined()
      })
    })

    it('shows status badge', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByText('OK')).toBeDefined()
      })
    })

    it('shows supplier name', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByText('ABC Pharma')).toBeDefined()
      })
    })
  })

  describe('pagination controls', () => {
    it('hides pagination buttons when totalPages is 1', async () => {
      render(<BatchesPage />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Batches' })).toBeDefined()
      })
      expect(screen.queryByRole('button', { name: /Previous/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /Next/i })).toBeNull()
    })

    it('shows pagination buttons when totalPages > 1', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 1,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return originalFetch(url)
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()

      global.fetch = originalFetch
    })

    it('disables Previous button on page 1', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 1,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return originalFetch(url)
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Previous/i })).toHaveProperty('disabled', true)

      global.fetch = originalFetch
    })

    it('disables Next button on last page', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 2,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return originalFetch(url)
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Next/i })).toHaveProperty('disabled', true)

      global.fetch = originalFetch
    })

    it('navigates to next page when Next is clicked', async () => {
      const originalFetch = global.fetch
      const fetchCalls: string[] = []
      global.fetch = async (url: string) => {
        fetchCalls.push(url)
        if (url.includes('/api/batches')) {
          const pageNum = url.includes('page=2') ? 2 : 1
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: pageNum,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()
      })

      const nextButton = screen.getByRole('button', { name: /Next/i })
      act(() => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        expect(fetchCalls.some((url) => url.includes('/api/batches') && url.includes('page=2'))).toBe(true)
      })

      global.fetch = originalFetch
    })

    it('navigates to previous page when Previous is clicked', async () => {
      const originalFetch = global.fetch
      const fetchCalls: string[] = []
      let firstCall = true
      global.fetch = async (url: string) => {
        fetchCalls.push(url)
        if (url.includes('/api/batches')) {
          const pageNum = firstCall ? 2 : 1
          firstCall = false
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: pageNum,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getAllByText(/Page 2 of 2/).length).toBeGreaterThan(0)
      })

      const prevButton = screen.getByRole('button', { name: /Previous/i })
      act(() => {
        fireEvent.click(prevButton)
      })

      await waitFor(() => {
        expect(fetchCalls.some((url) => url.includes('/api/batches') && url.includes('page=1'))).toBe(true)
      })

      global.fetch = originalFetch
    })

    it('sends pagination params in API requests', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Batches' })).toBeDefined()
      })

      expect(capturedUrl).toContain('page=1')
      expect(capturedUrl).toContain('pageSize=20')
    })
  })

  describe('backend-controlled filters', () => {
    it('sends expiryStatus filter when status tab is selected', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Batches' })).toBeDefined()
      })

      const expiredTab = screen.getByRole('button', { name: /Expired/i })
      act(() => {
        fireEvent.click(expiredTab)
      })

      await waitFor(() => {
        expect(capturedUrl).toContain('expiryStatus=expired')
      })
    })

    it('sends search filter when search input changes', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        if (url.includes('/api/batches')) {
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Batches' })).toBeDefined()
      })

      const searchInput = screen.getByLabelText('Search')
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'BATCH-001' } })
      })

      await waitFor(() => {
        expect(capturedUrl).toContain('search=BATCH-001')
      })
    })

    it('resets to page 1 when filter changes from another page', async () => {
      const originalFetch = global.fetch
      const fetchCalls: string[] = []
      global.fetch = async (url: string) => {
        fetchCalls.push(url)
        if (url.includes('/api/batches')) {
          const hasStatusFilter = url.includes('expiryStatus=')
          const pageNum = hasStatusFilter ? 1 : (url.includes('page=2') ? 2 : 1)
          return {
            ok: true,
            json: async () => ({
              batches: mockBatches,
              page: pageNum,
              pageSize: 20,
              total: hasStatusFilter ? 1 : 2,
              totalPages: hasStatusFilter ? 1 : 2,
            }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<BatchesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()
      })

      const nextButton = screen.getByRole('button', { name: /Next/i })
      act(() => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        expect(fetchCalls.some((url) => url.includes('/api/batches') && url.includes('page=2'))).toBe(true)
      })

      const expiredTab = screen.getByRole('button', { name: /Expired/i })
      act(() => {
        fireEvent.click(expiredTab)
      })

      await waitFor(() => {
        const txCalls = fetchCalls.filter((url) => url.includes('/api/batches'))
        const lastCall = txCalls[txCalls.length - 1]
        expect(lastCall).toContain('expiryStatus=expired')
        expect(lastCall).toContain('page=1')
      })

      global.fetch = originalFetch
    })
  })
})
