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
  disabledAt?: string | null
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
export type LicenseState = 'missing' | 'valid' | 'permanent' | 'not_before' | 'expired' | 'invalid' | 'instance_mismatch' | 'clock_error' | 'overage'
export interface LicenseStatus { state: LicenseState; deploymentId: string; licenseId: string | null; keyId: string | null; issuedAt: string | null; notBefore: string | null; expiresAt: string | null; maxDevices: number; usedDevices: number; overage: number; features: string[]; payloadSha256: string | null }
export interface APIKey { keyId: string; tenantId: number; name: string; scopes: string[]; resources: { farmIds?: number[]; pondIds?: number[]; deviceNos?: string[] }; createdAt: string; revokedAt?: string | null }
export interface Tenant { id: number; name: string; active: boolean; permissionVersion?: number }
export interface TenantMember { tenantId: number; userId?: number; name: string; role: string; active?: boolean; expiresAt?: string | null }
export interface DeviceRegistration extends Device { secret: string }
export interface Product { id: number; tenantId: number; name: string; builtin?: boolean; currentVersion?: number | null; createdAt?: string }
export interface ModelField { identifier: string; type: 'number' | 'integer' | 'boolean' | 'string'; unit: string; min?: number | null; max?: number | null; enum?: string[]; readable: boolean; writable: boolean; nullable: boolean }
export interface ProductModel { id: number; productId: number; version: number; fields: ModelField[]; publishedAt?: string | null; createdAt?: string }
