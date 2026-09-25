<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { demoMode } from '@/api/admin'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: demoMode ? 'admin' : '', password: demoMode ? 'admin123' : '' })
const rules: FormRules = {
  username: [{ required: true, message: '请输入管理员用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function submit() {
  if (!await formRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    await router.replace('/dashboard')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally { loading.value = false }
}
</script>

<template>
  <div class="login-page">
    <section class="login-visual">
      <div class="brand"><div class="brand-mark"><span /><span /><span /></div><div><strong>IoLink</strong><small>智慧水产管理平台</small></div></div>
      <div class="login-radar"><div class="radar-wave" /></div>
      <div class="login-copy">
        <span style="color:#55dfcf;font-size:13px;letter-spacing:2px">AQUACULTURE INTELLIGENCE</span>
        <h1>让每一口池塘<br>都清晰可见</h1>
        <p>统一监测水质、设备在线状态与阈值报警，让异常更早被发现，让现场处置更有依据。</p>
      </div>
    </section>
    <section class="login-form-panel">
      <div class="login-card">
        <h2>欢迎回来</h2><p>登录 IoLink 管理控制台</p>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="submit">
          <el-form-item label="管理员账号" prop="username"><el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" /></el-form-item>
          <el-form-item label="登录密码" prop="password"><el-input v-model="form.password" type="password" show-password autocomplete="current-password" placeholder="请输入密码" /></el-form-item>
          <el-button type="primary" color="#0fae9b" :loading="loading" style="width:100%;margin-top:8px" @click="submit">进入控制台</el-button>
        </el-form>
        <div v-if="demoMode" class="login-demo">演示账号已填入：admin / admin123。切换真实接口请设置 <code>VITE_DEMO_MODE=false</code>。</div>
      </div>
    </section>
  </div>
</template>
