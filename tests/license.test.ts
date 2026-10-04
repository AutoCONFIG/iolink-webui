import { describe, expect, it } from 'vitest'
import { parseLicenseStatus } from '../src/api/license'

const missing = { state: 'missing', deployment_id: 'local-instance', license_id: null, key_id: null, issued_at: null, not_before: null, expires_at: null, max_devices: 0, used_devices: 0, overage: 0, features: [], payload_sha256: null }

describe('License API boundary', () => {
  it('preserves missing state and null fields', () => {
    expect(parseLicenseStatus(missing)).toMatchObject({ state: 'missing', deploymentId: 'local-instance', expiresAt: null, features: [] })
  })
  it.each([{ max_devices: '5' }, { state: 'success' }, { features: ['unknown'] }, { expires_at: 'yesterday' }, { payload_sha256: 'invalid' }])('rejects malformed server data %j', (invalid) => {
    expect(() => parseLicenseStatus({ ...missing, ...invalid })).toThrow()
  })
  it('preserves overage features and precise signed times', () => {
    expect(parseLicenseStatus({ ...missing, state: 'overage', max_devices: 1, used_devices: 2, overage: 1, features: ['reports'], issued_at: '2026-01-01T00:00:00.123Z' })).toMatchObject({ overage: 1, features: ['reports'], issuedAt: '2026-01-01T00:00:00.123Z' })
  })
})
