<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
function loginAgain() { auth.logout(); router.replace('/login') }
</script>

<template>
  <section class="surface">
    <div class="surface-head"><h2>等待组织授权</h2></div>
    <div class="surface-body">
      <p>账号已注册，请联系平台管理员分配组织和角色。授权后重新登录，即可进入自己的业务看板。</p>
      <el-button type="primary" @click="loginAgain">重新登录</el-button>
    </div>
  </section>
</template>
