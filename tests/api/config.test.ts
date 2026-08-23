import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GET } from '@/app/api/config/route'

describe('Config API', () => {
  it('GET /api/config returns allowManualSale flag', async () => {
    const req = new Request('http://localhost/api/config', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('allowManualSale')
    expect(typeof data.allowManualSale).toBe('boolean')
  })
})
