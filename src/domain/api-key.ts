import { z } from 'zod'

const resourceSchema = z.object({
  farm_ids: z.array(z.number().int().positive()).optional(),
  pond_ids: z.array(z.number().int().positive()).optional(),
  device_nos: z.array(z.string().min(1)).optional(),
})

const apiKeySchema = z.object({
  key_id: z.string().min(1),
  tenant_id: z.number().int().positive(),
  name: z.string(),
  scopes: z.array(z.string().min(1)),
  resources: resourceSchema,
  created_at: z.string().datetime({ offset: true }),
  revoked_at: z.string().datetime({ offset: true }).nullable().optional(),
})

const auditSchema = z.object({
  id: z.number().int().positive(),
  tenant_id: z.number().int().positive(),
  actor_id: z.number().int().positive().nullable().optional(),
  action: z.string().min(1),
  resource_id: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime({ offset: true }),
})

const secretSchema = z.string().min(1)

export function parseAPIKey(value: unknown) {
  const parsed = apiKeySchema.parse(value)
  return {
    keyId: parsed.key_id,
    tenantId: parsed.tenant_id,
    name: parsed.name,
    scopes: parsed.scopes,
    resources: { farmIds: parsed.resources.farm_ids, pondIds: parsed.resources.pond_ids, deviceNos: parsed.resources.device_nos },
    createdAt: parsed.created_at,
    revokedAt: parsed.revoked_at ?? null,
  }
}

export function parseAPIKeyAudit(value: unknown) {
  const parsed = auditSchema.parse(value)
  return {
    id: parsed.id,
    tenantId: parsed.tenant_id,
    actorId: parsed.actor_id ?? undefined,
    action: parsed.action,
    resourceId: parsed.resource_id,
    metadata: parsed.metadata,
    createdAt: parsed.created_at,
  }
}

export function parseAPIKeySecret(value: unknown) {
  return secretSchema.parse(value)
}

export function parseAPIKeys(value: unknown) {
  return z.array(apiKeySchema).parse(value).map(parseAPIKey)
}

export function parseAPIKeyAuditEvents(value: unknown) {
  return z.array(auditSchema).parse(value).map(parseAPIKeyAudit)
}
