import { http, userHttp } from './http'
import { parseLicenseStatus } from './license'
import { normalizeAlarm, normalizeDevice, normalizeFarm, normalizePond, normalizeRule, normalizeStats } from './adapters'
import { parseAPIKey, parseAPIKeys, parseAPIKeyAuditEvents, parseAPIKeySecret, parseStoredAPIKeys } from '@/domain/api-key'
import * as demo from './demo'
import type { APIKey, APIKeyAuditEvent, AlarmRule, Device, Farm, LicenseStatus, LoginResponse, Pond, Product, ProductModel, ModelField, Tenant, TenantMember } from '@/types/api'

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export async function login(username: string, password: string): Promise<LoginResponse> {
  if (demoMode) return { ...await demo.demoLogin(username, password), platformAdmin: false }
  const { data } = await http.post('/login', { username, password })
  return { token: data.token, expiresIn: data.expires_in, platformAdmin: data.platform_admin === true }
}

export async function getStats() {
  if (demoMode) return demo.demoStats()
  const { data } = await userHttp.get('/stats')
  return normalizeStats(data)
}

export async function getFarms() {
  if (demoMode) return demo.demoFarms()
  const { data } = await userHttp.get('/farms')
  return data.map(normalizeFarm)
}

export async function createFarm(payload: Pick<Farm, 'name' | 'location'>) {
  if (demoMode) return demo.demoCreateFarm(payload)
  const { data } = await userHttp.post('/farms', payload)
  return normalizeFarm(data)
}

export async function getPonds() {
  if (demoMode) return demo.demoPonds()
  const { data } = await userHttp.get('/ponds')
  return data.map(normalizePond)
}

export async function createPond(payload: Pick<Pond, 'farmId' | 'name' | 'areaMu'>) {
  if (demoMode) return demo.demoCreatePond(payload)
  const { data } = await userHttp.post('/ponds', { farm_id: payload.farmId, name: payload.name, area_mu: payload.areaMu })
  return normalizePond(data)
}

export async function getDevicePage(params: { page?: number; pageSize?: number; search?: string; pondId?: number; status?: string }) {
  if (demoMode) {
    const ponds = await demo.demoPonds()
    const rows = (await demo.demoDevices()).filter((item) => {
      const text = (params.search ?? '').trim().toLowerCase()
      const statusMatch = !params.status || params.status === 'active' ? !item.disabledAt : params.status === 'all' || (params.status === 'disabled' ? Boolean(item.disabledAt) : item.status === params.status && !item.disabledAt)
      const pondMatch = params.pondId === undefined || item.pondId === params.pondId
      const pondName = ponds.find((pond) => pond.id === item.pondId)?.name ?? ''
      const textMatch = !text || `${item.deviceNo} ${item.name ?? ''} ${item.model} ${pondName}`.toLowerCase().includes(text)
      return statusMatch && pondMatch && textMatch
    })
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize }
  }
  const { data } = await userHttp.get('/devices', { params: { page: params.page ?? 1, page_size: params.pageSize ?? 20, name: params.search || undefined, pond_id: params.pondId || undefined, status: params.status || 'active' } })
  return { items: data.list.map(normalizeDevice), total: Number(data.total), page: Number(data.page), pageSize: Number(data.page_size) }
}

export async function getDevice(deviceNo: string): Promise<Device> {
  if (demoMode) return normalizeDevice(await demo.demoDevice(deviceNo))
  const { data } = await userHttp.get(`/devices/${encodeURIComponent(deviceNo)}`)
  return normalizeDevice(data)
}

export async function moveDevice(deviceNo: string, pondId: number) {
  if (demoMode) return demo.demoMoveDevice(deviceNo, pondId)
  await userHttp.put(`/devices/${encodeURIComponent(deviceNo)}/pond`, { pond_id: pondId })
}

export async function restoreDevice(deviceNo: string) {
  if (demoMode) return
  await userHttp.post(`/devices/${encodeURIComponent(deviceNo)}/restore`)
}

export async function deleteDevice(deviceNo: string) {
  if (demoMode) return
  await userHttp.delete(`/devices/${encodeURIComponent(deviceNo)}`)
}

export async function getLicense(): Promise<LicenseStatus> {
  if (demoMode) return { state: 'missing', deploymentId: 'demo', licenseId: null, keyId: null, issuedAt: null, notBefore: null, expiresAt: null, maxDevices: 0, usedDevices: 0, overage: 0, features: [], payloadSha256: null }
  const { data } = await http.get<unknown>('/license')
  return parseLicenseStatus(data)
}

export async function importLicense(file: File) {
  if (demoMode) return
  await http.post('/license', file, { headers: { 'Content-Type': 'application/json' } })
}

export async function getAPIKeys(): Promise<APIKey[]> {
  if (demoMode) return parseStoredAPIKeys(JSON.parse(localStorage.getItem('iolink.demo.api-keys') ?? '[]'))
  const { data } = await userHttp.get<unknown>('/api-keys')
  return parseAPIKeys(data)
}

