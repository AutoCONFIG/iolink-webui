<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { assignDeviceProduct, createProduct, createProductModel, getProductModels, getProducts, publishProductModel } from '@/api/admin'
import type { ModelField, Product, ProductModel } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { filterProducts, latestPublishedModel, modelState } from '@/domain/products'

type ViewMode = 'list' | 'card'

const auth = useAuthStore()
const canManage = computed(() => ['owner', 'admin'].includes(auth.tenantRole))
const loading = ref(true)
const modelLoading = ref(false)
const saving = ref(false)
const products = ref<Product[]>([])
const models = ref<ProductModel[]>([])
const selected = ref<Product | null>(null)
const selectedModelVersion = ref<number | null>(null)
const query = ref('')
const viewMode = ref<ViewMode>('list')
const detailTab = ref('overview')
const detailError = ref('')
const loadError = ref('')
const createProductDialog = ref(false)
const createModelDialog = ref(false)
const productName = ref('')
const deviceNo = ref('')
const assignVersion = ref<number | null>(null)
const pendingFields = ref<ModelField[]>([])
const fieldForm = reactive({ identifier: '', type: 'number' as ModelField['type'], unit: '', min: '', max: '', enumValues: '', readable: true, writable: false, nullable: true })
let selectRequest = 0

const filteredProducts = computed(() => filterProducts(products.value, query.value))
const sortedModels = computed(() => [...models.value].sort((left, right) => right.version - left.version))
const selectedModel = computed(() => {
  if (selectedModelVersion.value !== null) return models.value.find((model) => model.version === selectedModelVersion.value) ?? null
  return latestPublishedModel(models.value) ?? sortedModels.value[0] ?? null
})
const publishedModels = computed(() => sortedModels.value.filter((model) => model.publishedAt))
const selectedProductModelCount = computed(() => models.value.length)

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '--'
}

function resetFieldForm() {
  Object.assign(fieldForm, { identifier: '', type: 'number', unit: '', min: '', max: '', enumValues: '', readable: true, writable: false, nullable: true })
}

function fieldFromForm(): ModelField | null {
  const identifier = fieldForm.identifier.trim()
  if (!identifier) {
    ElMessage.warning('请输入字段标识')
    return null
  }
  if (pendingFields.value.some((field) => field.identifier === identifier)) {
    ElMessage.warning('字段标识不能重复')
    return null
  }
  const min = fieldForm.min.trim() === '' ? undefined : Number(fieldForm.min)
  const max = fieldForm.max.trim() === '' ? undefined : Number(fieldForm.max)
  if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max))) {
    ElMessage.warning('范围必须是有效数字')
    return null
  }
  if (min !== undefined && max !== undefined && min >= max) {
    ElMessage.warning('最小值必须小于最大值')
    return null
  }
  const enumValues = fieldForm.enumValues.split(',').map((value) => value.trim()).filter(Boolean)
  return { identifier, type: fieldForm.type, unit: fieldForm.unit.trim(), min, max, enum: enumValues.length ? enumValues : undefined, readable: fieldForm.readable, writable: fieldForm.writable, nullable: fieldForm.nullable }
}

function selectModel(model: ProductModel) {
  selectedModelVersion.value = model.version
  if (model.publishedAt) assignVersion.value = model.version
}

async function load() {
  loading.value = true
  loadError.value = ''
  detailError.value = ''
  try {
    products.value = await getProducts()
    const next = selected.value ? products.value.find((product) => product.id === selected.value?.id) : products.value[0]
    if (next) await select(next)
    else { selected.value = null; models.value = [] }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '产品加载失败'
    ElMessage.error(error instanceof Error ? error.message : '产品加载失败')
  } finally {
    loading.value = false
  }
}

