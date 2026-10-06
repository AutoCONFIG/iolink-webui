import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true, title: '登录' } },
  {
    path: '/', component: () => import('@/layouts/AdminLayout.vue'), redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '运营总览' } },
      { path: 'ponds', component: () => import('@/views/PondsView.vue'), meta: { title: '养殖场与池塘' } },
      { path: 'devices', component: () => import('@/views/DevicesView.vue'), meta: { title: '设备管理' } },
      { path: 'products', component: () => import('@/views/ProductsView.vue'), meta: { title: '产品与物模型' } },
      { path: 'alarms/rules', component: () => import('@/views/RulesView.vue'), meta: { title: '报警规则' } },
      { path: 'alarm-rules', redirect: '/alarms/rules' },
      { path: 'alarms', component: () => import('@/views/AlarmsView.vue'), meta: { title: '报警中心' } },
      { path: 'system', component: () => import('@/views/SystemView.vue'), meta: { title: '系统设置' } },
      { path: 'api-keys/audit', component: () => import('@/views/APIKeyAuditView.vue'), meta: { title: '开放平台日志' } },
      { path: 'tenants', component: () => import('@/views/TenantsView.vue'), meta: { title: '组织与成员' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

export const router = createRouter({ history: createWebHistory('/'), routes })

router.beforeEach((to) => {
  const auth = useAuthStore()
  document.title = `${String(to.meta.title ?? '管理平台')} · IoLink`
  if (!to.meta.public && !auth.isAuthenticated()) return '/login'
  if (to.path === '/login' && auth.isAuthenticated()) return '/dashboard'
})
