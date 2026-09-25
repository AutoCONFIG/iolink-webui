import axios from 'axios'

export const http = axios.create({ baseURL: '/admin/v1', timeout: 10_000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('iolink.admin.token')
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = String(error?.config?.url ?? '')
    const isCredentialCheck = requestPath.endsWith('/password')
    if (error?.response?.status === 401 && !isCredentialCheck) {
      localStorage.removeItem('iolink.admin.token')
      localStorage.removeItem('iolink.admin.expires_at')
      if (location.pathname !== '/login') location.assign('/login')
    }
    const message = error?.response?.data?.error || error?.message || '请求失败，请稍后重试'
    return Promise.reject(new Error(message))
  },
)
