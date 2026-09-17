<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword, demoMode } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
async function submit() {
  if (!form.oldPassword || form.newPassword.length < 8) return ElMessage.warning('请填写旧密码，新密码至少 8 位')
  if (form.newPassword !== form.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  loading.value = true
  try { await changePassword(form.oldPassword, form.newPassword); ElMessage.success(demoMode ? '演示模式：表单校验通过' : '密码已修改，请重新登录'); if (!demoMode) { auth.logout(); await router.replace('/login') } }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '修改失败') }
  finally { loading.value = false }
}
</script>

<template>
  <div class="page-stack">
    <div class="page-intro"><div><h2>系统设置</h2><p>维护管理员登录安全与部署接入信息。</p></div></div>
    <div class="settings-grid">
      <section class="surface"><div class="surface-head"><h3>修改管理员密码</h3></div><div class="surface-body"><el-form label-position="top" style="max-width:440px"><el-form-item label="当前密码" required><el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item><el-form-item label="新密码" required><el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" placeholder="至少 8 位" /></el-form-item><el-form-item label="确认新密码" required><el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item><el-button type="primary" color="#0fae9b" :loading="loading" @click="submit">更新密码</el-button></el-form></div></section>
      <aside class="info-panel"><h3>生产环境接入提示</h3><p>前端通过相对路径 <code>/admin/v1</code> 调用接口，构建产物复制到 <code>web/admin/dist</code> 后，由 Go 的 <code>go:embed</code> 编进 iolinkd。</p><ul><li>公网只开放 HTTPS 443 与 MQTTS 8883</li><li>首次部署立即替换默认管理员密码</li><li>正式环境设置强随机 IOLINK_SECRET_KEY</li><li>不要把 /metrics 直接暴露到公网</li></ul></aside>
    </div>
  </div>
</template>
