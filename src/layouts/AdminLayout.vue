<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, DataAnalysis, MapLocation, Monitor, Operation, Setting, Fold, Expand } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { demoMode } from '@/api/admin'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const collapsed = ref(false)
const title = computed(() => String(route.meta.title ?? '管理平台'))
const nav = [
  { path: '/dashboard', label: '运营总览', icon: DataAnalysis },
  { path: '/ponds', label: '养殖场与池塘', icon: MapLocation },
  { path: '/devices', label: '设备管理', icon: Monitor },
  { path: '/alarms/rules', label: '报警规则', icon: Operation },
  { path: '/alarms', label: '报警中心', icon: Bell },
  { path: '/system', label: '系统设置', icon: Setting },
]

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="app-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><span /><span /><span /></div>
        <div v-if="!collapsed"><strong>IoLink</strong><small>智慧水产管理平台</small></div>
      </div>
      <nav>
        <router-link v-for="item in nav" :key="item.path" :to="item.path" :aria-label="item.label">
          <el-icon><component :is="item.icon" /></el-icon><span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-foot"><div class="system-dot" /><span v-if="!collapsed">服务状态待后端健康检查</span></div>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button" :aria-label="collapsed ? '展开导航' : '收起导航'" :aria-expanded="!collapsed" @click="collapsed = !collapsed"><el-icon><component :is="collapsed ? Expand : Fold" /></el-icon></button>
          <div><h1>{{ title }}</h1><p>监测水质、设备与报警状态</p></div>
        </div>
        <div class="topbar-actions">
          <el-tag v-if="demoMode" effect="dark" color="#0e9f8f">演示数据</el-tag>
          <span class="time-chip">同源 API · /admin/v1</span>
          <el-dropdown @command="logout">
            <button class="profile-button"><span class="avatar">管</span><span>管理员</span><span>⌄</span></button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>
      <main class="content"><router-view /></main>
    </section>
  </div>
</template>
