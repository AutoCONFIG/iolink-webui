<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAlarms, getAlarms, getPonds } from '@/api/admin'
import type { Alarm, Pond } from '@/types/api'
import { METRICS, formatMetric } from '@/domain/metrics'
import { useAuthStore } from '@/stores/auth'
import { canConfirmTenantAlarms, readOnlyTenantMessage } from '@/domain/tenantPermissions'

const auth = useAuthStore()
const canConfirm = computed(() => canConfirmTenantAlarms(auth.tenantRole))
const loading = ref(true)
const confirming = ref(false)
const alarms = ref<Alarm[]>([])
const ponds = ref<Pond[]>([])
const onlyOpen = ref(true)
const level = ref('')
const selected = ref<Alarm[]>([])
const visible = computed(() => alarms.value.filter((item) => (!onlyOpen.value || !item.confirmedAt) && (!level.value || item.level === level.value)))
const openCritical = computed(() => alarms.value.filter((item) => !item.confirmedAt && item.level === 'critical').length)
const openWarning = computed(() => alarms.value.filter((item) => !item.confirmedAt && item.level === 'warning').length)
const pondName = (id: number) => ponds.value.find((item) => item.id === id)?.name ?? `池塘 #${id}`
const metricLabel = (alarm: Alarm) => METRICS[alarm.metric].label
const metricValue = (alarm: Alarm, value: number) => formatMetric(alarm.metric, value)

async function load() { loading.value = true; try { [alarms.value, ponds.value] = await Promise.all([getAlarms(), getPonds()]) } catch (error) { ElMessage.error(error instanceof Error ? error.message : '报警加载失败') } finally { loading.value = false } }
async function confirm(ids: number[]) {
  if (!canConfirm.value) return ElMessage.warning(readOnlyTenantMessage)
  if (!ids.length) return
  confirming.value = true
  try { const confirmed = await confirmAlarms(ids); ElMessage.success(`已确认 ${confirmed} 条报警`); selected.value = []; await load() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '确认失败') }
  finally { confirming.value = false }
}
onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>报警中心</h2><p>按严重程度集中处置水质异常，确认代表已知悉并完成线下检查。</p></div><el-button v-if="canConfirm" :disabled="!selected.some((item) => !item.confirmedAt)" :loading="confirming" type="primary" color="#0fae9b" @click="confirm(selected.filter((item) => !item.confirmedAt).map((item) => item.id))">批量确认（{{ selected.filter((item) => !item.confirmedAt).length }}）</el-button></div>
    <section class="kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><article class="surface kpi-card"><div class="kpi-label">严重待处理</div><div class="kpi-value" style="color:#e85f5f">{{ openCritical }}</div><div class="kpi-foot">立即检查增氧与传感器</div></article><article class="surface kpi-card"><div class="kpi-label">预警待处理</div><div class="kpi-value" style="color:#d99622">{{ openWarning }}</div><div class="kpi-foot">关注趋势并安排复核</div></article><article class="surface kpi-card"><div class="kpi-label">已加载报警</div><div class="kpi-value">{{ alarms.length }}</div><div class="kpi-foot">当前接口最多返回 200 条</div></article></section>
    <section class="surface"><div class="surface-head"><div class="toolbar"><el-checkbox v-model="onlyOpen">仅看未确认</el-checkbox><el-select v-model="level" clearable placeholder="全部级别" style="width:140px"><el-option label="严重" value="critical" /><el-option label="预警" value="warning" /></el-select></div><el-button @click="load">刷新</el-button></div><div class="table-wrap"><el-table :data="visible" stripe @selection-change="selected = $event"><el-table-column v-if="canConfirm" type="selection" width="48" /><el-table-column label="发生时间" min-width="175"><template #default="scope">{{ new Date(scope.row.createdAt).toLocaleString('zh-CN') }}</template></el-table-column><el-table-column label="池塘 / 设备" min-width="190"><template #default="scope"><strong>{{ pondName(scope.row.pondId) }}</strong><br><small style="color:#8799a5">{{ scope.row.deviceNo }}</small></template></el-table-column><el-table-column label="指标" width="120"><template #default="scope">{{ metricLabel(scope.row) }}</template></el-table-column><el-table-column label="触发值 / 阈值" min-width="170"><template #default="scope"><strong>{{ metricValue(scope.row, scope.row.currentValue) }}</strong><span style="color:#8a9aa5"> / {{ metricValue(scope.row, scope.row.threshold) }}</span></template></el-table-column><el-table-column label="级别" width="100"><template #default="scope"><el-tag :type="scope.row.level === 'critical' ? 'danger' : 'warning'">{{ scope.row.level === 'critical' ? '严重' : '预警' }}</el-tag></template></el-table-column><el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="scope.row.confirmedAt ? 'info' : 'danger'" effect="plain">{{ scope.row.confirmedAt ? '已确认' : '待处理' }}</el-tag></template></el-table-column><el-table-column v-if="canConfirm" label="操作" width="100"><template #default="scope"><el-button v-if="!scope.row.confirmedAt" link type="primary" @click="confirm([scope.row.id])">确认</el-button><span v-else style="color:#9aabb4">--</span></template></el-table-column></el-table></div></section>
  </div>
</template>
