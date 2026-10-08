import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../src/api/http', () => ({ http: requests }))
beforeEach(() => vi.stubEnv('VITE_DEMO_MODE', 'false'))
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

it('rejects malformed server roles and counters instead of inventing values', async () => {
  const { getSession, getPlatformStats } = await import('../src/api/platform')
  requests.get.mockResolvedValue({ data: { platform_admin: 'true', tenant_id: 0, tenant_role: '' } })
  await expect(getSession()).rejects.toThrow()
  requests.get.mockResolvedValue({ data: { tenants: -1, users: 1, active_users: 1, devices: 0, online_devices: 0 } })
  await expect(getPlatformStats()).rejects.toThrow()
})

it('parses real platform counters and submits registration without authority or organization grants', async () => {
  const { getPlatformStats, registerUser, createTenant } = await import('../src/api/platform')
  requests.get.mockResolvedValue({ data: { tenants: 2, users: 4, active_users: 3, devices: 6, online_devices: 5 } })
  expect(await getPlatformStats()).toEqual({ tenants: 2, users: 4, activeUsers: 3, devices: 6, onlineDevices: 5 })
  await registerUser('customer', 'Customer-pass-1234')
  expect(requests.post).toHaveBeenCalledWith('/register', { username: 'customer', password: 'Customer-pass-1234' })
  requests.post.mockResolvedValue({ data: { id: 7, name: 'org', active: true, permission_version: 0 } })
  expect(await createTenant('org')).toEqual({ id: 7, name: 'org', active: true, permissionVersion: 0 })
})
