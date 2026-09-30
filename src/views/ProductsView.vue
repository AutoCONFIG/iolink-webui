<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { assignDeviceProduct, createProduct, createProductModel, getProductModels, getProducts, publishProductModel } from '@/api/admin'
import type { ModelField, Product, ProductModel } from '@/types/api'

const products = ref<Product[]>([])
const models = ref<ProductModel[]>([])
const selected = ref<Product | null>(null)
const name = ref('')
const loading = ref(false)
const saving = ref(false)
const fieldName = ref('')
const fieldType = ref<ModelField['type']>('number')
const fieldUnit = ref('')
const fieldMin = ref('')
const fieldMax = ref('')
const fieldEnum = ref('')
const pendingFields = ref<ModelField[]>([])
const deviceNo = ref('')

async function load() {
  loading.value = true
  try { products.value = await getProducts(); if (products.value[0]) await select(products.value[0]) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '产品加载失败') }
  finally { loading.value = false }
}
async function select(product: Product) { selected.value = product; pendingFields.value = []; resetField(); models.value = await getProductModels(product.id) }
function resetField() { fieldName.value = ''; fieldUnit.value = ''; fieldMin.value = ''; fieldMax.value = ''; fieldEnum.value = '' }
async function save() {
  const value = name.value.trim(); if (!value) return
  saving.value = true
  try { const product = await createProduct(value); products.value = [...products.value, product]; name.value = ''; await select(product); ElMessage.success('产品已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '产品创建失败') }
  finally { saving.value = false }
}
async function addModel() {
  if (!selected.value || (pendingFields.value.length === 0 && !fieldName.value.trim())) return
  saving.value = true
  const min = fieldMin.value.trim() === '' ? undefined : Number(fieldMin.value)
  const max = fieldMax.value.trim() === '' ? undefined : Number(fieldMax.value)
  const field: ModelField | null = fieldName.value.trim() ? { identifier: fieldName.value.trim(), type: fieldType.value, unit: fieldUnit.value.trim(), min, max, enum: fieldEnum.value.split(',').map((value) => value.trim()).filter(Boolean), readable: true, writable: false, nullable: true } : null
  try { await createProductModel(selected.value.id, [...pendingFields.value, ...(field ? [field] : [])]); pendingFields.value = []; resetField(); models.value = await getProductModels(selected.value.id); ElMessage.success('模型版本已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '模型创建失败') }
  finally { saving.value = false }
}
function queueField() {
  if (!fieldName.value.trim()) return
  const min = fieldMin.value.trim() === '' ? undefined : Number(fieldMin.value)
  const max = fieldMax.value.trim() === '' ? undefined : Number(fieldMax.value)
  pendingFields.value.push({ identifier: fieldName.value.trim(), type: fieldType.value, unit: fieldUnit.value.trim(), min, max, enum: fieldEnum.value.split(',').map((value) => value.trim()).filter(Boolean), readable: true, writable: false, nullable: true })
  resetField()
}
function removePending(identifier: string) { pendingFields.value = pendingFields.value.filter((field) => field.identifier !== identifier) }
async function publish(version: number) { if (!selected.value) return; try { await publishProductModel(selected.value.id, version); models.value = await getProductModels(selected.value.id); ElMessage.success('模型已发布') } catch (error) { ElMessage.error(error instanceof Error ? error.message : '发布失败') } }
async function assign() { const latest = [...models.value].filter((model) => model.publishedAt).sort((a, b) => b.version - a.version)[0]; if (!selected.value || !deviceNo.value || !latest) return; try { await assignDeviceProduct(deviceNo.value, selected.value.id, latest.version); ElMessage.success('设备模型已升级') } catch (error) { ElMessage.error(error instanceof Error ? error.message : '设备升级失败') } }
onMounted(load)
</script>

<template>
  <div class="page-intro"><div><h2>产品与物模型</h2><p>查看产品、模型版本与设备采集字段。</p></div></div>
  <div class="settings-grid" v-loading="loading">
    <section class="surface"><div class="surface-head"><h3>产品目录</h3></div><div class="surface-body">
      <div class="toolbar"><el-input v-model="name" placeholder="新产品名称" @keyup.enter="save" /><el-button type="primary" color="#0fae9b" :loading="saving" @click="save">创建</el-button></div>
      <el-empty v-if="!products.length" description="暂无产品" />
      <button v-for="product in products" :key="product.id" class="product-row" :class="{ selected: selected?.id === product.id }" @click="select(product)"><strong>{{ product.name }}</strong><small>#{{ product.id }}</small></button>
    </div></section>
    <section class="surface"><div class="surface-head"><div><h3>{{ selected?.name ?? '选择产品' }}</h3><small>模型版本按版本号保留历史</small></div></div><div class="surface-body">
      <div v-if="selected" class="toolbar"><el-input v-model="fieldName" placeholder="字段标识，例如 mode" /><el-select v-model="fieldType" style="width:130px"><el-option label="数值" value="number" /><el-option label="整数" value="integer" /><el-option label="布尔" value="boolean" /><el-option label="文本/枚举" value="string" /></el-select><el-input v-model="fieldUnit" placeholder="单位" style="width:100px" /><el-input v-model="fieldMin" placeholder="最小值" style="width:90px" /><el-input v-model="fieldMax" placeholder="最大值" style="width:90px" /><el-input v-model="fieldEnum" placeholder="枚举值，用逗号分隔" style="width:180px" /><el-button @click="queueField">加入字段</el-button><el-button type="primary" color="#0fae9b" :loading="saving" @click="addModel">新建版本</el-button></div>
      <div v-if="selected && pendingFields.length" class="field-draft">待加入：<span v-for="field in pendingFields" :key="field.identifier" class="draft-chip">{{ field.identifier }} <button type="button" :aria-label="`移除 ${field.identifier}`" @click="removePending(field.identifier)">×</button></span></div>
      <div v-if="selected" class="toolbar"><el-input v-model="deviceNo" placeholder="设备编号" /><el-button @click="assign">升级到当前产品最新版本</el-button></div>
      <el-empty v-if="!selected" description="选择产品查看模型" />
      <el-table v-else :data="models" stripe><el-table-column prop="version" label="版本" width="90" /><el-table-column label="字段"><template #default="scope">{{ scope.row.fields.map((field: { identifier: string }) => field.identifier).join('、') }}</template></el-table-column><el-table-column label="状态" width="150"><template #default="scope"><el-button v-if="!scope.row.publishedAt" link type="primary" @click="publish(scope.row.version)">发布</el-button><el-tag :type="scope.row.publishedAt ? 'success' : 'info'">{{ scope.row.publishedAt ? '已发布' : '草稿' }}</el-tag></template></el-table-column></el-table>
    </div></section>
  </div>
</template>

<style scoped>
.product-row { display: flex; width: 100%; justify-content: space-between; border: 0; border-radius: 10px; background: transparent; color: var(--ink); cursor: pointer; padding: 12px; text-align: left; }
.product-row:hover, .product-row.selected { background: var(--teal-soft); }
.product-row small { color: var(--muted); }
</style>
