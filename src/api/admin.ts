import { http } from './http'
import { normalizeAlarm, normalizeDevice, normalizeFarm, normalizePond, normalizeRule, normalizeStats } from './adapters'
import * as demo from './demo'
import type { AlarmRule, Device, Farm, LoginResponse, Pond } from '@/types/api'

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export async function login(username: string, password: string): Promise<LoginResponse> {
  if (demoMode) return demo.demoLogin(username, password)
  const { data } = await http.post('/login', { username, password })
  return { token: data.token, expiresIn: data.expires_in }
}

export async function getStats() {
  if (demoMode) return demo.demoStats()
  const { data } = await http.get('/stats')
  return normalizeStats(data)
}

export async function getFarms() {
  if (demoMode) return demo.demoFarms()
  const { data } = await http.get('/farms')
  return data.map(normalizeFarm)
}

export async function createFarm(payload: Pick<Farm, 'name' | 'location'>) {
  if (demoMode) return demo.demoCreateFarm(payload)
  const { data } = await http.post('/farms', payload)
  return normalizeFarm(data)
}

export async function getPonds() {
  if (demoMode) return demo.demoPonds()
  const { data } = await http.get('/ponds')
  return data.map(normalizePond)
}

export async function createPond(payload: Pick<Pond, 'farmId' | 'name' | 'areaMu'>) {
  if (demoMode) return demo.demoCreatePond(payload)
  const { data } = await http.post('/ponds', { farm_id: payload.farmId, name: payload.name, area_mu: payload.areaMu })
  return normalizePond(data)
}

export async function getDevices() {
  if (demoMode) return demo.demoDevices()
  const { data } = await http.get('/devices')
  return data.map(normalizeDevice)
}

export async function registerDevice(payload: Pick<Device, 'pondId' | 'model'>) {
  if (demoMode) return demo.demoRegisterDevice(payload)
  const { data } = await http.post('/devices', { pond_id: payload.pondId, model: payload.model })
  return { ...normalizeDevice(data), secret: data.secret }
}

export async function getRules() {
  if (demoMode) return demo.demoRules()
  const { data } = await http.get('/alarm-rules')
  return data.map(normalizeRule)
}

export async function createRule(payload: Omit<AlarmRule, 'id' | 'enabled'>) {
  if (demoMode) return demo.demoCreateRule(payload)
  const { data } = await http.post('/alarm-rules', { pond_id: payload.pondId, metric: payload.metric, min_value: payload.minValue, max_value: payload.maxValue, level: payload.level })
  return normalizeRule(data)
}

export async function getAlarms() {
  if (demoMode) return demo.demoAlarms()
  const { data } = await http.get('/alarms', { params: { limit: 200 } })
  return data.map(normalizeAlarm)
}

export async function confirmAlarms(ids: number[]) {
  if (demoMode) return demo.demoConfirmAlarms(ids)
  if (ids.length === 1) { await http.post(`/alarms/${ids[0]}/confirm`); return 1 }
  const { data } = await http.post('/alarms/batch-confirm', { ids })
  return data.confirmed
}

export async function changePassword(oldPassword: string, newPassword: string) {
  if (demoMode) return
  await http.post('/password', { old_password: oldPassword, new_password: newPassword })
}
