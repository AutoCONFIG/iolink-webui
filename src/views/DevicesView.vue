<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { deleteDevice, getDevice, getDevicePage, getPonds, moveDevice, registerDevice, restoreDevice } from '@/api/admin'
import type { Device, DeviceRegistration, MetricKey, Pond } from '@/types/api'
import MetricGrid from '@/components/MetricGrid.vue'
import { METRICS } from '@/domain/metrics'

type ViewMode = 'list' | 'card'
const loading = ref(true)
const saving = ref(false)
const devices = ref<Device[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const ponds = ref<Pond[]>([])
const query = ref('')
const status = ref('')
const pondId = ref<number | null>(null)
const viewMode = ref<ViewMode>('list')
const registerDialog = ref(false)
const secretDialog = ref(false)
const registration = ref<DeviceRegistration | null>(null)
const detailDrawer = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selectedDevice = ref<Device | null>(null)
const form = reactive({ pondId: 0, name: '', model: '', reportInterval: 60 })
const moving = ref(false)
const detailTab = ref('overview')
const router = useRouter()

const pondName = (id: number) => ponds.value.find((item) => item.id === id)?.name ?? `池塘 #${id}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN') : '--'
const visibleDevices = computed(() => devices.value)
const onlineCount = computed(() => visibleDevices.value.filter((item) => item.status === 'online' && !item.disabledAt).length)
const offlineCount = computed(() => visibleDevices.value.filter((item) => item.status === 'offline' && !item.disabledAt).length)
const disabledCount = computed(() => visibleDevices.value.filter((item) => Boolean(item.disabledAt)).length)
const staleMetricKeys = computed<MetricKey[]>(() => {
  const device = selectedDevice.value
  const reading = device?.latest
  if (!device || !reading || !device.reportInterval || !reading.timestamps) return []
	const interval = device.reportInterval
  const now = Date.now()
	return Object.entries(reading.timestamps).filter(([metric, timestamp]) => metric in METRICS && timestamp && now - Date.parse(timestamp) > interval * 3000).map(([metric]) => metric as MetricKey)
})
const staleMetrics = computed(() => staleMetricKeys.value.map((key) => METRICS[key].label))

async function load() {
  loading.value = true
  try {
    const [devicePage, nextPonds] = await Promise.all([getDevicePage({ page: page.value, pageSize: pageSize.value, search: query.value, pondId: pondId.value ?? undefined, status: status.value || 'active' }), getPonds()])
    devices.value = devicePage.items
    total.value = devicePage.total
    ponds.value = nextPonds
  }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '设备加载失败') }
  finally { loading.value = false }
}
function searchDevices() { page.value = 1; void load() }
function changePage(value: number) { page.value = value; void load() }
function changePageSize(value: number) { pageSize.value = value; page.value = 1; void load() }
async function openDetails(device: Device) {
  selectedDevice.value = device; form.pondId = device.pondId; detailTab.value = 'overview'; detailDrawer.value = true; detailLoading.value = true; detailError.value = ''
  try { selectedDevice.value = await getDevice(device.deviceNo) }
  catch (error) { detailError.value = error instanceof Error ? error.message : '设备详情加载失败' }
  finally { detailLoading.value = false }
}
function openProductModels() { void router.push('/products') }
async function retryDetails() { if (selectedDevice.value) await openDetails(selectedDevice.value) }
function openRegister() { Object.assign(form, { pondId: ponds.value[0]?.id ?? 0, name: '', model: '', reportInterval: 60 }); registerDialog.value = true }
async function saveDevice() {
  if (!form.pondId) return ElMessage.warning('请选择池塘')
  saving.value = true
  try { registration.value = await registerDevice({ pondId: form.pondId, name: form.name.trim(), model: form.model.trim(), reportInterval: form.reportInterval }); registerDialog.value = false; secretDialog.value = true; await load() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '注册失败') }
  finally { saving.value = false }
}
async function copySecret() { if (registration.value?.secret) { await navigator.clipboard.writeText(registration.value.secret); ElMessage.success('Secret 已复制') } }
async function restore(no: string) { try { await restoreDevice(no); ElMessage.success('设备已恢复'); await load() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '恢复失败') } }
async function disable(no: string) { if (!window.confirm('停用后设备将断开接入并释放授权额度，确认继续吗？')) return; try { await deleteDevice(no); ElMessage.success('设备已停用'); await load() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '停用失败') } }
async function moveSelected() {
  if (!selectedDevice.value || !form.pondId || form.pondId === selectedDevice.value.pondId) return ElMessage.warning('请选择其他池塘')
	if (!window.confirm('调塘后设备归属将立即切换，历史遥测与报警仍按原池塘保留。确认继续吗？')) return
  moving.value = true
  try { await moveDevice(selectedDevice.value.deviceNo, form.pondId); ElMessage.success('设备已调至新池塘'); detailDrawer.value = false; await load() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '调塘失败') }
  finally { moving.value = false }
}
onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>设备管理</h2><p>按池塘和连接状态筛选终端，点击设备编号查看连接与最新遥测。</p></div><el-button type="primary" color="var(--teal)" @click="openRegister">注册设备</el-button></div>
    <section class="surface device-summary"><div><strong>{{ visibleDevices.length }}</strong><span>当前结果</span></div><div class="is-online"><strong>{{ onlineCount }}</strong><span>在线</span></div><div class="is-offline"><strong>{{ offlineCount }}</strong><span>离线</span></div><div class="is-disabled"><strong>{{ disabledCount }}</strong><span>已停用</span></div></section>
    <section class="surface">
      <div class="surface-head device-toolbar"><div class="toolbar"><el-input v-model="query" clearable placeholder="搜索设备编号、型号或池塘" style="width:260px" @keyup.enter="searchDevices" @clear="searchDevices" /><el-select v-model="pondId" clearable placeholder="全部池塘" style="width:160px" @change="searchDevices"><el-option v-for="pond in ponds" :key="pond.id" :label="pond.name" :value="pond.id" /></el-select><el-select v-model="status" clearable placeholder="全部有效设备" style="width:140px" @change="searchDevices"><el-option label="全部有效设备" value="active" /><el-option label="在线" value="online" /><el-option label="离线" value="offline" /><el-option label="全部设备" value="all" /><el-option label="已停用" value="disabled" /></el-select></div><el-radio-group v-model="viewMode" size="small" aria-label="设备视图"><el-radio-button value="list">列表</el-radio-button><el-radio-button value="card">卡片</el-radio-button></el-radio-group></div>
      <div v-if="viewMode === 'list'" class="table-wrap"><el-table :data="visibleDevices" stripe><el-table-column label="设备" min-width="220"><template #default="scope"><button class="resource-link" type="button" @click="openDetails(scope.row)"><strong>{{ scope.row.name || scope.row.deviceNo }}</strong><small>{{ scope.row.deviceNo }}</small></button></template></el-table-column><el-table-column prop="model" label="型号" min-width="150" /><el-table-column label="所属池塘" min-width="150"><template #default="scope">{{ pondName(scope.row.pondId) }}</template></el-table-column><el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="scope.row.disabledAt ? 'danger' : scope.row.status === 'online' ? 'success' : 'info'" effect="light">{{ scope.row.disabledAt ? '已停用' : scope.row.status === 'online' ? '在线' : '离线' }}</el-tag></template></el-table-column><el-table-column label="最后在线" min-width="180"><template #default="scope">{{ formatDate(scope.row.lastSeenAt) }}</template></el-table-column><el-table-column label="操作" width="130"><template #default="scope"><el-button link type="primary" @click="openDetails(scope.row)">查看详情</el-button></template></el-table-column></el-table></div>
      <div v-else class="surface-body device-card-grid"><article v-for="device in visibleDevices" :key="device.deviceNo" class="device-card"><div class="device-card-head"><button class="resource-link" type="button" @click="openDetails(device)"><strong>{{ device.name || device.deviceNo }}</strong><small>{{ device.deviceNo }}</small></button><el-tag :type="device.disabledAt ? 'danger' : device.status === 'online' ? 'success' : 'info'" effect="light">{{ device.disabledAt ? '已停用' : device.status === 'online' ? '在线' : '离线' }}</el-tag></div><dl class="device-card-meta"><div><dt>型号</dt><dd>{{ device.model || '--' }}</dd></div><div><dt>池塘</dt><dd>{{ pondName(device.pondId) }}</dd></div><div><dt>最后在线</dt><dd>{{ formatDate(device.lastSeenAt) }}</dd></div></dl><div class="device-card-actions"><el-button link type="primary" @click="openDetails(device)">查看详情</el-button></div></article></div>
      <el-empty v-if="!visibleDevices.length" description="没有符合筛选条件的设备" />
      <div v-if="total" class="device-pagination"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="changePage" @size-change="changePageSize" /></div>
    </section>
    <el-drawer v-model="detailDrawer" :title="selectedDevice ? (selectedDevice.name || selectedDevice.deviceNo) : '设备详情'" size="min(520px, 100vw)">
      <div v-loading="detailLoading" class="device-detail">
        <el-alert v-if="detailError" title="详情加载失败" :description="detailError" type="error" :closable="false" show-icon><template #default><el-button size="small" @click="retryDetails">重新加载</el-button></template></el-alert>
        <template v-if="selectedDevice && !detailError">
          <div class="detail-status"><el-tag :type="selectedDevice.disabledAt ? 'danger' : selectedDevice.status === 'online' ? 'success' : 'info'" effect="light">{{ selectedDevice.disabledAt ? '已停用' : selectedDevice.status === 'online' ? '在线' : '离线' }}</el-tag><span>最后在线 {{ formatDate(selectedDevice.lastSeenAt) }}</span></div>
          <el-tabs v-model="detailTab" class="detail-tabs">
            <el-tab-pane label="概览" name="overview">
              <el-descriptions title="设备信息" :column="1" border><el-descriptions-item label="设备编号">{{ selectedDevice.deviceNo }}</el-descriptions-item><el-descriptions-item label="型号">{{ selectedDevice.model || '--' }}</el-descriptions-item><el-descriptions-item label="所属池塘">{{ pondName(selectedDevice.pondId) }}</el-descriptions-item><el-descriptions-item label="上报周期">{{ selectedDevice.reportInterval ? `${selectedDevice.reportInterval} 秒` : '--' }}</el-descriptions-item><el-descriptions-item label="注册时间">{{ formatDate(selectedDevice.createdAt) }}</el-descriptions-item></el-descriptions>
            </el-tab-pane>
            <el-tab-pane label="遥测" name="telemetry">
              <section class="detail-section"><h3>最新遥测</h3><el-alert v-if="staleMetrics.length" title="部分遥测已过期" :description="`超过 ${selectedDevice.reportInterval ? selectedDevice.reportInterval * 3 : 0} 秒未更新：${staleMetrics.join('、')}`" type="warning" :closable="false" /><MetricGrid :reading="selectedDevice.latest" :stale-keys="new Set(staleMetricKeys)" :report-interval="selectedDevice.reportInterval" /><p class="detail-muted">{{ selectedDevice.latest?.ts ? `采集于 ${formatDate(selectedDevice.latest.ts)}` : '设备尚未上报数据' }}</p></section>
            </el-tab-pane>
            <el-tab-pane label="配置" name="configuration">
              <section class="detail-section"><h3>设备归属</h3><el-select v-model="form.pondId" style="width:100%"><el-option v-for="pond in ponds" :key="pond.id" :label="pond.name" :value="pond.id" /></el-select><el-button class="detail-action" type="primary" color="var(--teal)" :loading="moving" @click="moveSelected">调至所选池塘</el-button></section>
              <section class="detail-section"><h3>物模型与配置</h3><p class="detail-muted">设备型号 {{ selectedDevice.model || '--' }}；模型版本在产品与物模型页面维护。</p><el-button class="detail-action" @click="openProductModels">打开产品与物模型</el-button></section>
              <section class="detail-section"><h3>生命周期</h3><el-button v-if="selectedDevice.disabledAt" type="primary" @click="restore(selectedDevice.deviceNo)">恢复设备</el-button><el-button v-else type="danger" plain @click="disable(selectedDevice.deviceNo)">停用设备</el-button></section>
            </el-tab-pane>
          </el-tabs>
        </template>
      </div>
    </el-drawer>
    <el-dialog v-model="registerDialog" title="注册监测设备" width="460px"><el-form label-position="top"><el-form-item label="绑定池塘" required><el-select v-model="form.pondId" style="width:100%"><el-option v-for="pond in ponds" :key="pond.id" :label="pond.name" :value="pond.id" /></el-select></el-form-item><el-form-item label="设备名称"><el-input v-model="form.name" placeholder="例如：A-01 水质探头" /></el-form-item><el-form-item label="设备型号"><el-input v-model="form.model" placeholder="例如：AquaSense S5" /></el-form-item><el-form-item label="上报周期"><el-radio-group v-model="form.reportInterval"><el-radio-button :value="60">60 秒</el-radio-button><el-radio-button :value="300">300 秒</el-radio-button></el-radio-group></el-form-item></el-form><template #footer><el-button @click="registerDialog = false">取消</el-button><el-button type="primary" color="var(--teal)" :loading="saving" @click="saveDevice">生成接入凭据</el-button></template></el-dialog>
    <el-dialog v-model="secretDialog" title="保存设备 Secret" width="min(520px, calc(100vw - 32px))" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" @closed="registration = null"><el-alert title="Secret 仅显示这一次。关闭窗口后无法找回，请立即复制并安全交给设备配置人员。" type="warning" :closable="false" show-icon /><p class="secret-meta">设备编号：<strong>{{ registration?.deviceNo }}</strong></p><div class="secret-box">{{ registration?.secret }}</div><template #footer><el-button type="primary" color="var(--teal)" @click="copySecret">复制 Secret</el-button><el-button @click="secretDialog = false">我已保存，关闭</el-button></template></el-dialog>
  </div>
</template>
