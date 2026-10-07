import { z } from 'zod'

const resourceID = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))

export class InvalidResourceIDs extends Error {
  constructor() { super('资源 ID 必须是逗号分隔的正整数，请检查输入') }
}

export function parseResourceIDs(value: string): number[] {
  if (!value.trim()) return []
  const parsed = z.array(resourceID).max(100).safeParse(value.split(',').map(item => item.trim()))
  if (!parsed.success) throw new InvalidResourceIDs()
  return [...new Set(parsed.data)]
}
