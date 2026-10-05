<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword, createAPIKey, demoMode, getAPIKeys, getLicense, importLicense, revokeAPIKey, rotateAPIKey } from '@/api/admin'
import type { APIKey, LicenseStatus } from '@/types/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const license = ref<LicenseStatus | null>(null)
const licenseFile = ref<File | null>(null)
const licenseLoading = ref(false)
const importing = ref(false)
const licenseError = ref('')
const licenseForbidden = ref(false)
const apiKeys = ref<APIKey[]>([])
const apiKeyLoading = ref(false)
const apiKeyForm = reactive({ name: '', scopes: ['ponds:read', 'devices:read', 'alarms:read'] })
const issuedSecret = ref('')
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
async function submit() {
  if (!form.oldPassword || form.newPassword.length < 8) return ElMessage.warning('请填写旧密码，新密码至少 8 位')
  if (form.newPassword !== form.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  loading.value = true
  try { await changePassword(form.oldPassword, form.newPassword); ElMessage.success(demoMode ? '演示模式：表单校验通过' : '密码已修改，请重新登录'); if (!demoMode) { auth.logout(); await router.replace('/login') } }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '修改失败') }
  finally { loading.value = false }
}
async function loadLicense() {
  licenseLoading.value = true
  licenseError.value = ''
  licenseForbidden.value = false
  try { license.value = await getLicense() }
  catch (error) {
    licenseError.value = error instanceof Error ? error.message : '授权状态加载失败'
    licenseForbidden.value = licenseError.value === 'forbidden'
    if (licenseForbidden.value) license.value = null
  }
  finally { licenseLoading.value = false }
}
async function uploadLicense() {
  if (!licenseFile.value || importing.value) return
  importing.value = true
  try { await importLicense(licenseFile.value); licenseFile.value = null; ElMessage.success('License 已导入'); await loadLicense() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : 'License 导入失败') }
  finally { importing.value = false }
}
function onLicenseFile(event: Event) {
  if (event.target instanceof HTMLInputElement) licenseFile.value = event.target.files?.[0] ?? null
}
loadLicense()
async function loadAPIKeys() { apiKeyLoading.value = true; try { apiKeys.value = await getAPIKeys() } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'API Key 加载失败') } finally { apiKeyLoading.value = false } }
async function issueAPIKey() { if (!apiKeyForm.name.trim()) return ElMessage.warning('请输入 Key 名称'); try { const result = await createAPIKey({ name: apiKeyForm.name.trim(), scopes: apiKeyForm.scopes }); issuedSecret.value = result.secret; apiKeyForm.name = ''; await loadAPIKeys() } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'API Key 创建失败') } }
async function rotate(key: APIKey) { try { const result = await rotateAPIKey(key.keyId); issuedSecret.value = result.secret; await loadAPIKeys() } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'API Key 轮换失败') } }
async function revoke(key: APIKey) { try { await revokeAPIKey(key.keyId); await loadAPIKeys() } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'API Key 撤销失败') } }
loadAPIKeys()
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>系统设置</h2><p>维护管理员登录安全与部署接入信息。</p></div></div>
    <div class="settings-grid">
      <section v-loading="licenseLoading" class="surface" aria-label="系统授权">
        <div class="surface-head"><h3>系统授权</h3></div>
        <div class="surface-body">
          <p v-if="licenseForbidden" role="alert">当前账号无权管理系统授权，请使用平台管理员账号。</p>
          <div v-else-if="licenseError" role="alert"><p>授权状态加载失败：{{ licenseError }}</p><el-button @click="loadLicense">重试</el-button></div>
          <template v-if="!licenseForbidden">
            <p v-if="license?.state === 'missing'" class="muted">尚未导入 License，新增和恢复设备需要有效授权。</p>
            <dl v-if="license" class="license-state">
              <div><dt>状态</dt><dd><strong>{{ license.state }}</strong></dd></div>
              <div><dt>实例</dt><dd>{{ license.deploymentId }}</dd></div>
              <div><dt>使用额度</dt><dd>{{ license.usedDevices }}/{{ license.maxDevices }}<span v-if="license.overage">（超额 {{ license.overage }}）</span></dd></div>
              <div><dt>License</dt><dd>{{ license.licenseId ?? '未导入' }}</dd></div>
              <div><dt>签发时间</dt><dd>{{ license.issuedAt ? new Date(license.issuedAt).toLocaleString('zh-CN') : '--' }}</dd></div>
              <div><dt>生效时间</dt><dd>{{ license.notBefore ? new Date(license.notBefore).toLocaleString('zh-CN') : '--' }}</dd></div>
              <div><dt>到期时间</dt><dd>{{ license.expiresAt ? new Date(license.expiresAt).toLocaleString('zh-CN') : license.state === 'permanent' || license.state === 'overage' ? '永久' : '--' }}</dd></div>
              <div><dt>摘要</dt><dd>{{ license.payloadSha256 ?? '--' }}</dd></div>
            </dl>
            <p v-if="license?.features.length" class="muted">功能：{{ license.features.join('、') }}</p>
            <label class="license-upload">License 文件<input type="file" accept="application/json,.json" :disabled="importing" @change="onLicenseFile" /></label>
            <el-button type="primary" :loading="importing" :disabled="!licenseFile || licenseLoading" @click="uploadLicense">导入 License</el-button>
          </template>
        </div>
      </section>
      <section class="surface"><div class="surface-head"><h3>修改管理员密码</h3></div><div class="surface-body"><el-form label-position="top" style="max-width:440px"><el-form-item label="当前密码" required><el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item><el-form-item label="新密码" required><el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" placeholder="至少 8 位" /></el-form-item><el-form-item label="确认新密码" required><el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item><el-button type="primary" color="#0fae9b" :loading="loading" @click="submit">更新密码</el-button></el-form></div></section>
      <aside class="info-panel"><h3>部署接入提示</h3><p>管理后台与服务端集成在同一个 iolink 镜像中，可通过部署地址直接访问。</p><ul><li>公网使用 HTTPS 与 MQTTS</li><li>首次部署使用本地向导设置管理员与租户账号</li><li>使用强随机登录签名密钥</li></ul></aside>
      <section v-loading="apiKeyLoading" class="surface" aria-label="开放平台 API Key"><div class="surface-head"><h3>开放平台 API Key</h3></div><div class="surface-body"><el-form inline @submit.prevent="issueAPIKey"><el-input v-model="apiKeyForm.name" placeholder="Key 名称" /><el-button type="primary" @click="issueAPIKey">签发 Key</el-button></el-form><p class="muted">密钥只在签发或轮换后显示一次，请立即保存。</p><el-alert v-if="issuedSecret" title="请复制并安全保存 Secret" type="warning" :closable="false"><code>{{ issuedSecret }}</code></el-alert><el-table :data="apiKeys" style="width:100%;margin-top:16px"><el-table-column prop="name" label="名称" /><el-table-column prop="keyId" label="Key ID" /><el-table-column label="状态"><template #default="{ row }">{{ row.revokedAt ? '已撤销' : '有效' }}</template></el-table-column><el-table-column label="操作" width="180"><template #default="{ row }"><el-button text type="primary" :disabled="!!row.revokedAt" @click="rotate(row)">轮换</el-button><el-button text type="danger" :disabled="!!row.revokedAt" @click="revoke(row)">撤销</el-button></template></el-table-column></el-table></div></section>
    </div>
  </div>
</template>

<style scoped>
.license-state { display: grid; gap: 12px; }
.license-state > div { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 12px; }
.license-state dt, .muted { color: var(--muted); }
.license-state dd { margin: 0; overflow-wrap: anywhere; }
.license-upload { display: grid; gap: 8px; margin-bottom: 16px; }
.license-upload input { min-width: 0; width: 100%; }
</style>
