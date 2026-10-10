<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createRule, getPonds, getRules } from '@/api/admin'
import type { AlarmRule, MetricKey, Pond } from '@/types/api'
import { METRICS } from '@/domain/metrics'
import { useAuthStore } from '@/stores/auth'
import { canManageTenantResources, readOnlyTenantMessage } from '@/domain/tenantPermissions'

const auth = useAuthStore()
const canManage = computed(() => canManageTenantResources(auth.tenantRole))
const loading = ref(true)
const saving = ref(false)
const rules = ref<AlarmRule[]>([])
const ponds = ref<Pond[]>([])
const dialog = ref(false)
const form = reactive<{ pondId: number; metric: MetricKey; minValue: number | null; maxValue: number | null; level: 'warning' | 'critical' }>({ pondId: 0, metric: 'dissolved_oxygen', minValue: null, maxValue: null, level: 'warning' })
const pondName = (id: number) => ponds.value.find((item) => item.id === id)?.name ?? `池塘 #${id}`
const metricLabel = (key: MetricKey) => METRICS[key].label
const metricUnit = (key: MetricKey) => METRICS[key].unit

async function load() {
  loading.value = true
  try { [rules.value, ponds.value] = await Promise.all([getRules(), getPonds()]) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '规则加载失败') }
  finally { loading.value = false }
}

function openCreate() {
  if (!canManage.value) return ElMessage.warning(readOnlyTenantMessage)
  Object.assign(form, { pondId: ponds.value[0]?.id ?? 0, metric: 'dissolved_oxygen', minValue: null, maxValue: null, level: 'warning' }); dialog.value = true
}
async function save() {
  if (!canManage.value) return ElMessage.warning(readOnlyTenantMessage)
  if (!form.pondId) return ElMessage.warning('请选择池塘')
  if (form.minValue == null && form.maxValue == null) return ElMessage.warning('下限和上限至少填写一个')
  if (form.minValue != null && form.maxValue != null && form.minValue >= form.maxValue) return ElMessage.warning('下限必须小于上限')
  saving.value = true
  try { await createRule({ ...form }); dialog.value = false; await load(); ElMessage.success('报警规则已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '创建失败') }
  finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>报警规则</h2><p>按池塘设置水质上下限，超限后自动进入报警中心。</p><p v-if="!canManage" class="muted">{{ readOnlyTenantMessage }}</p></div><el-button v-if="canManage" type="primary" color="#0fae9b" @click="openCreate">新增规则</el-button></div>
    <section class="surface"><div class="surface-head"><h3>阈值规则</h3><span style="color:#7b909e;font-size:13px">{{ rules.length }} 条生效规则</span></div><div class="table-wrap"><el-table :data="rules" stripe><el-table-column label="池塘" min-width="160"><template #default="scope">{{ pondName(scope.row.pondId) }}</template></el-table-column><el-table-column label="监测指标" min-width="140"><template #default="scope">{{ metricLabel(scope.row.metric) }} <small style="color:#8295a2">{{ metricUnit(scope.row.metric) }}</small></template></el-table-column><el-table-column label="下限" width="120"><template #default="scope">{{ scope.row.minValue ?? '--' }}</template></el-table-column><el-table-column label="上限" width="120"><template #default="scope">{{ scope.row.maxValue ?? '--' }}</template></el-table-column><el-table-column label="级别" width="120"><template #default="scope"><el-tag :type="scope.row.level === 'critical' ? 'danger' : 'warning'">{{ scope.row.level === 'critical' ? '严重' : '预警' }}</el-tag></template></el-table-column><el-table-column label="状态" width="100"><template #default="scope"><el-tag :type="scope.row.enabled ? 'success' : 'info'">{{ scope.row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column></el-table></div></section>
    <el-dialog v-if="canManage" v-model="dialog" title="新增报警规则" width="520px">
      <el-form label-position="top"><el-form-item label="池塘" required><el-select v-model="form.pondId" style="width:100%"><el-option v-for="pond in ponds" :key="pond.id" :label="pond.name" :value="pond.id" /></el-select></el-form-item><el-form-item label="监测指标" required><el-select v-model="form.metric" style="width:100%"><el-option v-for="(meta, key) in METRICS" :key="key" :label="`${meta.label}${meta.unit ? `（${meta.unit}）` : ''}`" :value="key" /></el-select></el-form-item><el-row :gutter="14"><el-col :span="12"><el-form-item label="下限"><el-input-number v-model="form.minValue" :precision="2" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="上限"><el-input-number v-model="form.maxValue" :precision="2" style="width:100%" /></el-form-item></el-col></el-row><el-form-item label="报警级别" required><el-radio-group v-model="form.level"><el-radio-button value="warning">预警</el-radio-button><el-radio-button value="critical">严重</el-radio-button></el-radio-group></el-form-item></el-form>
      <template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" color="#0fae9b" :loading="saving" @click="save">保存规则</el-button></template>
    </el-dialog>
  </div>
</template>
