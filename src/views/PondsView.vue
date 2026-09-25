<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createFarm, createPond, getFarms, getPonds } from '@/api/admin'
import type { Farm, Pond } from '@/types/api'
import StatusBadge from '@/components/StatusBadge.vue'
import MetricGrid from '@/components/MetricGrid.vue'

const loading = ref(true)
const saving = ref(false)
const farms = ref<Farm[]>([])
const ponds = ref<Pond[]>([])
const selectedFarm = ref<number | null>(null)
const farmDialog = ref(false)
const pondDialog = ref(false)
const farmForm = reactive({ name: '', location: '' })
const pondForm = reactive({ farmId: 0, name: '', areaMu: 0 })
const visiblePonds = computed(() => selectedFarm.value ? ponds.value.filter((item) => item.farmId === selectedFarm.value) : ponds.value)
const farmName = (id: number) => farms.value.find((item) => item.id === id)?.name ?? '--'

async function load() {
  loading.value = true
  try { [farms.value, ponds.value] = await Promise.all([getFarms(), getPonds()]) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '数据加载失败') }
  finally { loading.value = false }
}

async function saveFarm() {
  if (!farmForm.name.trim()) return ElMessage.warning('请输入养殖场名称')
  saving.value = true
  try { await createFarm({ name: farmForm.name.trim(), location: farmForm.location.trim() }); farmDialog.value = false; Object.assign(farmForm, { name: '', location: '' }); await load(); ElMessage.success('养殖场已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '创建失败') }
  finally { saving.value = false }
}

function openPond() {
  pondForm.farmId = selectedFarm.value ?? farms.value[0]?.id ?? 0
  pondDialog.value = true
}

async function savePond() {
  if (!pondForm.farmId || !pondForm.name.trim()) return ElMessage.warning('请完整填写池塘信息')
  if (pondForm.areaMu < 0) return ElMessage.warning('面积不能为负数')
  saving.value = true
  try { await createPond({ farmId: pondForm.farmId, name: pondForm.name.trim(), areaMu: pondForm.areaMu }); pondDialog.value = false; Object.assign(pondForm, { farmId: 0, name: '', areaMu: 0 }); await load(); ElMessage.success('池塘已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '创建失败') }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>养殖场与池塘</h2><p>以池塘为业务主对象，集中查看面积、状态与最新水质。</p></div><div class="toolbar"><el-button @click="farmDialog = true">新增养殖场</el-button><el-button type="primary" color="#0fae9b" @click="openPond">新增池塘</el-button></div></div>
    <section class="surface">
      <div class="surface-head"><div class="toolbar"><el-button :type="selectedFarm === null ? 'primary' : ''" @click="selectedFarm = null">全部池塘</el-button><el-button v-for="farm in farms" :key="farm.id" :type="selectedFarm === farm.id ? 'primary' : ''" @click="selectedFarm = farm.id">{{ farm.name }}</el-button></div><span style="color:#7b909e;font-size:13px">共 {{ visiblePonds.length }} 口</span></div>
      <div class="surface-body pond-grid">
        <div v-for="pond in visiblePonds" :key="pond.id" class="pond-card">
          <div class="pond-card-top"><div><h4>{{ pond.name }}</h4><small>{{ farmName(pond.farmId) }} · {{ pond.areaMu }} 亩</small></div><StatusBadge :status="pond.status" /></div>
          <MetricGrid :reading="pond.latest" />
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid #edf2f4;color:#8a9ba7;font-size:11px">最近数据：{{ pond.latest?.ts ? new Date(pond.latest.ts).toLocaleString('zh-CN') : '暂无上报' }}</div>
        </div>
        <el-empty v-if="!visiblePonds.length" description="该养殖场还没有池塘" />
      </div>
    </section>

    <el-dialog v-model="farmDialog" title="新增养殖场" width="460px">
      <el-form label-position="top"><el-form-item label="养殖场名称" required><el-input v-model="farmForm.name" placeholder="例如：东港示范养殖场" /></el-form-item><el-form-item label="所在地"><el-input v-model="farmForm.location" placeholder="省市或详细位置" /></el-form-item></el-form>
      <template #footer><el-button @click="farmDialog = false">取消</el-button><el-button type="primary" color="#0fae9b" :loading="saving" @click="saveFarm">确认创建</el-button></template>
    </el-dialog>
    <el-dialog v-model="pondDialog" title="新增池塘" width="460px">
      <el-form label-position="top"><el-form-item label="所属养殖场" required><el-select v-model="pondForm.farmId" style="width:100%"><el-option v-for="farm in farms" :key="farm.id" :label="farm.name" :value="farm.id" /></el-select></el-form-item><el-form-item label="池塘名称" required><el-input v-model="pondForm.name" placeholder="例如：A-03 虾塘" /></el-form-item><el-form-item label="面积（亩）"><el-input-number v-model="pondForm.areaMu" :min="0" :precision="1" style="width:100%" /></el-form-item></el-form>
      <template #footer><el-button @click="pondDialog = false">取消</el-button><el-button type="primary" color="#0fae9b" :loading="saving" @click="savePond">确认创建</el-button></template>
    </el-dialog>
  </div>
</template>
