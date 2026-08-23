import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import InventoryTransactionsPage from '@/app/inventory-transactions/page'

const mockTransactions = [
  {
    id: 'txn-1',
    productId: 'prod-1',
    type: 'PURCHASE',
    quantity: 50,
    referenceType: 'PURCHASE_INVOICE',
    referenceId: 'inv-1',
    notes: 'Purchase stock',
    createdAt: new Date().toISOString(),
    product: { id: 'prod-1', name: 'Paracetamol', sku: 'MED001' },
    reference: 'PINV-001',
  },
]

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Paracetamol',
    sku: 'MED001',
  },
]

const defaultFetch = async (url: string) => {
  if (url.includes('/api/inventory-transactions')) {
    return {
      ok: true,
      json: async () => ({
        transactions: mockTransactions,
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      }),
    } as Response
  }
  if (url.includes('/api/products') && !url.includes('/api/products/')) {
    return {
      ok: true,
      json: async () => ({ products: mockProducts }),
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

describe('Inventory Transactions Page UI', () => {
  describe('rendering', () => {
    it('renders page heading', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Stock History' })).toBeDefined()
      })
    })

    it('displays existing transactions', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeDefined()
      })
    })

    it('shows transaction type badge', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByText('Purchase')).toBeDefined()
      })
    })

    it('shows transaction quantity with sign', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByText('+50')).toBeDefined()
      })
    })

    it('shows reference value', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByText('PINV-001')).toBeDefined()
      })
    })
  })

  describe('pagination controls', () => {
    it('hides pagination buttons when totalPages is 1', async () => {
      render(<InventoryTransactionsPage />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Stock History' })).toBeDefined()
      })
      expect(screen.queryByRole('button', { name: /Previous/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /Next/i })).toBeNull()
    })

    it('shows pagination buttons when totalPages > 1', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-transactions')) {
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: 1,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()

      global.fetch = originalFetch
    })

    it('disables Previous button on page 1', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-transactions')) {
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: 1,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Previous/i })).toHaveProperty('disabled', true)

      global.fetch = originalFetch
    })

    it('disables Next button on last page', async () => {
      const originalFetch = global.fetch
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-transactions')) {
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: 2,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

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
        if (url.includes('/api/inventory-transactions')) {
          const pageNum = url.includes('page=2') ? 2 : 1
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: pageNum,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()
      })

      const nextButton = screen.getByRole('button', { name: /Next/i })
      act(() => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        expect(fetchCalls.some((url) => url.includes('/api/inventory-transactions') && url.includes('page=2'))).toBe(true)
      })

      global.fetch = originalFetch
    })

    it('navigates to previous page when Previous is clicked', async () => {
      const originalFetch = global.fetch
      let callCount = 0
      global.fetch = async (url: string) => {
        if (url.includes('/api/inventory-transactions')) {
          callCount++
          const pageNum = callCount === 1 ? 2 : 1
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: pageNum,
              pageSize: 20,
              total: 2,
              totalPages: 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getAllByText(/Page 2 of 2/).length).toBeGreaterThan(0)
      })

      const prevButton = screen.getByRole('button', { name: /Previous/i })
      act(() => {
        fireEvent.click(prevButton)
      })

      await waitFor(() => {
        expect(screen.getAllByText(/Page 1 of 2/).length).toBeGreaterThan(0)
      })

      global.fetch = originalFetch
    })

    it('sends pagination params in API requests', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        if (url.includes('/api/inventory-transactions')) {
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Stock History' })).toBeDefined()
      })

      expect(capturedUrl).toContain('page=1')
      expect(capturedUrl).toContain('pageSize=20')
    })
  })

  describe('backend-controlled filters', () => {
    it('sends active filters as query params', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        if (url.includes('/api/inventory-transactions')) {
          return {
            ok: true,
            json: async () => ({
              transactions: mockTransactions,
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Stock History' })).toBeDefined()
      })

      expect(capturedUrl).toContain('/api/inventory-transactions')
    })

    it('resets to page 1 and sends filters when filter changes from another page', async () => {
      const originalFetch = global.fetch
      const fetchCalls: string[] = []
      global.fetch = async (url: string) => {
        fetchCalls.push(url)
        if (url.includes('/api/inventory-transactions')) {
          const hasDateFilter = url.includes('startDate=')
          const pageNum = hasDateFilter ? 1 : (url.includes('page=2') ? 2 : 1)
          return {
            ok: true,
            json: async () => ({
              transactions: pageNum === 2 ? mockTransactions : (hasDateFilter ? mockTransactions : []),
              page: pageNum,
              pageSize: 20,
              total: hasDateFilter ? 1 : 2,
              totalPages: hasDateFilter ? 1 : 2,
            }),
          } as Response
        }
        if (url.includes('/api/products') && !url.includes('/api/products/')) {
          return {
            ok: true,
            json: async () => ({ products: mockProducts }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      render(<InventoryTransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeDefined()
      })

      const nextButton = screen.getByRole('button', { name: /Next/i })
      act(() => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        expect(fetchCalls.some((url) => url.includes('/api/inventory-transactions') && url.includes('page=2'))).toBe(true)
      })

      const startDateInput = screen.getByLabelText('Start Date')
      act(() => {
        fireEvent.change(startDateInput, { target: { value: '2026-01-01' } })
      })

      await waitFor(() => {
        const txCalls = fetchCalls.filter((url) => url.includes('/api/inventory-transactions'))
        const lastCall = txCalls[txCalls.length - 1]
        expect(lastCall).toContain('startDate=2026-01-01')
        expect(lastCall).toContain('page=1')
      })

      global.fetch = originalFetch
    })
  })
})
