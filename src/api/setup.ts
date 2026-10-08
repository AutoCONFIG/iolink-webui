import axios from 'axios'
import { z } from 'zod'

const setupHTTP = axios.create({ baseURL: '/setup/v1', timeout: 15_000 })
const statusSchema = z.object({ required: z.boolean() }).strict()

export class SetupError extends Error {
  constructor(message: string, readonly status: number = 0) { super(message); this.name = 'SetupError' }
}

function setupError(error: unknown): SetupError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    switch (status) {
      case 400: return new SetupError('账号或密码格式无效，请检查后重试', status)
      case 401: return new SetupError('安装密钥不正确，请核对部署配置', status)
      case 403: return new SetupError('请从本站初始化页面提交', status)
      case 409: return new SetupError('系统已初始化，请前往登录', status)
      default: return new SetupError('无法连接初始化服务，请检查服务状态后重试', status)
    }
  }
  return new SetupError('初始化服务返回异常，请重试')
}

export async function getSetupStatus(): Promise<z.infer<typeof statusSchema>> {
  try {
    const response = await setupHTTP.get<unknown>('/status')
    return statusSchema.parse(response.data)
  } catch (error) { throw setupError(error) }
}

export async function initializeAdministrator(username: string, password: string, key: string): Promise<void> {
  const status = await getSetupStatus()
  if (!status.required) throw new SetupError('系统已初始化，请前往登录', 409)
  try {
    await setupHTTP.post('/initialize', { username, password }, { headers: { 'X-IoLink-Setup-Key': key } })
  } catch (error) {
    const failure = setupError(error)
    if (failure.status === 0 || failure.status >= 500) {
      const current = await getSetupStatus()
      if (!current.required) return
    }
    throw failure
  }
}