async function select(product: Product) {
  const request = ++selectRequest
  selected.value = product
  detailTab.value = 'overview'
  selectedModelVersion.value = null
  assignVersion.value = null
  detailError.value = ''
  modelLoading.value = true
  try {
    const nextModels = await getProductModels(product.id)
    if (request !== selectRequest) return
    models.value = nextModels
    const latest = latestPublishedModel(models.value) ?? [...models.value].sort((left, right) => right.version - left.version)[0]
    selectedModelVersion.value = latest?.version ?? null
    assignVersion.value = latestPublishedModel(models.value)?.version ?? null
  } catch (error) {
    if (request !== selectRequest) return
    models.value = []
    detailError.value = error instanceof Error ? error.message : '模型加载失败'
  } finally {
    if (request === selectRequest) modelLoading.value = false
  }
}

function openCreateProduct() {
  productName.value = ''
  createProductDialog.value = true
}

async function saveProduct() {
  const name = productName.value.trim()
  if (!name) return ElMessage.warning('请输入产品名称')
  saving.value = true
  try {
    const product = await createProduct(name)
    products.value = [...products.value, product]
    createProductDialog.value = false
    query.value = ''
    await select(product)
    ElMessage.success('产品已创建')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '产品创建失败')
  } finally {
    saving.value = false
  }
}

function openCreateModel() {
  pendingFields.value = []
  resetFieldForm()
  createModelDialog.value = true
}

function queueField(): boolean {
  const field = fieldFromForm()
  if (!field) return false
  pendingFields.value = [...pendingFields.value, field]
  resetFieldForm()
  return true
}

function removePending(identifier: string) {
  pendingFields.value = pendingFields.value.filter((field) => field.identifier !== identifier)
}

async function saveModel() {
  if (!selected.value) return
  if (fieldForm.identifier.trim() && !queueField()) return
  if (!pendingFields.value.length) return ElMessage.warning('至少添加一个模型字段')
  saving.value = true
  try {
    const model = await createProductModel(selected.value.id, pendingFields.value)
    models.value = [...models.value, model]
    selectedModelVersion.value = model.version
    createModelDialog.value = false
    pendingFields.value = []
    ElMessage.success('模型版本已创建')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '模型创建失败')
  } finally {
    saving.value = false
  }
}

