import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSetupStatus } from '@/api/setup'
import { demoMode } from '@/api/admin'

const routes = [
  { path: '/setup', component: () => import('@/views/SetupView.vue'), meta: { public: true, title: '初始化配置' } },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true, title: '登录' } },
  { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { public: true, title: '注册' } },
  {
    path: '/', component: () => import('@/layouts/AdminLayout.vue'), redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '运营总览' } },
      { path: 'pending', component: () => import('@/views/PendingView.vue'), meta: { title: '账号状态' } },
      { path: 'ponds', component: () => import('@/views/PondsView.vue'), meta: { title: '养殖场与池塘', tenant: true } },
      { path: 'devices', component: () => import('@/views/DevicesView.vue'), meta: { title: '设备管理', tenant: true } },
      { path: 'products', component: () => import('@/views/ProductsView.vue'), meta: { title: '产品与物模型', tenant: true } },
      { path: 'alarms/rules', component: () => import('@/views/RulesView.vue'), meta: { title: '报警规则', tenant: true } },
      { path: 'alarm-rules', redirect: '/alarms/rules' },
      { path: 'alarms', component: () => import('@/views/AlarmsView.vue'), meta: { title: '报警中心', tenant: true } },
      { path: 'system', component: () => import('@/views/SystemView.vue'), meta: { title: '系统设置' } },
      { path: 'api-keys/audit', component: () => import('@/views/APIKeyAuditView.vue'), meta: { title: '开放平台日志', tenant: true, tenantAdmin: true } },
      { path: 'tenants', component: () => import('@/views/TenantsView.vue'), meta: { title: '组织与成员' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

export const router = createRouter({ history: createWebHistory('/'), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  document.title = `${String(to.meta.title ?? '管理平台')} · IoLink`
  if (!demoMode) {
    try {
      const status = await getSetupStatus()
      if (status.required) return to.path === '/setup' ? true : '/setup'
      if (to.path === '/setup') return '/login'
    } catch (error) {
      if (!(error instanceof Error)) throw error
      return to.path === '/setup' ? true : '/setup'
    }
  }
  if (!to.meta.public && !auth.isAuthenticated()) return '/login'
  if (auth.isAuthenticated()) {
    try { await auth.resolveSession() }
    catch { auth.logout(); return '/login' }
  }
  if (!to.meta.public && auth.platformAdmin && to.meta.tenant) return '/tenants'
  if (!to.meta.public && !auth.platformAdmin && auth.tenantId === 0 && !['/pending', '/system'].includes(to.path)) return '/pending'
  if (to.path === '/pending' && (auth.platformAdmin || auth.tenantId > 0)) return '/dashboard'
  if (to.meta.tenantAdmin && !['owner', 'admin'].includes(auth.tenantRole)) return '/dashboard'
  if (to.path === '/login' && auth.isAuthenticated()) return '/dashboard'
})
