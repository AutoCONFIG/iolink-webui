<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getTenantMembers, getTenants, updateTenantMember } from '@/api/admin'
import type { Tenant, TenantMember } from '@/types/api'

const tenants = ref<Tenant[]>([])
const members = ref<TenantMember[]>([])
const selected = ref<Tenant | null>(null)
const loading = ref(false)
const saving = ref<number | null>(null)

async function loadMembers(tenant: Tenant) {
  selected.value = tenant
  try { members.value = await getTenantMembers(tenant.id) } catch (error) { ElMessage.error(error instanceof Error ? error.message : '成员加载失败') }
}
async function load() {
  loading.value = true
  try { tenants.value = await getTenants(); if (tenants.value[0]) await loadMembers(tenants.value[0]) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '组织加载失败') }
  finally { loading.value = false }
}
async function saveMember(member: TenantMember) {
  if (!selected.value || !member.name) return
  const id = Number(member.userId)
  if (!Number.isFinite(id)) { ElMessage.warning('当前成员缺少可编辑的用户编号'); return }
  saving.value = id
  try { await updateTenantMember(selected.value.id, id, member.role, member.active !== false, member.expiresAt ?? undefined); ElMessage.success('成员权限已更新') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '成员更新失败') }
  finally { saving.value = null }
}
onMounted(load)
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>组织与成员</h2><p>切换组织并维护成员角色、启停状态和支持授权期限。</p></div></div>
    <div class="settings-grid" v-loading="loading">
      <section class="surface"><div class="surface-head"><h3>组织</h3></div><div class="surface-body">
        <el-empty v-if="!tenants.length" description="暂无组织" />
        <button v-for="tenant in tenants" :key="tenant.id" class="product-row" :class="{ selected: selected?.id === tenant.id }" @click="loadMembers(tenant)">
          <span><strong>{{ tenant.name }}</strong><small>#{{ tenant.id }}</small></span><el-tag :type="tenant.active ? 'success' : 'danger'">{{ tenant.active ? '已启用' : '已停用' }}</el-tag>
        </button>
      </div></section>
      <section class="surface"><div class="surface-head"><div><h3>{{ selected?.name ?? '选择组织' }}</h3><small>角色变更会使旧权限版本失效</small></div></div><div class="surface-body">
        <el-empty v-if="!selected" description="选择组织查看成员" />
        <el-table v-else :data="members" stripe><el-table-column prop="name" label="成员" /><el-table-column label="角色" width="180"><template #default="scope"><el-select v-model="scope.row.role" size="small"><el-option v-for="role in ['owner','admin','member','viewer','support']" :key="role" :label="role" :value="role" /></el-select></template></el-table-column><el-table-column label="支持到期" width="210"><template #default="scope"><el-date-picker v-model="scope.row.expiresAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" format="YYYY-MM-DD HH:mm" placeholder="支持角色必填" size="small" /></template></el-table-column><el-table-column label="状态" width="120"><template #default="scope"><el-switch v-model="scope.row.active" /></template></el-table-column><el-table-column label="操作" width="110"><template #default="scope"><el-button link type="primary" :loading="saving !== null" @click="saveMember(scope.row)">保存</el-button></template></el-table-column></el-table>
      </div></section>
    </div>
  </div>
</template>

<style scoped>
.product-row { display: flex; align-items: center; width: 100%; justify-content: space-between; border: 0; border-radius: 10px; background: transparent; color: var(--ink); cursor: pointer; padding: 12px; text-align: left; }
.product-row:hover, .product-row.selected { background: var(--teal-soft); }
.product-row span { display: grid; gap: 4px; }
.product-row small { color: var(--muted); }
</style>
