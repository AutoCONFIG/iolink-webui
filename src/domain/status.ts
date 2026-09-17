import type { PondStatus } from '@/types/api'

export type StatusTone = 'success' | 'warning' | 'danger'

export function pondStatusMeta(status: PondStatus): { label: string; tone: StatusTone } {
  if (status === 'critical') return { label: '严重', tone: 'danger' }
  if (status === 'warning') return { label: '预警', tone: 'warning' }
  return { label: '正常', tone: 'success' }
}
