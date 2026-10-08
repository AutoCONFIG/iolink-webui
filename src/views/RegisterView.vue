<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '@/api/platform'
import VersionLabel from '@/components/VersionLabel.vue'
const router = useRouter()
const form = reactive({ username: '', password: '', confirm: '' })
const saving = ref(false)
const errorMessage = ref('')
async function submit() {
  if (saving.value) return
  if (form.password !== form.confirm) { errorMessage.value = '两次输入的密码不一致'; return }
  saving.value = true
  errorMessage.value = ''
  try { await registerUser(form.username, form.password); form.password = ''; form.confirm = ''; await router.replace('/login') }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '注册失败' }
  finally { saving.value = false }
}
</script>

<template>
  <main class="setup-page">
    <section class="surface setup-card">
      <span class="setup-brand">IoLink · <VersionLabel /></span><h1>注册业务账号</h1>
      <p class="setup-intro">创建自己的账号，组织和权限由平台管理员设置。</p>
      <form class="setup-form" @submit.prevent="submit">
        <label for="register-user">账号</label><input id="register-user" v-model="form.username" autocomplete="username" required maxlength="64" :disabled="saving" />
        <label for="register-password">密码</label><input id="register-password" v-model="form.password" type="password" autocomplete="new-password" required minlength="12" maxlength="256" :disabled="saving" />
        <label for="register-confirm">确认密码</label><input id="register-confirm" v-model="form.confirm" type="password" autocomplete="new-password" required minlength="12" maxlength="256" :disabled="saving" />
        <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
        <el-button type="primary" native-type="submit" :loading="saving">注册</el-button>
        <router-link to="/login">已有账号，前往登录</router-link>
      </form>
    </section>
  </main>
</template>
