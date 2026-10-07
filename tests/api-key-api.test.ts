import { describe, expect, it } from 'vitest'
import { parseAPIKey, parseAPIKeyAudit, parseAPIKeySecret } from '@/domain/api-key'

const key = {
  key_id: 'ik_123', tenant_id: 1, name: 'integration', scopes: ['ponds:read'],
  resources: { farm_ids: [4], pond_ids: [], device_nos: [] },
  created_at: '2026-10-07T00:00:00Z', revoked_at: null,
}

describe('API key response boundaries', () => {
  it('maps the concrete wire shape without coercion', () => {
    const { revoked_at: _revokedAt, ...issuedKey } = key
    expect(parseAPIKey(issuedKey)).toMatchObject({ keyId: 'ik_123', tenantId: 1, resources: { farmIds: [4] }, revokedAt: null })
    expect(parseAPIKeySecret('secret-value')).toBe('secret-value')
  })
  it.each([
    { ...key, tenant_id: '1' },
    { ...key, key_id: undefined },
    { ...key, resources: { farm_ids: ['4'] } },
  ])('rejects malformed key payload %j', invalid => expect(() => parseAPIKey(invalid)).toThrow())
  it('rejects malformed audit and secret responses', () => {
    expect(() => parseAPIKeyAudit({ id: 1 })).toThrow()
    expect(() => parseAPIKeySecret(undefined)).toThrow()
  })
})
