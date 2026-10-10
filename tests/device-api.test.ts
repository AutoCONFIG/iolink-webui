import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const userRequests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('../src/api/http', () => ({ http: userRequests, userHttp: userRequests }))

describe('device resource API', () => {
  beforeEach(() => vi.stubEnv('VITE_DEMO_MODE', 'false'))
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

  it('sends ThingsPanel-style list filters and parses the page envelope', async () => {
    userRequests.get.mockResolvedValue({ data: { list: [{ device_no: 'dev-1', pond_id: 2, name: '探头', model: 'S5', status: 'online', disabled_at: null }], total: 9, page: 2, page_size: 20 } })
    const { getDevicePage } = await import('../src/api/admin')
    await expect(getDevicePage({ page: 2, pageSize: 20, search: '探头', pondId: 2, status: 'online' })).resolves.toMatchObject({ total: 9, page: 2, pageSize: 20, items: [{ deviceNo: 'dev-1' }] })
    expect(userRequests.get).toHaveBeenCalledWith('/devices', { params: { page: 2, page_size: 20, name: '探头', pond_id: 2, status: 'online' } })
  })

  it('uses active as the default status so disabled resources stay hidden', async () => {
    userRequests.get.mockResolvedValue({ data: { list: [], total: 0, page: 1, page_size: 20 } })
    const { getDevicePage } = await import('../src/api/admin')
    await getDevicePage({})
    expect(userRequests.get).toHaveBeenCalledWith('/devices', { params: { page: 1, page_size: 20, name: undefined, pond_id: undefined, status: 'active' } })
  })

  it('keeps detail, move and registration as separate resource actions', async () => {
    userRequests.get.mockResolvedValue({ data: { device_no: 'dev-1', pond_id: 2, status: 'offline', latest: { ts: '2026-10-10T00:00:00Z', timestamps: { temperature: '2026-10-09T23:00:00Z' }, temperature: 24 } } })
    userRequests.post.mockResolvedValue({ data: { device_no: 'dev-2', pond_id: 2, name: '新探头', model: 'S5', status: 'offline', report_interval: 300, secret: 'secret' } })
    const { getDevice, moveDevice, registerDevice } = await import('../src/api/admin')
    await getDevice('dev-1')
    await moveDevice('dev-1', 3)
    await registerDevice({ pondId: 2, name: '新探头', model: 'S5', reportInterval: 300 })
    expect(userRequests.get).toHaveBeenCalledWith('/devices/dev-1')
    expect(userRequests.put).toHaveBeenCalledWith('/devices/dev-1/pond', { pond_id: 3 })
    expect(userRequests.post).toHaveBeenCalledWith('/devices', { pond_id: 2, name: '新探头', model: 'S5', report_interval: 300 })
  })
})
