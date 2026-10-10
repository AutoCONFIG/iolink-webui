import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

const status = {
  state: 'valid', deployment_id: 'test-installation', license_id: 'test-license', key_id: 'test-key',
  issued_at: '2026-01-01T00:00:00Z', not_before: '2026-01-02T00:00:00Z', expires_at: '2099-01-01T00:00:00Z',
  max_devices: 5, used_devices: 2, overage: 0, features: ['video', 'openapi'], payload_sha256: 'a'.repeat(64),
} as const

async function authenticate(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('iolink.admin.token', 'synthetic-browser-test-token')
    localStorage.setItem('iolink.admin.expires_at', String(Date.now() + 3600_000))
  })
}

async function capture(page: Page, info: TestInfo, name: string) {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true, animations: 'disabled' })
  }
}

for (const state of ['valid', 'permanent', 'overage', 'missing', 'expired', 'clock_error']) {
  test(`License ${state} renders signed details`, async ({ page }, info) => {
    await authenticate(page)
    await page.route('**/admin/v1/license', route => route.fulfill({ json: {
      ...status, state, expires_at: state === 'permanent' || state === 'missing' ? null : status.expires_at,
      used_devices: state === 'overage' ? 7 : 2, overage: state === 'overage' ? 2 : 0,
      ...(state === 'missing' ? { license_id: null, key_id: null, issued_at: null, not_before: null, features: [], payload_sha256: null, max_devices: 0 } : {}),
    } }))
    await page.goto('/system')
    const panel = page.getByRole('region', { name: '系统授权' })
    await expect(panel.locator('strong')).toHaveText(state)
    await expect(panel.getByText('test-installation')).toBeVisible()
    if (state === 'missing') await expect(panel.getByText(/尚未导入 License/)).toBeVisible()
    if (state === 'overage') await expect(panel.getByText(/超额 2/)).toBeVisible()
    await capture(page, info, state)
  })
}

test('403 hides import and status', async ({ page }, info) => {
  await authenticate(page)
  await page.route('**/admin/v1/license', route => route.fulfill({ status: 403, json: { error: 'forbidden' } }))
  await page.goto('/system')
  await expect(page.getByRole('alert')).toContainText('当前账号无权管理系统授权')
  await expect(page.getByRole('button', { name: '导入 License' })).toHaveCount(0)
  await capture(page, info, 'forbidden')
})

test('load failure retries; rejected raw upload retains license and prevents duplicate submit', async ({ page }, info) => {
  await authenticate(page)
  let reads = 0
  let uploads = 0
  const raw = '{ "payload_b64": "YQ==", "signature_b64": "Yg==" }\n'
  let releaseUpload: () => void = () => { throw new Error('upload did not begin') }
  const waiting = new Promise<void>(resolve => { releaseUpload = resolve })
  await page.route('**/admin/v1/license', async route => {
    if (route.request().method() === 'POST') {
      uploads++
      expect(route.request().postData()).toBe(raw)
      await waiting
      await route.fulfill({ status: 400, json: { error: 'license_signature_invalid' } })
      return
    }
    reads++
    await route.fulfill(reads === 1 ? { status: 500, json: { error: 'internal_error' } } : { json: status })
  })
  await page.goto('/system')
  await expect(page.getByRole('alert')).toContainText('internal_error')
  await capture(page, info, 'load-error')
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByText('test-license', { exact: true })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'license.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
  await page.getByRole('button', { name: '导入 License' }).click()
  await expect.poll(() => uploads).toBe(1)
  await expect(page.locator('input[type=file]')).toBeDisabled()
  await capture(page, info, 'upload-pending')
  releaseUpload()
  await expect(page.getByText('license_signature_invalid', { exact: true })).toBeVisible()
  await expect(page.getByText('test-license', { exact: true })).toBeVisible()
  expect(uploads).toBe(1)
  await capture(page, info, 'upload-rejected')
})

test('server 401 returns to login', async ({ page }) => {
  await authenticate(page)
  await page.route('**/admin/v1/license', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }))
  await page.goto('/system')
  await expect(page).toHaveURL(/\/login$/)
})

test('device disable releases action and restore reports quota before succeeding', async ({ page }, info) => {
  await authenticate(page)
  let disabledAt: string | null = null
  let denied = true
  let deletions = 0
  let restores = 0
  await page.route('**/user/v1/ponds', route => route.fulfill({ json: [{ id: 1, farm_id: 1, name: '测试池塘', area_mu: 1 }] }))
  await page.route('**/user/v1/devices?*', route => {
    const params = new URL(route.request().url()).searchParams
    expect(params.get('status')).toBeTruthy()
    return route.fulfill({ json: { list: [{ id: 1, pond_id: 1, device_no: 'test-device', model: 'water', status: 'offline', disabled_at: disabledAt, last_seen_at: null }], total: 1, page: Number(params.get('page') ?? 1), page_size: Number(params.get('page_size') ?? 20) } })
  })
  await page.route('**/user/v1/devices/test-device', async route => {
    expect(route.request().method()).toBe('DELETE')
    deletions++
    disabledAt = '2026-10-05T00:00:00Z'
    await route.fulfill({ status: 204 })
  })
  await page.route('**/user/v1/devices/test-device/restore', async route => {
    restores++
    if (denied) { await route.fulfill({ status: 403, json: { error: 'device_quota_exceeded' } }); return }
    disabledAt = null
    await route.fulfill({ status: 204 })
  })
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/devices')
  const row = page.getByRole('row', { name: /test-device/ })
  await row.getByRole('button', { name: '停用' }).click()
  await expect(row.getByRole('button', { name: '恢复' })).toBeVisible()
  await capture(page, info, 'device-disabled')
  await page.getByText('全部有效设备', { exact: true }).click()
  await page.getByRole('option', { name: '已停用', exact: true }).click()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: '恢复' }).click()
  await expect(page.getByText('device_quota_exceeded', { exact: true })).toBeVisible()
  await expect(row.getByRole('button', { name: '恢复' })).toBeVisible()
  await capture(page, info, 'device-quota-denied')
  denied = false
  await row.getByRole('button', { name: '恢复' }).click()
  await expect(page.getByText('设备已恢复', { exact: true })).toBeVisible()
  await expect(row).toHaveCount(0)
  expect(deletions).toBe(1)
  expect(restores).toBe(2)
})

test('license loading keeps import disabled', async ({ page }, info) => {
  await authenticate(page)
  let release: () => void = () => { throw new Error('loading request not started') }
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route('**/admin/v1/license', async route => { await waiting; await route.fulfill({ json: status }) })
  await page.goto('/system')
  const panel = page.getByRole('region', { name: '系统授权' })
  await expect(panel.locator('.el-loading-mask')).toBeVisible()
  await expect(panel.getByRole('button', { name: '导入 License' })).toBeDisabled()
  await capture(page, info, 'loading')
  release()
  await expect(page.getByText('test-license', { exact: true })).toBeVisible()
})
