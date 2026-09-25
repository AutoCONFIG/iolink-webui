<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDevices, getPonds, registerDevice } from '@/api/admin'
import type { Device, DeviceRegistration, Pond } from '@/types/api'

const loading = ref(true)
const saving = ref(false)
const devices = ref<Device[]>([])
const ponds = ref<Pond[]>([])
const query = ref('')
const status = ref('')
const registerDialog = ref(false)
const secretDialog = ref(false)
const registration = ref<DeviceRegistration | null>(null)
const form = reactive({ pondId: 0, model: '' })
const pondName = (id: number) => ponds.value.find((item) => item.id === id)?.name ?? `池塘 #${id}`
const visibleDevices = computed(() => devices.value.filter((item) => (!status.value || item.status === status.value) && (!query.value || `${item.deviceNo}${item.model}${pondName(item.pondId)}`.toLowerCase().includes(query.value.toLowerCase()))))

async function load() {
  loading.value = true
  try { [devices.value, ponds.value] = await Promise.all([getDevices(), getPonds()]) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '设备加载失败') }
  finally { loading.value = false }
}

function openRegister() { form.pondId = ponds.value[0]?.id ?? 0; form.model = ''; registerDialog.value = true }
async function saveDevice() {
  if (!form.pondId) return ElMessage.warning('请选择池塘')
  saving.value = true
  try { registration.value = await registerDevice({ pondId: form.pondId, model: form.model.trim() }); registerDialog.value = false; secretDialog.value = true; await load() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '注册失败') }
  finally { saving.value = false }
}
async function copySecret() { if (registration.value?.secret) { await navigator.clipboard.writeText(registration.value.secret); ElMessage.success('Secret 已复制') } }
onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>设备管理</h2><p>查看终端在线状态，并为新设备生成一次性接入凭据。</p></div><el-button type="primary" color="#0fae9b" @click="openRegister">注册设备</el-button></div>
    <section class="surface">
      <div class="surface-head"><div class="toolbar"><el-input v-model="query" clearable placeholder="搜索设备、型号或池塘" style="width:260px" /><el-select v-model="status" clearable placeholder="全部状态" style="width:140px"><el-option label="在线" value="online" /><el-option label="离线" value="offline" /></el-select></div><span style="color:#7b909e;font-size:13px">{{ visibleDevices.length }} 台设备</span></div>
      <div class="table-wrap"><el-table :data="visibleDevices" stripe><el-table-column prop="deviceNo" label="设备编号" min-width="170" /><el-table-column prop="model" label="型号" min-width="150" /><el-table-column label="所属池塘" min-width="150"><template #default="scope">{{ pondName(scope.row.pondId) }}</template></el-table-column><el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="scope.row.status === 'online' ? 'success' : 'info'" effect="light">{{ scope.row.status === 'online' ? '在线' : '离线' }}</el-tag></template></el-table-column><el-table-column label="最后在线" min-width="180"><template #default="scope">{{ scope.row.lastSeenAt ? new Date(scope.row.lastSeenAt).toLocaleString('zh-CN') : '从未上线' }}</template></el-table-column></el-table></div>
    </section>

    <el-dialog v-model="registerDialog" title="注册监测设备" width="460px">
      <el-form label-position="top"><el-form-item label="绑定池塘" required><el-select v-model="form.pondId" style="width:100%"><el-option v-for="pond in ponds" :key="pond.id" :label="pond.name" :value="pond.id" /></el-select></el-form-item><el-form-item label="设备型号"><el-input v-model="form.model" placeholder="例如：AquaSense S5" /></el-form-item></el-form>
      <template #footer><el-button @click="registerDialog = false">取消</el-button><el-button type="primary" color="#0fae9b" :loading="saving" @click="saveDevice">生成接入凭据</el-button></template>
    </el-dialog>
    <el-dialog v-model="secretDialog" title="保存设备 Secret" width="min(520px, calc(100vw - 32px))" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" @closed="registration = null">
      <el-alert title="Secret 仅显示这一次。关闭窗口后无法找回，请立即复制并安全交给设备配置人员。" type="warning" :closable="false" show-icon />
      <p style="color:#7a8d9a;font-size:13px;margin-top:20px">设备编号：<strong>{{ registration?.deviceNo }}</strong></p><div class="secret-box">{{ registration?.secret }}</div>
      <template #footer><el-button type="primary" color="#0fae9b" @click="copySecret">复制 Secret</el-button><el-button @click="secretDialog = false">我已保存，关闭</el-button></template>
    </el-dialog>
  </div>
</template>
