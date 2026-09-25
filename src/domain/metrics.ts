import type { MetricKey } from '@/types/api'

export interface MetricMeta { label: string; unit: string; digits: number; color: string }

export const METRICS: Record<MetricKey, MetricMeta> = {
  temperature: { label: '水温', unit: '℃', digits: 1, color: '#ff9d66' },
  dissolved_oxygen: { label: '溶解氧', unit: 'mg/L', digits: 1, color: '#28d7bd' },
  ph: { label: 'pH', unit: '', digits: 2, color: '#8ba8ff' },
  turbidity: { label: '浊度', unit: 'NTU', digits: 1, color: '#e6c768' },
  salinity: { label: '盐度', unit: 'ppt', digits: 1, color: '#74bfff' },
}

export function formatMetric(key: MetricKey, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '--'
  const meta = METRICS[key]
  return `${value.toFixed(meta.digits)}${meta.unit ? ` ${meta.unit}` : ''}`
}
