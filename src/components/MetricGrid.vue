<script setup lang="ts">
import type { MetricKey, Reading } from '@/types/api'
import { formatMetric, METRICS } from '@/domain/metrics'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'

const props = defineProps<{ reading?: Reading | null; compact?: boolean; staleKeys?: ReadonlySet<MetricKey>; reportInterval?: number }>()
const rows = [
  ['temperature', 'temperature'],
  ['dissolved_oxygen', 'dissolvedOxygen'],
  ['ph', 'ph'],
  ['turbidity', 'turbidity'],
  ['salinity', 'salinity'],
] as const
// 每个指标一个平滑读数（纯展示，源数据仍来自 props.reading，不修改接口数据）
const metricItems = rows.map(([key, field]) => ({
  key,
  field,
  animated: useAnimatedNumber(() => props.reading?.[field]),
}))
type MetricItem = typeof metricItems[number]
const formatTimestamp = (value?: string | null) => value ? new Date(value).toLocaleTimeString('zh-CN') : ''
// 过期数据直接显示原始值；正常数据显示平滑过渡中的读数
const shownValue = (item: MetricItem): number | null | undefined =>
  props.staleKeys?.has(item.key) ? props.reading?.[item.field] : item.animated.value
const shownText = (item: MetricItem): string =>
  formatMetric(item.key, shownValue(item))
</script>

<template>
  <div class="metric-grid" :class="{ compact }">
    <div v-for="item in metricItems" :key="item.key" class="metric-item" :class="{ 'is-stale': props.staleKeys?.has(item.key) }">
      <span class="metric-meta">
        <span>{{ METRICS[item.key].label }}</span>
        <small v-if="props.staleKeys?.has(item.key)">已过期</small>
        <small v-else-if="reading?.timestamps?.[item.key]">更新 {{ formatTimestamp(reading.timestamps[item.key]) }}</small>
      </span>
      <strong :style="{ color: props.staleKeys?.has(item.key) ? 'var(--warning)' : METRICS[item.key].color }">{{ shownText(item) }}</strong>
    </div>
  </div>
</template>
