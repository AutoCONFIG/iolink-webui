export type PondStatus = 'normal' | 'warning' | 'critical'
export type DeviceStatus = 'online' | 'offline'
export type AlarmLevel = 'warning' | 'critical'
export type MetricKey = 'temperature' | 'dissolved_oxygen' | 'ph' | 'turbidity' | 'salinity'

export interface Reading {
  ts?: string
  temperature?: number | null
  dissolvedOxygen?: number | null
  ph?: number | null
  turbidity?: number | null
  salinity?: number | null
}

export interface Farm {
  id: number
  ownerId: number
  name: string
  location: string
  createdAt?: string
}

export interface Pond {
  id: number
  farmId: number
  name: string
  areaMu: number
  status: PondStatus
  latest?: Reading | null
  createdAt?: string
}

export interface Device {
  id?: number
  pondId: number
  deviceNo: string
  model: string
  status: DeviceStatus
  lastSeenAt?: string | null
  createdAt?: string
}

export interface AlarmRule {
  id: number
  pondId: number
  metric: MetricKey
  minValue?: number | null
  maxValue?: number | null
  level: AlarmLevel
  enabled: boolean
}

export interface Alarm {
  id: number
  deviceNo: string
  pondId: number
  metric: MetricKey
  currentValue: number
  threshold: number
  level: AlarmLevel
  message: string
  confirmedAt?: string | null
  createdAt: string
}

export interface Stats {
  devicesTotal: number
  online: number
  offline: number
  openAlarms: number
}

export interface LoginResponse { token: string; expiresIn: number }
export interface DeviceRegistration extends Device { secret: string }
