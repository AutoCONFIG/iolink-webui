<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, DataAnalysis, MapLocation, Monitor, Operation, Setting, Fold, Expand, Goods, OfficeBuilding, Document } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { demoMode } from '@/api/admin'
import VersionLabel from '@/components/VersionLabel.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const collapsed = ref(false)
const title = computed(() => String(route.meta.title ?? '管理平台'))
const nav = computed(() => [
  { path: '/dashboard', label: auth.platformAdmin ? '平台总览' : '运营总览', icon: DataAnalysis, visible: true },
  { path: '/ponds', label: '养殖场与池塘', icon: MapLocation },
  { path: '/devices', label: '设备管理', icon: Monitor },
  { path: '/products', label: '产品与物模型', icon: Goods },
  { path: '/alarms/rules', label: '报警规则', icon: Operation },
  { path: '/alarms', label: '报警中心', icon: Bell },
  { path: '/system', label: '系统设置', icon: Setting },
  { path: '/api-keys/audit', label: '开放平台日志', icon: Document, visible: ['owner', 'admin'].includes(auth.tenantRole) },
  { path: '/tenants', label: auth.platformAdmin ? '组织与成员' : '我的组织', icon: OfficeBuilding, visible: true },
].filter((item) => item.visible !== false && (auth.platformAdmin ? ['/dashboard', '/system', '/tenants'].includes(item.path) : auth.tenantId > 0 || ['/dashboard', '/system'].includes(item.path))))

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
      <div class="sidebar-foot"><span v-if="!collapsed">{{ auth.platformAdmin ? '平台管理空间' : '我的业务空间' }}</span><VersionLabel /></div>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button" :aria-label="collapsed ? '展开导航' : '收起导航'" :aria-expanded="!collapsed" @click="collapsed = !collapsed"><el-icon><component :is="collapsed ? Expand : Fold" /></el-icon></button>
          <div><h1>{{ title }}</h1><p>{{ auth.platformAdmin ? '平台状态、用户与组织管理' : '设备、告警与业务数据' }}</p></div>
        </div>
        <div class="topbar-actions">
          <el-tag v-if="demoMode" effect="dark" color="#0e9f8f">演示数据</el-tag>
          <span class="time-chip">{{ auth.platformAdmin ? '平台管理' : '业务管理' }}</span>
          <el-dropdown @command="logout">
            <button class="profile-button"><span class="avatar">{{ auth.platformAdmin ? '管' : '用' }}</span><span>{{ auth.platformAdmin ? '平台管理员' : '业务用户' }}</span><span>⌄</span></button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>
      <main class="content"><router-view /></main>
    </section>
  </div>
</template>
