<script setup lang="ts">
import type { Reading } from '@/types/api'
import { formatMetric, METRICS } from '@/domain/metrics'

const props = defineProps<{ reading?: Reading | null; compact?: boolean; staleKeys?: ReadonlySet<keyof typeof METRICS>; reportInterval?: number }>()
const rows = [
  ['temperature', 'temperature'],
  ['dissolved_oxygen', 'dissolvedOxygen'],
  ['ph', 'ph'],
  ['turbidity', 'turbidity'],
  ['salinity', 'salinity'],
] as const
const formatTimestamp = (value?: string | null) => value ? new Date(value).toLocaleTimeString('zh-CN') : ''
</script>

<template>
  <div class="metric-grid" :class="{ compact }">
    <div v-for="([key, field]) in rows" :key="key" class="metric-item" :class="{ 'is-stale': props.staleKeys?.has(key) }">
      <span class="metric-meta"><span>{{ METRICS[key].label }}</span><small v-if="props.staleKeys?.has(key)">已过期</small><small v-else-if="reading?.timestamps?.[key]">更新 {{ formatTimestamp(reading.timestamps[key]) }}</small></span>
      <strong :style="{ color: props.staleKeys?.has(key) ? 'var(--warning)' : METRICS[key].color }">{{ formatMetric(key, reading?.[field]) }}</strong>
    </div>
  </div>
</template>
