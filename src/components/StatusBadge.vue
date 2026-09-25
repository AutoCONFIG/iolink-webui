<script setup lang="ts">
import { computed } from 'vue'
import type { PondStatus } from '@/types/api'
import { pondStatusMeta } from '@/domain/status'

const props = defineProps<{ status: PondStatus }>()
const meta = computed(() => pondStatusMeta(props.status))
</script>

<template>
  <span class="status-badge" :class="`is-${meta.tone}`"><i />{{ meta.label }}</span>
</template>
