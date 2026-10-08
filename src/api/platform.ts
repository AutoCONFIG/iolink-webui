import { z } from 'zod'
import { http, userHttp } from './http'
import type { PlatformStats, Tenant } from '@/types/api'

const sessionSchema = z.object({ platform_admin: z.boolean(), tenant_id: z.number().int().nonnegative(), tenant_role: z.string() })
export async function getSession() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return { platform_admin: false, tenant_id: 1, tenant_role: 'owner' }
  const client = localStorage.getItem('iolink.admin.platform') === 'true' ? http : userHttp
  const response = await client.get<unknown>('/session')
  return sessionSchema.parse(response.data)
}

export async function registerUser(username: string, password: string): Promise<void> {
  await userHttp.post('/register', { username, password })
}

const userSchema = z.object({ id: z.number().int().positive(), username: z.string(), name: z.string() })
export async function getPlatformUsers(query = '') {
  const response = await http.get<unknown>('/platform/users', { params: { query } })
  return z.array(userSchema).parse(response.data)
}

export async function setTenantActive(id: number, active: boolean) {
  await http.put(`/tenants/${id}/status`, { active })
}

const statsSchema = z.object({ tenants: z.number().int().nonnegative(), users: z.number().int().nonnegative(), active_users: z.number().int().nonnegative(), devices: z.number().int().nonnegative(), online_devices: z.number().int().nonnegative() })
export async function getPlatformStats(): Promise<PlatformStats> {
  const response = await http.get<unknown>('/platform/stats')
  const value = statsSchema.parse(response.data)
  return { tenants: value.tenants, users: value.users, activeUsers: value.active_users, devices: value.devices, onlineDevices: value.online_devices }
}

const tenantSchema = z.object({ id: z.number().int().positive(), name: z.string(), active: z.boolean(), permission_version: z.number().int().nonnegative() })
export async function createTenant(name: string): Promise<Tenant> {
  const response = await http.post<unknown>('/tenants', { name })
  const value = tenantSchema.parse(response.data)
  return { id: value.id, name: value.name, active: value.active, permissionVersion: value.permission_version }
}
