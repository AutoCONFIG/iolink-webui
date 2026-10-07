import { describe, expect, it } from 'vitest'
import { InvalidDeviceNos, InvalidResourceIDs, parseDeviceNos, parseResourceIDs } from '@/domain/api-key-scope'

describe('API key resource IDs', () => {
  it('allows deliberate empty scope and normalizes explicit positive IDs', () => {
    expect(parseResourceIDs('  ')).toEqual([])
    expect(parseResourceIDs('4, 7,4')).toEqual([4, 7])
  })
  it.each(['4x', '4,invalid', '-1', '0', '1.5', '1e3', '9007199254740992', '4,', ','])('rejects %s instead of widening grants', value => {
    expect(() => parseResourceIDs(value)).toThrow(InvalidResourceIDs)
  })
})

describe('API key device resources', () => {
  it('preserves deliberate empty scope and rejects empty comma entries', () => {
    expect(parseDeviceNos('  ')).toEqual([])
    expect(parseDeviceNos('sensor-a, sensor-b,sensor-a')).toEqual(['sensor-a', 'sensor-b'])
    expect(() => parseDeviceNos(',')).toThrow(InvalidDeviceNos)
    expect(() => parseDeviceNos('sensor-a,')).toThrow(InvalidDeviceNos)
  })
})