async function publish(version: number) {
  if (!selected.value) return
  if (!window.confirm(`发布 v${version} 后将成为新设备的默认模型，确认继续吗？`)) return
  try {
    const published = await publishProductModel(selected.value.id, version)
    models.value = models.value.map((model) => model.version === published.version ? published : model)
    selected.value = { ...selected.value, currentVersion: version }
    products.value = products.value.map((product) => product.id === selected.value?.id ? { ...product, currentVersion: version } : product)
    assignVersion.value = version
    ElMessage.success(`模型 v${version} 已发布`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败')
  }
}

async function assign() {
  if (!selected.value || !deviceNo.value.trim()) return ElMessage.warning('请输入设备编号')
  if (!assignVersion.value) return ElMessage.warning('请选择已发布的模型版本')
  try {
    await assignDeviceProduct(deviceNo.value.trim(), selected.value.id, assignVersion.value)
    ElMessage.success(`设备已绑定模型 v${assignVersion.value}`)
    deviceNo.value = ''
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设备绑定失败')
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>产品与物模型</h2><p>按产品管理模型版本、字段定义和设备绑定关系。</p></div><el-button v-if="canManage" type="primary" color="var(--teal)" @click="openCreateProduct">创建产品</el-button></div>
    <section class="surface product-workspace">
      <div class="surface-head product-toolbar"><div class="toolbar"><el-input v-model="query" clearable placeholder="搜索产品名称或 ID" style="width:260px" /><el-radio-group v-model="viewMode" size="small" aria-label="产品视图"><el-radio-button value="list">列表</el-radio-button><el-radio-button value="card">卡片</el-radio-button></el-radio-group></div><span class="product-detail-muted">{{ filteredProducts.length }} 个产品</span></div>
      <el-alert v-if="loadError" title="产品加载失败" :description="loadError" type="error" :closable="false" show-icon><template #default><el-button size="small" @click="load">重新加载</el-button></template></el-alert>
      <div class="product-workspace-grid">
        <aside class="product-catalog" aria-label="产品目录"><div class="catalog-heading"><strong>产品目录</strong><span>选择产品查看详情</span></div><div v-if="viewMode === 'list'" class="product-list"><button v-for="product in filteredProducts" :key="product.id" type="button" class="product-list-row" :class="{ selected: selected?.id === product.id }" @click="select(product)"><span><strong>{{ product.name }}</strong><small>#{{ product.id }}</small></span><el-tag v-if="product.builtin" size="small" effect="plain">内置</el-tag></button></div><div v-else class="product-resource-grid"><button v-for="product in filteredProducts" :key="product.id" type="button" class="product-resource-card" :class="{ selected: selected?.id === product.id }" @click="select(product)"><div class="product-resource-card-head"><strong>{{ product.name }}</strong><el-tag v-if="product.builtin" size="small" effect="plain">内置</el-tag></div><small>#{{ product.id }}</small><div class="product-resource-meta"><span>当前版本</span><strong>{{ product.currentVersion ? `v${product.currentVersion}` : '未发布' }}</strong></div></button></div><el-empty v-if="!filteredProducts.length" description="没有符合条件的产品" /></aside>
        <section class="product-detail"><el-alert v-if="detailError" title="模型加载失败" :description="detailError" type="error" :closable="false" show-icon><template #default><el-button size="small" @click="selected && select(selected)">重新加载</el-button></template></el-alert><template v-if="selected && !detailError"><div class="product-detail-head"><div><h3>{{ selected.name }}</h3><p class="product-detail-muted">产品 #{{ selected.id }} · {{ selected.builtin ? '系统内置产品' : '租户产品' }}</p></div><div class="product-detail-actions"><el-tag v-if="selected.currentVersion" type="success" effect="light">当前 v{{ selected.currentVersion }}</el-tag><el-tag v-else type="info" effect="light">尚未发布</el-tag></div></div><el-tabs v-model="detailTab" class="product-tabs">
            <el-tab-pane label="概览" name="overview"><el-descriptions title="产品信息" :column="1" border><el-descriptions-item label="产品名称">{{ selected.name }}</el-descriptions-item><el-descriptions-item label="产品类型">{{ selected.builtin ? '内置' : '自定义' }}</el-descriptions-item><el-descriptions-item label="模型版本数">{{ selectedProductModelCount }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ formatDate(selected.createdAt) }}</el-descriptions-item></el-descriptions></el-tab-pane>
            <el-tab-pane label="物模型" name="models"><div v-loading="modelLoading" class="product-model-panel"><div class="product-model-toolbar"><div class="toolbar"><el-select v-if="selectedModel" v-model="selectedModelVersion" style="width:150px" aria-label="选择模型版本"><el-option v-for="model in sortedModels" :key="model.version" :label="`v${model.version} · ${modelState(model) === 'published' ? '已发布' : '草稿'}`" :value="model.version" /></el-select><span class="product-detail-muted">已发布版本不可覆盖，只能新增版本</span></div><el-button v-if="canManage" type="primary" color="var(--teal)" @click="openCreateModel">新建模型版本</el-button></div><el-table v-if="sortedModels.length" :data="sortedModels" stripe highlight-current-row :current-row="selectedModel" @row-click="selectModel"><el-table-column label="版本" width="100"><template #default="scope"><strong>v{{ scope.row.version }}</strong></template></el-table-column><el-table-column label="字段数" width="100"><template #default="scope">{{ scope.row.fields.length }}</template></el-table-column><el-table-column label="创建时间" min-width="180"><template #default="scope">{{ formatDate(scope.row.createdAt) }}</template></el-table-column><el-table-column label="状态" width="150"><template #default="scope"><el-button v-if="canManage && !scope.row.publishedAt" link type="primary" @click.stop="publish(scope.row.version)">发布</el-button><el-tag :type="modelState(scope.row) === 'published' ? 'success' : 'info'">{{ modelState(scope.row) === 'published' ? '已发布' : '草稿' }}</el-tag></template></el-table-column></el-table><div v-if="selectedModel" class="product-model-fields"><div class="surface-head"><div><h3>v{{ selectedModel.version }} 字段定义</h3><span class="product-detail-muted">{{ selectedModel.publishedAt ? `发布于 ${formatDate(selectedModel.publishedAt)}` : '草稿，可继续维护后发布' }}</span></div></div><div v-for="field in selectedModel.fields" :key="field.identifier" class="product-model-field"><span><strong>{{ field.identifier }}</strong><small>{{ field.type }}{{ field.unit ? ` · ${field.unit}` : '' }}</small></span><span class="product-detail-muted">{{ field.min ?? '--' }} ~ {{ field.max ?? '--' }}{{ field.enum?.length ? ` · ${field.enum.join(' / ')}` : '' }}</span></div><div v-if="!selectedModel.fields.length" class="product-empty-note">该版本还没有字段定义</div></div><el-empty v-else description="还没有模型版本" /></div></el-tab-pane>
            <el-tab-pane label="设备绑定" name="binding"><el-alert title="绑定会替换设备当前物模型" description="历史遥测仍保留原模型版本；请先确认设备编号和目标版本。" type="info" :closable="false" show-icon /><el-form label-position="top" class="binding-form"><el-form-item label="目标模型版本"><el-select v-model="assignVersion" placeholder="选择已发布版本" style="width:100%"><el-option v-for="model in publishedModels" :key="model.version" :label="`v${model.version}`" :value="model.version" /></el-select></el-form-item><el-form-item label="设备编号"><el-input v-model="deviceNo" placeholder="输入设备编号" @keyup.enter="assign" /></el-form-item><el-button v-if="canManage" type="primary" color="var(--teal)" :disabled="!publishedModels.length" @click="assign">绑定模型</el-button><p v-if="!canManage" class="product-detail-muted">当前角色只有读取权限，模型绑定由组织管理员执行。</p><p v-else-if="!publishedModels.length" class="product-detail-muted">请先发布一个模型版本，才能绑定设备。</p></el-form></el-tab-pane>
          </el-tabs></template><el-empty v-else description="从左侧选择产品" /></section>
      </div>
    </section>
    <el-dialog v-model="createProductDialog" title="创建产品" width="460px"><el-form label-position="top"><el-form-item label="产品名称" required><el-input v-model="productName" placeholder="例如：循环水泵控制器" @keyup.enter="saveProduct" /></el-form-item></el-form><template #footer><el-button @click="createProductDialog = false">取消</el-button><el-button type="primary" color="var(--teal)" :loading="saving" @click="saveProduct">确认创建</el-button></template></el-dialog>
    <el-dialog v-model="createModelDialog" title="新建模型版本" width="720px"><p class="product-detail-muted">新版本会保留旧版本历史。字段标识、类型和单位一旦发布不可覆盖。</p><div class="toolbar model-field-form"><el-input v-model="fieldForm.identifier" placeholder="字段标识，例如 mode" /><el-select v-model="fieldForm.type" style="width:130px"><el-option label="数值" value="number" /><el-option label="整数" value="integer" /><el-option label="布尔" value="boolean" /><el-option label="文本/枚举" value="string" /></el-select><el-input v-model="fieldForm.unit" placeholder="单位" style="width:100px" /><el-input v-model="fieldForm.min" placeholder="最小值" style="width:90px" /><el-input v-model="fieldForm.max" placeholder="最大值" style="width:90px" /><el-input v-model="fieldForm.enumValues" placeholder="枚举值，用逗号分隔" style="width:180px" /><el-button @click="queueField">加入字段</el-button></div><div class="model-field-options"><el-checkbox v-model="fieldForm.readable">可读</el-checkbox><el-checkbox v-model="fieldForm.writable">可写</el-checkbox><el-checkbox v-model="fieldForm.nullable">允许为空</el-checkbox></div><div v-if="pendingFields.length" class="field-draft">待加入：<span v-for="field in pendingFields" :key="field.identifier" class="draft-chip">{{ field.identifier }} <button type="button" :aria-label="`移除 ${field.identifier}`" @click="removePending(field.identifier)">×</button></span></div><el-empty v-else description="还没有待提交字段" :image-size="70" /><template #footer><el-button @click="createModelDialog = false">取消</el-button><el-button type="primary" color="var(--teal)" :loading="saving" @click="saveModel">创建版本</el-button></template></el-dialog>
  </div>
</template>
