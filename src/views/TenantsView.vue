<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getTenantMembers, getTenants, updateTenantMember } from '@/api/admin'
import { formatSupportExpiry, parseSupportExpiry } from '@/domain/supportExpiry'
import type { Tenant, TenantMember } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { createTenant, getPlatformUsers, setTenantActive } from '@/api/platform'

const tenants = ref<Tenant[]>([])
type MemberDraft = TenantMember & { expiresAtShanghai: string | null; originalExpiresAtShanghai: string | null }
const members = ref<MemberDraft[]>([])
const selected = ref<Tenant | null>(null)
const loading = ref(false)
const saving = ref<number | null>(null)
const auth = useAuthStore()
const creating = ref(false)
const tenantName = ref('')
const users = ref<Awaited<ReturnType<typeof getPlatformUsers>>>([])
const selectedUser = ref<number>()
const memberRole = ref('member')
const assigning = ref(false)
const searchingUsers = ref(false)
async function searchUsers(query: string) {
  searchingUsers.value = true
  try { users.value = await getPlatformUsers(query) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '用户搜索失败') }
  finally { searchingUsers.value = false }
}

async function loadMembers(tenant: Tenant) {
  selected.value = tenant
  members.value = []
  if (!auth.platformAdmin && !['owner', 'admin'].includes(auth.tenantRole)) return
  try {
    const loaded = await getTenantMembers(tenant.id)
    const drafts: MemberDraft[] = []
    for (const member of loaded) {
      const expiry = formatSupportExpiry(member.expiresAt)
      if (!expiry.ok) { ElMessage.error('成员到期时间格式错误，请刷新重试'); return }
      drafts.push({ ...member, expiresAtShanghai: expiry.value, originalExpiresAtShanghai: expiry.value })
    }
    members.value = drafts
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '成员加载失败') }
}
async function load() {
  loading.value = true
  try {
    tenants.value = await getTenants()
    if (auth.platformAdmin) users.value = await getPlatformUsers()
    if (tenants.value[0]) await loadMembers(tenants.value[0])
  }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '组织加载失败') }
  finally { loading.value = false }
}
async function saveMember(member: MemberDraft) {
  if (!selected.value || !member.name) return
  const id = Number(member.userId)
  if (!Number.isFinite(id)) { ElMessage.warning('当前成员缺少可编辑的用户编号'); return }
  const expiry = parseSupportExpiry(member.expiresAtShanghai)
  if (!expiry.ok) { ElMessage.warning('请输入有效的上海时间，格式为 YYYY-MM-DD HH:mm:ss'); return }
  const expiresAt = member.expiresAtShanghai === member.originalExpiresAtShanghai ? member.expiresAt : expiry.value
  saving.value = id
  try {
    await updateTenantMember(selected.value.id, id, member.role, member.active !== false, expiresAt ?? undefined)
    member.expiresAt = expiresAt
    member.originalExpiresAtShanghai = member.expiresAtShanghai
    ElMessage.success('成员权限已更新')
  }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '成员更新失败') }
  finally { saving.value = null }
}
onMounted(load)
async function addTenant() {
  const name = tenantName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try { await createTenant(name); tenantName.value = ''; await load(); ElMessage.success('组织已创建') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '组织创建失败') }
  finally { creating.value = false }
}
async function assignUser() {
  if (!selected.value || !selectedUser.value || assigning.value) return
  assigning.value = true
  try { await updateTenantMember(selected.value.id, selectedUser.value, memberRole.value, true); await loadMembers(selected.value); ElMessage.success('用户已加入组织'); selectedUser.value = undefined }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '分配失败') }
  finally { assigning.value = false }
}
async function toggleTenant() {
  if (!selected.value || assigning.value) return
  assigning.value = true
  try { await setTenantActive(selected.value.id, !selected.value.active); selected.value.active = !selected.value.active; ElMessage.success('组织状态已更新') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '更新失败') }
  finally { assigning.value = false }
}
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>{{ auth.platformAdmin ? '组织与成员' : '我的组织' }}</h2><p>{{ auth.platformAdmin ? '平台管理员创建组织，并为已注册用户分配角色。' : '查看当前用户所属组织和成员权限。' }}</p></div><el-form v-if="auth.platformAdmin" inline @submit.prevent="addTenant"><el-input v-model="tenantName" placeholder="新组织名称" maxlength="128" /><el-button type="primary" :loading="creating" :disabled="!tenantName.trim()" @click="addTenant">创建组织</el-button></el-form></div>
    <div class="settings-grid" v-loading="loading">
      <section class="surface"><div class="surface-head"><h3>组织</h3></div><div class="surface-body">
        <el-empty v-if="!tenants.length" description="暂无组织" />
        <button v-for="tenant in tenants" :key="tenant.id" class="product-row" :class="{ selected: selected?.id === tenant.id }" @click="loadMembers(tenant)">
          <span><strong>{{ tenant.name }}</strong><small>#{{ tenant.id }}</small></span><el-tag :type="tenant.active ? 'success' : 'danger'">{{ tenant.active ? '已启用' : '已停用' }}</el-tag>
        </button>
      </div></section>
      <section class="surface"><div class="surface-head"><div><h3>{{ selected?.name ?? '选择组织' }}</h3><small>授权更新后，用户需重新登录</small></div><el-button v-if="auth.platformAdmin && selected" :loading="assigning" @click="toggleTenant">{{ selected.active ? '停用组织' : '启用组织' }}</el-button></div><div class="surface-body">
        <el-form v-if="auth.platformAdmin && selected" inline @submit.prevent="assignUser">
          <el-select v-model="selectedUser" filterable remote :remote-method="searchUsers" :loading="searchingUsers" placeholder="搜索账号、昵称或用户编号" style="min-width:200px"><el-option v-for="user in users" :key="user.id" :value="user.id" :label="user.username || user.name || '用户 #' + user.id" /></el-select>
          <el-select v-model="memberRole" style="width:120px"><el-option v-for="role in ['owner','admin','member','viewer']" :key="role" :value="role" :label="role" /></el-select>
          <el-button type="primary" :loading="assigning" :disabled="!selectedUser" @click="assignUser">分配用户</el-button>
        </el-form>
        <p v-if="auth.platformAdmin" class="muted">每次搜索显示前 200 个注册用户，可输入账号或编号定位用户。</p>
        <p v-if="!auth.platformAdmin && !['owner','admin'].includes(auth.tenantRole)">当前角色：{{ auth.tenantRole }}。成员权限由组织管理员维护。</p>
        <el-empty v-if="!selected" description="选择组织查看成员" />
        <el-table v-else :data="members" stripe><el-table-column prop="name" label="成员" /><el-table-column label="角色" width="180"><template #default="scope"><el-select v-model="scope.row.role" size="small"><el-option v-for="role in (auth.platformAdmin ? ['owner','admin','member','viewer'] : ['owner','admin','member','viewer','support'])" :key="role" :label="role" :value="role" /></el-select></template></el-table-column><el-table-column label="支持到期（上海时间）" width="210"><template #default="scope"><el-date-picker v-model="scope.row.expiresAtShanghai" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :show-now="false" format="YYYY-MM-DD HH:mm:ss" placeholder="支持角色必填" size="small" /></template></el-table-column><el-table-column label="状态" width="120"><template #default="scope"><el-switch v-model="scope.row.active" /></template></el-table-column><el-table-column label="操作" width="110"><template #default="scope"><el-button link type="primary" :loading="saving !== null" @click="saveMember(scope.row)">保存</el-button></template></el-table-column></el-table>
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
