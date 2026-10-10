import { describe, expect, it } from 'vitest'
import { formatMetric, METRICS } from '@/domain/metrics'
import { pondStatusMeta } from '@/domain/status'
import { filterProducts, latestPublishedModel, modelState } from '@/domain/products'
import { canConfirmTenantAlarms, canManageTenantResources } from '@/domain/tenantPermissions'
import type { ProductModel } from '@/types/api'
import {
  normalizeAlarm,
  normalizeDevice,
  normalizeFarm,
  normalizePond,
  normalizeReading,
  normalizeRule,
  normalizeStats,
} from '@/api/adapters'

describe('metric presentation', () => {
  it('keeps all five server-supported water metrics in one catalog', () => {
    expect(Object.keys(METRICS)).toEqual([
      'temperature',
      'dissolved_oxygen',
      'ph',
      'turbidity',
      'salinity',
    ])
  })

  it('formats null and measured values consistently', () => {
    expect(formatMetric('dissolved_oxygen', 6.82)).toBe('6.8 mg/L')
    expect(formatMetric('ph', null)).toBe('--')
  })
})

describe('status presentation', () => {
  it('maps alarm severity to stable UI language', () => {
    expect(pondStatusMeta('critical')).toEqual({ label: '严重', tone: 'danger' })
    expect(pondStatusMeta('warning')).toEqual({ label: '预警', tone: 'warning' })
    expect(pondStatusMeta('normal')).toEqual({ label: '正常', tone: 'success' })
  })
})

describe('tenant permissions', () => {
  it('allows only owner and admin to manage tenant resources', () => {
    expect(canManageTenantResources('owner')).toBe(true)
    expect(canManageTenantResources('admin')).toBe(true)
    for (const role of ['member', 'viewer', 'support', '', undefined, null]) {
      expect(canManageTenantResources(role)).toBe(false)
    }
  })

  it('preserves member and support alarm confirmation while denying viewers', () => {
    for (const role of ['owner', 'admin', 'member', 'support']) {
      expect(canConfirmTenantAlarms(role)).toBe(true)
    }
    for (const role of ['viewer', 'unknown', '', undefined, null]) {
      expect(canConfirmTenantAlarms(role)).toBe(false)
    }
  })
})

describe('product resource presentation', () => {
  const models: ProductModel[] = [
    { id: 1, productId: 4, version: 1, fields: [], publishedAt: '2026-10-01T00:00:00Z' },
    { id: 2, productId: 4, version: 2, fields: [], publishedAt: null },
    { id: 3, productId: 4, version: 3, fields: [], publishedAt: '2026-10-02T00:00:00Z' },
  ]

  it('filters the resource catalog by product name or id', () => {
    const products = [{ id: 4, tenantId: 1, name: 'water-quality' }, { id: 8, tenantId: 1, name: 'pump' }]
    expect(filterProducts(products, 'pump')).toHaveLength(1)
    expect(filterProducts(products, '4')[0]?.name).toBe('water-quality')
  })

  it('selects the newest published model and keeps drafts distinct', () => {
    expect(latestPublishedModel(models)?.version).toBe(3)
    expect(modelState(models[1]!)).toBe('draft')
    expect(modelState(models[2]!)).toBe('published')
  })
})

describe('backend adapters', () => {
  it('accepts the documented snake_case response', () => {
    expect(normalizeDevice({ device_no: 'dev-1', pond_id: 3, model: 'AQ-1', status: 'online' })).toMatchObject({
      deviceNo: 'dev-1', pondId: 3, status: 'online',
    })
  })

  it('also tolerates the current Go PascalCase response during migration', () => {
    expect(normalizePond({ ID: 7, FarmID: 2, Name: '东池', AreaMu: 8.5, status: 'warning' })).toMatchObject({
      id: 7, farmId: 2, name: '东池', areaMu: 8.5, status: 'warning',
    })
  })

  it('normalizes readings and empty latest values', () => {
    expect(normalizeReading(null)).toBeNull()
    expect(normalizeReading({ Timestamp: '2026-09-16T00:00:00Z', Temperature: 27.2, DO: 6.3, PH: 7.8, timestamps: { temperature: '2026-09-16T00:00:00Z' } })).toEqual({
      ts: '2026-09-16T00:00:00Z', timestamps: { temperature: '2026-09-16T00:00:00Z' }, temperature: 27.2, dissolvedOxygen: 6.3, ph: 7.8, turbidity: null, salinity: null,
    })
  })

  it('normalizes farms and summary counters', () => {
    expect(normalizeFarm({ ID: '2', OwnerID: 1, Name: '示范场', Location: null })).toMatchObject({ id: 2, ownerId: 1, name: '示范场', location: '' })
    expect(normalizeStats({ DevicesTotal: 4, Online: 3, Offline: 1, OpenAlarms: 2 })).toEqual({ devicesTotal: 4, online: 3, offline: 1, openAlarms: 2 })
  })

  it('normalizes rules and preserves zero thresholds', () => {
    expect(normalizeRule({ ID: 3, PondID: 9, Metric: 'temperature', Min: 0, Max: 30, Level: 'warning', Enabled: false })).toEqual({
      id: 3, pondId: 9, metric: 'temperature', minValue: 0, maxValue: 30, level: 'warning', enabled: false,
    })
  })

  it('normalizes alarm records from current Go structs', () => {
    expect(normalizeAlarm({ ID: 5, DeviceNo: 'dev-5', PondID: 2, Metric: 'ph', CurrentValue: 9, Threshold: 8.5, Level: 'critical', Message: '超标', ConfirmedAt: null, CreatedAt: 'now' })).toEqual({
      id: 5, deviceNo: 'dev-5', pondId: 2, metric: 'ph', currentValue: 9, threshold: 8.5, level: 'critical', message: '超标', confirmedAt: null, createdAt: 'now',
    })
  })
})
