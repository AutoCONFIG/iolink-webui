import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

const mocks = vi.hoisted(() => ({ session: vi.fn(), login: vi.fn() }))
vi.mock('../src/api/platform', () => ({ getSession: mocks.session, getPlatformStats: vi.fn().mockResolvedValue({ tenants: 0, users: 0, activeUsers: 0, devices: 0, onlineDevices: 0 }) }))
vi.mock('../src/api/admin', () => ({ login: mocks.login, demoMode: false, getAlarms: vi.fn(), getFarms: vi.fn(), getPonds: vi.fn(), getStats: vi.fn() }))

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
  setActivePinia(createPinia())
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('console identity and dashboard separation', () => {
  it('hydrates an existing token from the server and clears all roles on logout', async () => {
    localStorage.setItem('iolink.admin.token', 'existing-token')
    localStorage.setItem('iolink.admin.expires_at', String(Date.now() + 3600000))
    mocks.session.mockResolvedValue({ platform_admin: true, tenant_id: 0, tenant_role: '' })
    const { useAuthStore } = await import('../src/stores/auth')
    const auth = useAuthStore()
    expect(auth.platformAdmin).toBe(false)
    await auth.resolveSession()
    expect(auth.platformAdmin).toBe(true)
    expect(auth.tenantId).toBe(0)
    auth.logout()
    expect(auth.platformAdmin).toBe(false)
    expect(auth.token).toBe('')
    expect(localStorage.getItem('iolink.admin.platform')).toBeNull()
  })

  it('uses the tenant returned by the server for a business user', async () => {
    mocks.session.mockResolvedValue({ platform_admin: false, tenant_id: 42, tenant_role: 'owner' })
    const { useAuthStore } = await import('../src/stores/auth')
    const auth = useAuthStore()
    await auth.resolveSession()
    expect(auth.tenantId).toBe(42)
    expect(auth.tenantRole).toBe('owner')
    expect(auth.platformAdmin).toBe(false)
  })

  it.each([true, false])('renders only the corresponding dashboard for platform=%s', async platform => {
    const { useAuthStore } = await import('../src/stores/auth')
    const auth = useAuthStore()
    auth.platformAdmin = platform
    const Dashboard = (await import('../src/views/DashboardView.vue')).default
    const app = createSSRApp(Dashboard)
    app.directive('loading', { getSSRProps: () => ({}) })
    const html = await renderToString(app)
    expect(html.includes('平台运行态势')).toBe(platform)
    expect(html.includes('池塘状态墙')).toBe(!platform)
    expect(html.includes('最新报警')).toBe(!platform)
    expect(html.includes('注册用户')).toBe(platform)
  })
})
