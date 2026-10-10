import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const userRequests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../src/api/http', () => ({ http: userRequests, userHttp: userRequests }))

describe('product model API adapters', () => {
  beforeEach(() => vi.stubEnv('VITE_DEMO_MODE', 'false'))
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

  it('omits an empty enum and preserves field options when creating a model', async () => {
    userRequests.post.mockResolvedValue({ data: { id: 9, product_id: 4, version: 2, fields: [{ identifier: 'mode', type: 'string', unit: '', readable: true, writable: true, nullable: false }] } })
    const { createProductModel } = await import('../src/api/admin')
    await expect(createProductModel(4, [{ identifier: 'mode', type: 'string', unit: '', enum: [], readable: true, writable: true, nullable: false }])).resolves.toMatchObject({ version: 2, fields: [{ identifier: 'mode', writable: true, nullable: false }] })
    expect(userRequests.post).toHaveBeenCalledWith('/products/4/models', { fields: [{ identifier: 'mode', type: 'string', unit: '', minimum: null, maximum: null, readable: true, writable: true, nullable: false }] })
  })

  it('normalizes snake_case ranges and enum values after publishing', async () => {
    userRequests.post.mockResolvedValue({ data: { id: 9, product_id: 4, version: 2, published_at: '2026-10-10T00:00:00Z', fields: [{ identifier: 'flow', type: 'number', unit: 'L/min', minimum: 0, maximum: 20, enum_values: null, readable: true, writable: false, nullable: true }] } })
    const { publishProductModel } = await import('../src/api/admin')
    await expect(publishProductModel(4, 2)).resolves.toMatchObject({ fields: [{ min: 0, max: 20, enum: undefined, unit: 'L/min' }], publishedAt: '2026-10-10T00:00:00Z' })
  })
})
