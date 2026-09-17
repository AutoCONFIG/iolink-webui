import type { Alarm, AlarmRule, Device, Farm, Pond, Reading, Stats } from '@/types/api'

type Raw = Record<string, unknown>
const pick = (raw: Raw, snake: string, pascal: string) => raw[snake] ?? raw[pascal]
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' ? value : Number(value ?? fallback)
const asString = (value: unknown, fallback = '') => value == null ? fallback : String(value)

export function normalizeReading(input: unknown): Reading | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Raw
  const optional = (key: string, alias?: string) => {
    const value = pick(raw, key, alias ?? key)
    return value == null ? null : asNumber(value)
  }
  return {
    ts: asString(pick(raw, 'ts', 'Timestamp')),
    temperature: optional('temperature', 'Temperature'),
    dissolvedOxygen: optional('dissolved_oxygen', 'DO'),
    ph: optional('ph', 'PH'),
    turbidity: optional('turbidity', 'Turbidity'),
    salinity: optional('salinity', 'Salinity'),
  }
}

export function normalizeFarm(raw: Raw): Farm {
  return {
    id: asNumber(pick(raw, 'id', 'ID')),
    ownerId: asNumber(pick(raw, 'owner_id', 'OwnerID')),
    name: asString(pick(raw, 'name', 'Name')),
    location: asString(pick(raw, 'location', 'Location')),
    createdAt: asString(pick(raw, 'created_at', 'CreatedAt')),
  }
}

export function normalizePond(raw: Raw): Pond {
  const status = asString(raw.status, 'normal') as Pond['status']
  return {
    id: asNumber(pick(raw, 'id', 'ID')),
    farmId: asNumber(pick(raw, 'farm_id', 'FarmID')),
    name: asString(pick(raw, 'name', 'Name')),
    areaMu: asNumber(pick(raw, 'area_mu', 'AreaMu')),
    status,
    latest: normalizeReading(raw.latest),
    createdAt: asString(pick(raw, 'created_at', 'CreatedAt')),
  }
}

export function normalizeDevice(raw: Raw): Device {
  return {
    id: asNumber(pick(raw, 'id', 'ID')),
    pondId: asNumber(pick(raw, 'pond_id', 'PondID')),
    deviceNo: asString(pick(raw, 'device_no', 'DeviceNo')),
    model: asString(pick(raw, 'model', 'Model')),
    status: asString(pick(raw, 'status', 'Status'), 'offline') as Device['status'],
    lastSeenAt: asString(pick(raw, 'last_seen_at', 'LastSeenAt')) || null,
    createdAt: asString(pick(raw, 'created_at', 'CreatedAt')),
  }
}

export function normalizeRule(raw: Raw): AlarmRule {
  const nullable = (snake: string, pascal: string) => {
    const value = pick(raw, snake, pascal)
    return value == null ? null : asNumber(value)
  }
  return {
    id: asNumber(pick(raw, 'id', 'ID')),
    pondId: asNumber(pick(raw, 'pond_id', 'PondID')),
    metric: asString(pick(raw, 'metric', 'Metric')) as AlarmRule['metric'],
    minValue: nullable('min_value', 'Min'),
    maxValue: nullable('max_value', 'Max'),
    level: asString(pick(raw, 'level', 'Level'), 'warning') as AlarmRule['level'],
    enabled: Boolean(pick(raw, 'enabled', 'Enabled') ?? true),
  }
}

export function normalizeAlarm(raw: Raw): Alarm {
  return {
    id: asNumber(pick(raw, 'id', 'ID')),
    deviceNo: asString(pick(raw, 'device_no', 'DeviceNo')),
    pondId: asNumber(pick(raw, 'pond_id', 'PondID')),
    metric: asString(pick(raw, 'metric', 'Metric')) as Alarm['metric'],
    currentValue: asNumber(pick(raw, 'current_value', 'CurrentValue')),
    threshold: asNumber(pick(raw, 'threshold', 'Threshold')),
    level: asString(pick(raw, 'level', 'Level'), 'warning') as Alarm['level'],
    message: asString(pick(raw, 'message', 'Message')),
    confirmedAt: asString(pick(raw, 'confirmed_at', 'ConfirmedAt')) || null,
    createdAt: asString(pick(raw, 'created_at', 'CreatedAt')),
  }
}

export function normalizeStats(raw: Raw): Stats {
  return {
    devicesTotal: asNumber(pick(raw, 'devices_total', 'DevicesTotal')),
    online: asNumber(pick(raw, 'online', 'Online')),
    offline: asNumber(pick(raw, 'offline', 'Offline')),
    openAlarms: asNumber(pick(raw, 'open_alarms', 'OpenAlarms')),
  }
}
