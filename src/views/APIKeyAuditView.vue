<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAPIKeyAudit } from '@/api/admin'
import type { APIKeyAuditEvent } from '@/types/api'

const loading = ref(false)
const events = ref<APIKeyAuditEvent[]>([])

async function load() {
  loading.value = true
  try { events.value = await getAPIKeyAudit() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '日志加载失败') } finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>开放平台操作日志</h2><p>只显示 API Key 管理动作，不记录 Secret 或签名原文。</p></div><el-button :loading="loading" @click="load">刷新</el-button></div>
    <section v-loading="loading" class="surface" aria-label="开放平台操作日志"><div class="surface-body"><el-empty v-if="!events.length && !loading" description="暂无 API Key 操作" /><el-table v-else :data="events"><el-table-column prop="action" label="动作" /><el-table-column prop="resourceId" label="Key ID" /><el-table-column prop="actorId" label="操作者" /><el-table-column prop="createdAt" label="时间" /></el-table></div></section>
  </div>
</template>
