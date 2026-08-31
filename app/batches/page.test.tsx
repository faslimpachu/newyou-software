import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import BatchesPage from '@/app/batches/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/batches',
}))

const batch = {
  id: 'b1',
  productId: 'p1',
  product: { id: 'p1', name: 'Test Med', sku: null, unit: 'pcs' },
  batchNumber: 'B1',
  expiryDate: null,
  quantity: 10,
  sellingPrice: 0,
  totalRemaining: 10,
  avgCost: 10,
  status: 'OK',
  receipts: [],
}

const batchesResponse = { batches: [batch], page: 1, pageSize: 20, total: 1, totalPages: 1 }

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/batches/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ batch: { id: 'b1', sellingPrice: 50 } }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: async () => batchesResponse,
    })
  })
})

function getRow(): HTMLElement {
  const cell = screen.getByText('Test Med').closest('tr') as HTMLElement
  return cell
}

describe('BatchesPage selling price', () => {
  it('does not save and reverts when the confirmation modal is cancelled', async () => {
    render(<BatchesPage />)

    const tr = await screen.findByText('Test Med')
    const row = tr.closest('tr') as HTMLElement

    fireEvent.click(within(row).getByRole('button'))
    const input = within(row).getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '75' } })
    fireEvent.blur(input)

    // confirmation modal appears (not a browser alert)
    expect(await screen.findByText('Confirm selling price')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/batches/b1'),
      expect.anything()
    )
    // editing closed, no modal, original value remains
    expect(screen.queryByText('Confirm selling price')).toBeNull()
    expect(within(row).getByRole('button')).toBeTruthy()
  })

  it('saves the new selling price only after the modal is confirmed', async () => {
    render(<BatchesPage />)

    const tr = await screen.findByText('Test Med')
    const row = tr.closest('tr') as HTMLElement

    fireEvent.click(within(row).getByRole('button'))
    const input = within(row).getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.blur(input)

    expect(await screen.findByText('Confirm selling price')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/batches/b1'),
        expect.objectContaining({ method: 'PATCH' })
      )
    )

    await waitFor(() => expect(screen.getByText(/₹50\.00/)).toBeTruthy())
    expect(screen.queryByText('Confirm selling price')).toBeNull()
  })

  it('does not prompt or save when the value is unchanged', async () => {
    render(<BatchesPage />)
    const tr = await screen.findByText('Test Med')
    const row = tr.closest('tr') as HTMLElement

    fireEvent.click(within(row).getByRole('button'))
    const input = within(row).getByRole('spinbutton')
    fireEvent.blur(input)

    expect(screen.queryByText('Confirm selling price')).toBeNull()
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/batches/b1'),
      expect.anything()
    )
  })
})
