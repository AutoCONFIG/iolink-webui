import { ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/admin'
import { getSession } from '@/api/platform'

const TOKEN_KEY = 'iolink.admin.token'
const EXPIRES_KEY = 'iolink.admin.expires_at'
const PLATFORM_KEY = 'iolink.admin.platform'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const expiresAt = ref(Number(localStorage.getItem(EXPIRES_KEY) ?? 0))
  const platformAdmin = ref(localStorage.getItem(PLATFORM_KEY) === 'true')
  const tenantRole = ref('')
  const tenantId = ref(0)
  const sessionReady = ref(false)
  const isAuthenticated = () => Boolean(token.value) && Date.now() < expiresAt.value

  async function login(username: string, password: string) {
    const result = await loginApi(username, password)
    const nextExpiresAt = Date.now() + result.expiresIn * 1000
    token.value = result.token
    expiresAt.value = nextExpiresAt
    platformAdmin.value = result.platformAdmin
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(EXPIRES_KEY, String(nextExpiresAt))
    localStorage.setItem(PLATFORM_KEY, String(result.platformAdmin))
    sessionReady.value = false
  }

  async function resolveSession() {
    if (sessionReady.value) return
    const session = await getSession()
    platformAdmin.value = session.platform_admin
    tenantRole.value = session.tenant_role
    tenantId.value = session.tenant_id
    sessionReady.value = true
    localStorage.setItem(PLATFORM_KEY, String(session.platform_admin))
  }

  function logout() {
    token.value = ''
    expiresAt.value = 0
    platformAdmin.value = false
    tenantRole.value = ''
    tenantId.value = 0
    sessionReady.value = false
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    localStorage.removeItem(PLATFORM_KEY)
  }

  return { token, expiresAt, platformAdmin, tenantRole, tenantId, isAuthenticated, login, logout, resolveSession }
})
