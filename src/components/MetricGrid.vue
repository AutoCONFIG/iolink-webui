<script setup lang="ts">
import type { Reading } from '@/types/api'
import { formatMetric, METRICS } from '@/domain/metrics'

defineProps<{ reading?: Reading | null; compact?: boolean }>()
const rows = [
  ['temperature', 'temperature'],
  ['dissolved_oxygen', 'dissolvedOxygen'],
  ['ph', 'ph'],
  ['turbidity', 'turbidity'],
] as const
</script>

<template>
  <div class="metric-grid" :class="{ compact }">
    <div v-for="([key, field]) in rows" :key="key" class="metric-item">
      <span>{{ METRICS[key].label }}</span>
      <strong :style="{ color: METRICS[key].color }">{{ formatMetric(key, reading?.[field]) }}</strong>
    </div>
  </div>
</template>
