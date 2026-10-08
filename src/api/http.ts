import axios, { type AxiosInstance } from 'axios'

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 10_000 })
  client.interceptors.request.use((config) => {
  const token = localStorage.getItem('iolink.admin.token')
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
  })

  client.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = String(error?.config?.url ?? '')
    const isCredentialCheck = requestPath.endsWith('/password')
    if (error?.response?.status === 401 && !isCredentialCheck) {
      localStorage.removeItem('iolink.admin.token')
      localStorage.removeItem('iolink.admin.expires_at')
      localStorage.removeItem('iolink.admin.platform')
      if (location.pathname !== '/login') location.assign('/login')
    }
    const message = error?.response?.data?.error || error?.message || '请求失败，请稍后重试'
    return Promise.reject(new Error(message))
  },
  )
  return client
}

export const http = createClient('/admin/v1')
export const userHttp = createClient('/user/v1')