export async function getAPIKeyAudit(): Promise<APIKeyAuditEvent[]> {
	if (demoMode) return []
	const { data } = await userHttp.get<unknown>('/api-keys/audit')
	return parseAPIKeyAuditEvents(data)
}

export async function createAPIKey(payload: { name: string; scopes: string[]; resources?: APIKey['resources'] }): Promise<{ key: APIKey; secret: string }> {
	if (demoMode) { const key = { keyId: `ik_demo_${Date.now()}`, tenantId: 1, name: payload.name, scopes: payload.scopes, resources: payload.resources ?? {}, createdAt: new Date().toISOString(), revokedAt: null }; const keys = await getAPIKeys(); localStorage.setItem('iolink.demo.api-keys', JSON.stringify([...keys, key])); return { key, secret: 'demo-secret-shown-once' } }
	const resources = payload.resources ? { farm_ids: payload.resources.farmIds ?? [], pond_ids: payload.resources.pondIds ?? [], device_nos: payload.resources.deviceNos ?? [] } : undefined
	const { data } = await userHttp.post('/api-keys', { name: payload.name, scopes: payload.scopes, resources })
  return { key: parseAPIKey(data.key), secret: parseAPIKeySecret(data.secret) }
}

export async function rotateAPIKey(keyId: string): Promise<{ key: APIKey; secret: string }> {
  if (demoMode) return { key: { keyId: `ik_demo_${Date.now()}`, tenantId: 1, name: 'demo rotation', scopes: ['ponds:read'], resources: {}, createdAt: new Date().toISOString(), revokedAt: null }, secret: 'demo-secret-shown-once' }
  const { data } = await userHttp.post(`/api-keys/${encodeURIComponent(keyId)}/rotate`)
  return { key: parseAPIKey(data.key), secret: parseAPIKeySecret(data.secret) }
}

export async function revokeAPIKey(keyId: string) {
  if (demoMode) { const keys = await getAPIKeys(); localStorage.setItem('iolink.demo.api-keys', JSON.stringify(keys.map((key) => key.keyId === keyId ? { ...key, revokedAt: new Date().toISOString() } : key))); return }
  await userHttp.post(`/api-keys/${encodeURIComponent(keyId)}/revoke`)
}

export async function registerDevice(payload: Pick<Device, 'pondId' | 'model' | 'name' | 'reportInterval'>) {
  if (demoMode) return demo.demoRegisterDevice(payload)
  const { data } = await userHttp.post('/devices', { pond_id: payload.pondId, name: payload.name || '', model: payload.model, report_interval: payload.reportInterval || 60 })
  return { ...normalizeDevice(data), secret: data.secret }
}

export async function getRules() {
  if (demoMode) return demo.demoRules()
  const { data } = await userHttp.get('/alarm-rules')
  return data.map(normalizeRule)
}

export async function createRule(payload: Omit<AlarmRule, 'id' | 'enabled'>) {
  if (demoMode) return demo.demoCreateRule(payload)
  const { data } = await userHttp.post('/alarm-rules', { pond_id: payload.pondId, metric: payload.metric, min_value: payload.minValue, max_value: payload.maxValue, level: payload.level })
  return normalizeRule(data)
}

export async function getAlarms() {
  if (demoMode) return demo.demoAlarms()
  const { data } = await userHttp.get('/alarms', { params: { limit: 200 } })
  return data.map(normalizeAlarm)
}

export async function confirmAlarms(ids: number[]) {
  if (demoMode) return demo.demoConfirmAlarms(ids)
  if (ids.length === 1) { await userHttp.post(`/alarms/${ids[0]}/confirm`); return 1 }
  const { data } = await userHttp.post('/alarms/batch-confirm', { ids })
  return data.confirmed
}

export async function changePassword(oldPassword: string, newPassword: string) {
  if (demoMode) return
  await userHttp.post('/password', { old_password: oldPassword, new_password: newPassword })
}

export async function getTenants(): Promise<Tenant[]> {
  if (demoMode) return [{ id: 1, name: '演示组织', active: true, permissionVersion: 0 }]
  const { data } = await http.get('/tenants')
  return parseTenants(data)
}

export async function getUserTenants(): Promise<Tenant[]> {
  if (demoMode) return [{ id: 1, name: '演示组织', active: true, permissionVersion: 0 }]
  const { data } = await userHttp.get('/tenants')
  return parseTenants(data)
}

function parseTenants(data: unknown): Tenant[] {
  if (!Array.isArray(data)) throw new Error('组织响应格式错误')
  return data.map((item: Record<string, unknown>) => ({ id: Number(item.id), name: String(item.name), active: item.active !== false, permissionVersion: Number(item.permission_version ?? 0) }))
}

let demoTenantMembers: TenantMember[] = [
  { tenantId: 1, userId: 1, name: '演示管理员', role: 'owner', active: true },
  { tenantId: 1, userId: 2, name: '演示成员', role: 'member', active: true },
]

function readDemoTenantMembers(): TenantMember[] {
  const saved = localStorage.getItem('iolink.demo.tenant-members')
  if (!saved) return demoTenantMembers
  try {
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed as TenantMember[] : demoTenantMembers
  } catch {
    return demoTenantMembers
  }
}

