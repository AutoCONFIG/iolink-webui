const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

export type SupportExpiryResult =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false }

export function formatSupportExpiry(utc: string | null | undefined): SupportExpiryResult {
  if (!utc) return { ok: true, value: null }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(utc)) return { ok: false }
  const instant = Date.parse(utc)
  if (!Number.isFinite(instant)) return { ok: false }
  const shanghai = new Date(instant + SHANGHAI_OFFSET_MS)
  if (!Number.isFinite(shanghai.getTime())) return { ok: false }
  return { ok: true, value: shanghai.toISOString().slice(0, 19).replace('T', ' ') }
}

export function parseSupportExpiry(shanghai: string | null): SupportExpiryResult {
  if (!shanghai) return { ok: true, value: null }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(shanghai)) return { ok: false }
  const instant = Date.parse(`${shanghai.replace(' ', 'T')}+08:00`)
  if (!Number.isFinite(instant)) return { ok: false }
  const utc = new Date(instant).toISOString().replace('.000Z', 'Z')
  const roundTrip = formatSupportExpiry(utc)
  if (!roundTrip.ok || roundTrip.value !== shanghai) return { ok: false }
  return { ok: true, value: utc }
}
