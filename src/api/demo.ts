import type { Alarm, AlarmRule, Device, DeviceRegistration, Farm, Pond, Stats } from '@/types/api'

let farms: Farm[] = [
  { id: 1, ownerId: 1, name: '东港示范养殖场', location: '广东 · 湛江' },
  { id: 2, ownerId: 1, name: '南湾生态基地', location: '海南 · 文昌' },
]

let ponds: Pond[] = [
  { id: 1, farmId: 1, name: 'A-01 虾塘', areaMu: 12.5, status: 'normal', latest: { ts: new Date().toISOString(), temperature: 27.4, dissolvedOxygen: 6.8, ph: 7.82, turbidity: 12.6, salinity: 28.1 } },
  { id: 2, farmId: 1, name: 'A-02 虾塘', areaMu: 10.8, status: 'warning', latest: { ts: new Date().toISOString(), temperature: 28.1, dissolvedOxygen: 4.2, ph: 8.16, turbidity: 18.9, salinity: 27.8 } },
  { id: 3, farmId: 2, name: 'B-01 鱼塘', areaMu: 18, status: 'critical', latest: { ts: new Date().toISOString(), temperature: 29.2, dissolvedOxygen: 2.9, ph: 8.43, turbidity: 24.3, salinity: 18.4 } },
  { id: 4, farmId: 2, name: 'B-02 育苗池', areaMu: 6.2, status: 'normal', latest: { ts: new Date().toISOString(), temperature: 26.8, dissolvedOxygen: 7.1, ph: 7.68, turbidity: 9.4, salinity: 20.2 } },
]

let devices: Device[] = [
  { id: 1, pondId: 1, deviceNo: 'dev-a01c9f3e', model: 'AquaSense S5', status: 'online', lastSeenAt: new Date(Date.now() - 45_000).toISOString() },
  { id: 2, pondId: 2, deviceNo: 'dev-b14d2a90', model: 'AquaSense S5', status: 'online', lastSeenAt: new Date(Date.now() - 72_000).toISOString() },
  { id: 3, pondId: 3, deviceNo: 'dev-c87e4b12', model: 'WaterNode Pro', status: 'online', lastSeenAt: new Date(Date.now() - 31_000).toISOString() },
  { id: 4, pondId: 4, deviceNo: 'dev-d48f0e25', model: 'WaterNode Mini', status: 'offline', lastSeenAt: new Date(Date.now() - 3_840_000).toISOString() },
]

let rules: AlarmRule[] = [
  { id: 1, pondId: 1, metric: 'dissolved_oxygen', minValue: 4.5, maxValue: null, level: 'critical', enabled: true },
  { id: 2, pondId: 2, metric: 'ph', minValue: 6.5, maxValue: 8.5, level: 'warning', enabled: true },
  { id: 3, pondId: 3, metric: 'temperature', minValue: 18, maxValue: 30, level: 'warning', enabled: true },
]

let alarms: Alarm[] = [
  { id: 11, deviceNo: 'dev-c87e4b12', pondId: 3, metric: 'dissolved_oxygen', currentValue: 2.9, threshold: 4, level: 'critical', message: '溶解氧低于安全阈值', confirmedAt: null, createdAt: new Date(Date.now() - 8 * 60_000).toISOString() },
  { id: 10, deviceNo: 'dev-b14d2a90', pondId: 2, metric: 'ph', currentValue: 8.62, threshold: 8.5, level: 'warning', message: 'pH 高于阈值', confirmedAt: null, createdAt: new Date(Date.now() - 34 * 60_000).toISOString() },
  { id: 9, deviceNo: 'dev-a01c9f3e', pondId: 1, metric: 'temperature', currentValue: 31.2, threshold: 30, level: 'warning', message: '水温高于阈值', confirmedAt: new Date(Date.now() - 86 * 60_000).toISOString(), createdAt: new Date(Date.now() - 92 * 60_000).toISOString() },
]

const clone = <T>(value: T): T => structuredClone(value)
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 160))

export async function demoLogin(username: string, password: string) {
  await pause()
  if (username !== 'admin' || password !== 'admin123') throw new Error('用户名或密码错误')
  return { token: 'demo-token', expiresIn: 43_200 }
}

export async function demoStats(): Promise<Stats> {
  await pause()
  return { devicesTotal: devices.length, online: devices.filter((d) => d.status === 'online').length, offline: devices.filter((d) => d.status === 'offline').length, openAlarms: alarms.filter((a) => !a.confirmedAt).length }
}

export async function demoFarms() { await pause(); return clone(farms) }
export async function demoPonds() { await pause(); return clone(ponds) }
export async function demoDevices() { await pause(); return clone(devices) }
export async function demoRules() { await pause(); return clone(rules) }
export async function demoAlarms() { await pause(); return clone(alarms) }

export async function demoCreateFarm(payload: Pick<Farm, 'name' | 'location'>): Promise<Farm> {
  await pause()
  const farm = { id: Math.max(0, ...farms.map((item) => item.id)) + 1, ownerId: 1, ...payload }
  farms = [...farms, farm]
  return clone(farm)
}

export async function demoCreatePond(payload: Pick<Pond, 'farmId' | 'name' | 'areaMu'>): Promise<Pond> {
  await pause()
  const pond: Pond = { id: Math.max(0, ...ponds.map((item) => item.id)) + 1, status: 'normal', latest: null, ...payload }
  ponds = [...ponds, pond]
  return clone(pond)
}

export async function demoRegisterDevice(payload: Pick<Device, 'pondId' | 'model'>): Promise<DeviceRegistration> {
  await pause()
  const suffix = Math.random().toString(16).slice(2, 10)
  const device: Device = { id: Math.max(0, ...devices.map((item) => item.id ?? 0)) + 1, deviceNo: `dev-${suffix}`, status: 'offline', lastSeenAt: null, ...payload }
  devices = [...devices, device]
  return { ...clone(device), secret: crypto.randomUUID().replace(/-/g, '') }
}

export async function demoCreateRule(payload: Omit<AlarmRule, 'id' | 'enabled'>): Promise<AlarmRule> {
  await pause()
  const rule: AlarmRule = { id: Math.max(0, ...rules.map((item) => item.id)) + 1, enabled: true, ...payload }
  rules = [...rules, rule]
  return clone(rule)
}

export async function demoConfirmAlarms(ids: number[]) {
  await pause()
  const confirmedAt = new Date().toISOString()
  alarms = alarms.map((alarm) => ids.includes(alarm.id) && !alarm.confirmedAt ? { ...alarm, confirmedAt } : alarm)
  return ids.length
}