export async function getTenantMembers(tenantId: number): Promise<TenantMember[]> {
  if (demoMode) return readDemoTenantMembers().filter((item) => item.tenantId === tenantId).map((item) => ({ ...item }))
  const client = localStorage.getItem('iolink.admin.platform') === 'true' ? http : userHttp
  const { data } = await client.get(`/tenants/${tenantId}/members`)
  return data.map((item: Record<string, unknown>) => ({ tenantId: Number(item.tenant_id ?? tenantId), userId: Number(item.user_id), name: String(item.name), role: String(item.role), active: item.active !== false, expiresAt: typeof item.expires_at === 'string' ? item.expires_at : null }))
}

export async function updateTenantMember(tenantId: number, userId: number, role: string, active: boolean, expiresAt?: string) {
  if (demoMode) {
    if (role === 'support' && (!expiresAt || Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) throw new Error('支持角色需要未来的到期时间')
    demoTenantMembers = readDemoTenantMembers().map((item) => item.tenantId === tenantId && item.userId === userId ? { ...item, role, active, expiresAt: role === 'support' ? expiresAt : null } : item)
    localStorage.setItem('iolink.demo.tenant-members', JSON.stringify(demoTenantMembers))
    return
  }
  const client = localStorage.getItem('iolink.admin.platform') === 'true' ? http : userHttp
  await client.put(`/tenants/${tenantId}/members/${userId}`, { role, active, expires_at: expiresAt || null })
}

export async function getProducts(): Promise<Product[]> {
  if (demoMode) return demo.demoProducts()
  const { data } = await userHttp.get('/products')
  return data.map((item: unknown) => {
    const value = asRecord(item)
    return { id: Number(value.id), tenantId: Number(value.tenant_id ?? value.tenantId), name: String(value.name), builtin: value.builtin === true, currentVersion: typeof value.current_version === 'number' ? value.current_version : null, createdAt: typeof value.created_at === 'string' ? value.created_at : undefined }
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('响应格式错误')
  return value as Record<string, unknown>
}

function normalizeField(value: unknown): ModelField {
  const field = asRecord(value)
  const type = field.type
  if (type !== 'number' && type !== 'integer' && type !== 'boolean' && type !== 'string') throw new Error('模型字段类型无效')
  const values = field.enum_values ?? field.enum
  return { identifier: String(field.identifier), type, unit: String(field.unit ?? ''), min: typeof (field.minimum ?? field.min) === 'number' ? Number(field.minimum ?? field.min) : null, max: typeof (field.maximum ?? field.max) === 'number' ? Number(field.maximum ?? field.max) : null, enum: Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : undefined, readable: field.readable === true, writable: field.writable === true, nullable: field.nullable === true }
}

export async function getProductModels(productId: number): Promise<ProductModel[]> {
  if (demoMode) return demo.demoProductModels(productId)
  const { data } = await userHttp.get(`/products/${productId}/models`)
  return data.map((raw: unknown) => { const item = asRecord(raw); const fields = Array.isArray(item.fields) ? item.fields.map(normalizeField) : []; return { id: Number(item.id), productId: Number(item.product_id ?? item.productId), version: Number(item.version), fields, publishedAt: typeof item.published_at === 'string' ? item.published_at : null, createdAt: typeof item.created_at === 'string' ? item.created_at : undefined } })
}

export async function createProduct(name: string): Promise<Product> {
  if (demoMode) return demo.demoCreateProduct(name)
  const { data } = await userHttp.post('/products', { name })
  return { id: Number(data.id), tenantId: Number(data.tenant_id), name: String(data.name), createdAt: data.created_at }
}

export async function createProductModel(productId: number, fields: ModelField[]): Promise<ProductModel> {
  if (demoMode) return demo.demoCreateProductModel(productId, fields)
  const { data } = await userHttp.post(`/products/${productId}/models`, { fields: fields.map((field) => ({ identifier: field.identifier, type: field.type, unit: field.unit, minimum: field.min ?? null, maximum: field.max ?? null, enum_values: field.enum?.length ? field.enum : null, readable: field.readable, writable: field.writable, nullable: field.nullable })) })
  return { id: Number(data.id), productId: Number(data.product_id), version: Number(data.version), fields: data.fields ?? fields, publishedAt: data.published_at ?? null, createdAt: data.created_at }
}

export async function publishProductModel(productId: number, version: number): Promise<ProductModel> {
  if (demoMode) return demo.demoPublishProductModel(productId, version)
  const { data } = await userHttp.post(`/products/${productId}/models/${version}/publish`)
  return { id: Number(data.id), productId: Number(data.product_id), version: Number(data.version), fields: data.fields ?? [], publishedAt: data.published_at ?? null, createdAt: data.created_at }
}

export async function assignDeviceProduct(deviceNo: string, productId: number, modelVersion: number): Promise<void> {
  if (demoMode) return demo.demoAssignDeviceProduct()
  await userHttp.put(`/devices/${encodeURIComponent(deviceNo)}/product`, { product_id: productId, model_version: modelVersion })
}
