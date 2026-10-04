<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword, demoMode, getLicense, importLicense } from '@/api/admin'
import type { LicenseStatus } from '@/types/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const license = ref<LicenseStatus | null>(null)
const licenseFile = ref<File | null>(null)
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
async function submit() {
  if (!form.oldPassword || form.newPassword.length < 8) return ElMessage.warning('请填写旧密码，新密码至少 8 位')
  if (form.newPassword !== form.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  loading.value = true
  try { await changePassword(form.oldPassword, form.newPassword); ElMessage.success(demoMode ? '演示模式：表单校验通过' : '密码已修改，请重新登录'); if (!demoMode) { auth.logout(); await router.replace('/login') } }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '修改失败') }
  finally { loading.value = false }
}
async function loadLicense() { try { license.value = await getLicense() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '授权状态加载失败') } }
async function uploadLicense() { if (!licenseFile.value) return ElMessage.warning('请选择 License 文件'); try { await importLicense(licenseFile.value); licenseFile.value = null; ElMessage.success('License 已导入'); await loadLicense() } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'License 导入失败') } }
function onLicenseFile(event: Event) { licenseFile.value = (event.target as HTMLInputElement).files?.[0] ?? null }
loadLicense()
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>系统设置</h2><p>维护管理员登录安全与部署接入信息。</p></div></div>
    <div class="settings-grid">
      <section class="surface"><div class="surface-head"><h3>系统授权</h3></div><div class="surface-body"><dl v-if="license" class="license-state"><div><dt>状态</dt><dd><strong>{{ license.state }}</strong></dd></div><div><dt>实例</dt><dd>{{ license.deploymentId }}</dd></div><div><dt>使用额度</dt><dd>{{ license.usedDevices }}/{{ license.maxDevices }}<span v-if="license.overage">（超额 {{ license.overage }}）</span></dd></div><div><dt>License</dt><dd>{{ license.licenseId ?? '未导入' }}</dd></div><div><dt>生效时间</dt><dd>{{ license.notBefore ? new Date(license.notBefore).toLocaleString('zh-CN') : '--' }}</dd></div><div><dt>到期时间</dt><dd>{{ license.expiresAt ? new Date(license.expiresAt).toLocaleString('zh-CN') : '永久' }}</dd></div><div><dt>摘要</dt><dd>{{ license.payloadSha256 ?? '--' }}</dd></div></dl><p v-if="license?.features.length" class="muted">功能：{{ license.features.join('、') }}</p><input type="file" accept="application/json,.json" @change="onLicenseFile" /><el-button type="primary" color="#0fae9b" :disabled="!licenseFile" @click="uploadLicense">导入 License</el-button></div></section>
      <section class="surface"><div class="surface-head"><h3>修改管理员密码</h3></div><div class="surface-body"><el-form label-position="top" style="max-width:440px"><el-form-item label="当前密码" required><el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item><el-form-item label="新密码" required><el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" placeholder="至少 8 位" /></el-form-item><el-form-item label="确认新密码" required><el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item><el-button type="primary" color="#0fae9b" :loading="loading" @click="submit">更新密码</el-button></el-form></div></section>
      <aside class="info-panel"><h3>生产环境接入提示</h3><p>前端通过相对路径 <code>/admin/v1</code> 调用接口，构建产物复制到 <code>web/admin/dist</code> 后，由 Go 的 <code>go:embed</code> 编进 iolinkd。</p><ul><li>公网只开放 HTTPS 443 与 MQTTS 8883</li><li>首次部署立即替换默认管理员密码</li><li>正式环境设置强随机 IOLINK_SECRET_KEY</li><li>不要把 /metrics 直接暴露到公网</li></ul></aside>
    </div>
  </div>
</template>
