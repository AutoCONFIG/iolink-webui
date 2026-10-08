import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import { once } from 'node:events'

afterEach(() => vi.resetModules())

describe('bootstrap HTTP boundary', () => {
  it('decodes status and sends installation credentials only on initialization', async () => {
    const seen: { path: string; key?: string | string[]; body: string }[] = []
    const server = createServer(async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(Buffer.from(chunk))
      seen.push({ path: req.url ?? '', key: req.headers['x-iolink-setup-key'], body: Buffer.concat(chunks).toString() })
      if (req.url === '/setup/v1/status') { res.setHeader('Content-Type', 'application/json'); res.end('{"required":true}') }
      else { res.statusCode = 204; res.end() }
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const addr = server.address()
      if (!addr || typeof addr === 'string') throw new Error('test server unavailable')
      const axios = (await import('axios')).default
      const originalCreate = axios.create.bind(axios)
      vi.spyOn(axios, 'create').mockImplementation(config => originalCreate({ ...config, baseURL: `http://127.0.0.1:${addr.port}/setup/v1` }))
      const api = await import('../src/api/setup')
      expect(await api.getSetupStatus()).toEqual({ required: true })
      await api.initializeAdministrator('operator', 'Operator-test-1234', 'fixture-key')
      expect(seen).toEqual([
        { path: '/setup/v1/status', key: undefined, body: '' },
        { path: '/setup/v1/status', key: undefined, body: '' },
        { path: '/setup/v1/initialize', key: 'fixture-key', body: '{"username":"operator","password":"Operator-test-1234"}' },
      ])
    } finally { vi.restoreAllMocks(); server.close(); await once(server, 'close') }
  })
  it.each([401, 409, 503])('reports safe errors for HTTP %s', async status => {
    const axios = (await import('axios')).default
    vi.spyOn(axios, 'create').mockReturnValue(axios)
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { required: true } })
    vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError('private database secret', undefined, undefined, undefined, {
      status, statusText: 'failure', headers: {}, config: { headers: new axios.AxiosHeaders() }, data: { error: 'private database secret' },
    }))
    try {
      const { initializeAdministrator } = await import('../src/api/setup')
      await expect(initializeAdministrator('operator', 'password', 'key')).rejects.toMatchObject({ status })
      await expect(initializeAdministrator('operator', 'password', 'key')).rejects.not.toThrow('private database secret')
    } finally { vi.restoreAllMocks() }
  })
  it('recognizes a committed initialization when the response is lost', async () => {
    const axios = (await import('axios')).default
    vi.spyOn(axios, 'create').mockReturnValue(axios)
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { required: true } }).mockResolvedValueOnce({ data: { required: false } })
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError('connection lost'))
    try {
      const { initializeAdministrator } = await import('../src/api/setup')
      await expect(initializeAdministrator('operator', 'password', 'key')).resolves.toBeUndefined()
      expect(get).toHaveBeenCalledTimes(2)
      expect(post).toHaveBeenCalledTimes(1)
    } finally { vi.restoreAllMocks() }
  })
  it('blocks another write while initialization status is unavailable', async () => {
    const axios = (await import('axios')).default
    vi.spyOn(axios, 'create').mockReturnValue(axios)
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { required: true } }).mockRejectedValue(new axios.AxiosError('connection lost'))
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError('connection lost'))
    try {
      const { initializeAdministrator } = await import('../src/api/setup')
      await expect(initializeAdministrator('operator', 'password', 'key')).rejects.toMatchObject({ status: 0 })
      await expect(initializeAdministrator('operator', 'password', 'key')).rejects.toMatchObject({ status: 0 })
      expect(post).toHaveBeenCalledTimes(1)
    } finally { vi.restoreAllMocks() }
  })
})
