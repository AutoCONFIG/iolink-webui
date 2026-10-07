import { z } from 'zod'

const resourceID = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))

export class InvalidResourceIDs extends Error {
  constructor() { super('资源 ID 必须是逗号分隔的正整数，请检查输入') }
}

export class InvalidDeviceNos extends Error {
  constructor() { super('设备号须用逗号分隔，不能有空项，最多 100 个') }
}

export function parseResourceIDs(value: string): number[] {
  if (!value.trim()) return []
  const parsed = z.array(resourceID).max(100).safeParse(value.split(',').map(item => item.trim()))
  if (!parsed.success) throw new InvalidResourceIDs()
  return [...new Set(parsed.data)]
}

export function parseDeviceNos(value: string): string[] {
  if (!value.trim()) return []
  const parsed = z.array(z.string().trim().min(1)).max(100).safeParse(value.split(','))
  if (!parsed.success) throw new InvalidDeviceNos()
  return [...new Set(parsed.data)]
}
