<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSetupStatus, initializeAdministrator, SetupError } from '@/api/setup'

const router = useRouter()
const state = ref<'checking' | 'required' | 'failed'>('checking')
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({ username: 'operator', password: '', confirm: '', key: '' })

async function checkStatus() {
  state.value = 'checking'
  errorMessage.value = ''
  try {
    const status = await getSetupStatus()
    if (!status.required) { await router.replace('/login'); return }
    state.value = 'required'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法读取初始化状态，请重试'
    state.value = 'failed'
  }
}

async function submit() {
  if (saving.value) return
  if (form.password !== form.confirm) { errorMessage.value = '两次输入的密码不一致'; return }
  saving.value = true
  errorMessage.value = ''
  try {
    await initializeAdministrator(form.username, form.password, form.key)
    form.password = ''; form.confirm = ''; form.key = ''
    await router.replace('/login')
  } catch (error) {
    if (error instanceof SetupError && error.status === 409) {
      form.password = ''; form.confirm = ''; form.key = ''
      await router.replace('/login')
      return
    }
    errorMessage.value = error instanceof Error ? error.message : '初始化失败，请重试'
  } finally { saving.value = false }
}

onMounted(checkStatus)
</script>

<template>
  <main class="setup-page">
    <section class="surface setup-card" aria-labelledby="setup-title">
      <span class="setup-brand">IoLink</span>
      <h1 id="setup-title">初始化配置</h1>
      <p class="setup-intro">首次使用，请设置管理员账号。保存后即可登录管理平台。</p>
      <p v-if="state === 'checking'" role="status">正在检查初始化状态…</p>
      <div v-else-if="state === 'failed'">
        <p role="alert">{{ errorMessage }}</p>
        <el-button type="primary" @click="checkStatus">重新检查</el-button>
      </div>
      <form v-else class="setup-form" @submit.prevent="submit">
        <label for="setup-key">安装密钥</label>
        <input id="setup-key" v-model="form.key" type="password" autocomplete="off" required minlength="32" aria-describedby="setup-key-help" :disabled="saving" />
        <p id="setup-key-help" class="setup-help">填写部署 .env 中的 IOLINK_SECRET_KEY，仅用于验证本次初始化权限。</p>
        <label for="setup-user">管理员账号</label>
        <input id="setup-user" v-model="form.username" autocomplete="username" required maxlength="64" :disabled="saving" />
        <label for="setup-password">管理员密码</label>
        <input id="setup-password" v-model="form.password" type="password" autocomplete="new-password" required minlength="12" maxlength="256" aria-describedby="setup-password-help" :disabled="saving" />
        <p id="setup-password-help" class="setup-help">至少 12 个字符，不含首尾空白。</p>
        <label for="setup-confirm">确认密码</label>
        <input id="setup-confirm" v-model="form.confirm" type="password" autocomplete="new-password" required minlength="12" maxlength="256" :disabled="saving" />
        <p v-if="errorMessage" class="setup-error" role="alert">{{ errorMessage }}</p>
        <el-button type="primary" native-type="submit" :loading="saving">保存并进入登录</el-button>
      </form>
    </section>
  </main>
</template>
