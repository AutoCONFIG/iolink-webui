import { z } from 'zod'
import type { LicenseStatus } from '@/types/api'

const count = z.number().nonnegative().refine(Number.isInteger)
const licenseStatus = z.object({
  state: z.enum(['missing', 'valid', 'permanent', 'not_before', 'expired', 'invalid', 'instance_mismatch', 'clock_error', 'overage']),
  deployment_id: z.string(),
  license_id: z.string().nullable(),
  key_id: z.string().nullable(),
  issued_at: z.iso.datetime().nullable(),
  not_before: z.iso.datetime().nullable(),
  expires_at: z.iso.datetime().nullable(),
  max_devices: count,
  used_devices: count,
  overage: count,
  features: z.array(z.enum(['video', 'openapi', 'automation', 'reports'])),
  payload_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
})

export function parseLicenseStatus(value: unknown): LicenseStatus {
  const data = licenseStatus.parse(value)
  return {
    state: data.state, deploymentId: data.deployment_id, licenseId: data.license_id,
    keyId: data.key_id, issuedAt: data.issued_at, notBefore: data.not_before,
    expiresAt: data.expires_at, maxDevices: data.max_devices, usedDevices: data.used_devices,
    overage: data.overage, features: data.features, payloadSha256: data.payload_sha256,
  }
}
