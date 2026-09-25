import { ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/admin'

const TOKEN_KEY = 'iolink.admin.token'
const EXPIRES_KEY = 'iolink.admin.expires_at'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const expiresAt = ref(Number(localStorage.getItem(EXPIRES_KEY) ?? 0))
  const isAuthenticated = () => Boolean(token.value) && Date.now() < expiresAt.value

  async function login(username: string, password: string) {
    const result = await loginApi(username, password)
    const nextExpiresAt = Date.now() + result.expiresIn * 1000
    token.value = result.token
    expiresAt.value = nextExpiresAt
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(EXPIRES_KEY, String(nextExpiresAt))
  }

  function logout() {
    token.value = ''
    expiresAt.value = 0
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  }

  return { token, expiresAt, isAuthenticated, login, logout }
})
