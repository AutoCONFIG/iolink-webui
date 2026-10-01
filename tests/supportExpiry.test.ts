import { describe, expect, it } from 'vitest'
import { formatSupportExpiry, parseSupportExpiry } from '@/domain/supportExpiry'

describe('support expiry Shanghai clock and UTC transport', () => {
  it('converts Shanghai 13:00 to the UTC instant 05:00 and back', () => {
    expect(parseSupportExpiry('2026-10-02 13:00:00')).toEqual({ ok: true, value: '2026-10-02T05:00:00Z' })
    expect(formatSupportExpiry('2026-10-02T05:00:00Z')).toEqual({ ok: true, value: '2026-10-02 13:00:00' })
  })

  it('keeps seconds, date rollover, and offset-qualified API instants', () => {
    expect(parseSupportExpiry('2027-01-01 00:01:02')).toEqual({ ok: true, value: '2026-12-31T16:01:02Z' })
    expect(formatSupportExpiry('2026-10-02T01:02:03-04:00')).toEqual({ ok: true, value: '2026-10-02 13:02:03' })
    expect(parseSupportExpiry('2028-02-29 13:00:00')).toEqual({ ok: true, value: '2028-02-29T05:00:00Z' })
  })

  it.each(['2026-02-29 13:00:00', '2026-02-30 13:00:00', '2026-13-01 13:00:00', '2026-10-02 24:00:00', '2026-10-02 13:61:00', '2026-10-02 13:00', '2026-10-02T13:00:00Z', 'bad'])('rejects invalid or ambiguous user clock %s', (input) => {
    expect(parseSupportExpiry(input)).toEqual({ ok: false })
  })

  it('rejects API timestamps without an explicit timezone', () => {
    expect(formatSupportExpiry('2026-10-02T05:00:00')).toEqual({ ok: false })
    expect(formatSupportExpiry('invalid')).toEqual({ ok: false })
  })

  it('preserves the optional empty expiry', () => {
    expect(parseSupportExpiry(null)).toEqual({ ok: true, value: null })
    expect(formatSupportExpiry(null)).toEqual({ ok: true, value: null })
  })
})
