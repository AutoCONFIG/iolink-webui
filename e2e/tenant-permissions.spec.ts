import { expect, test, type Page } from '@playwright/test'

const device = { id: 1, device_no: 'test-device', pond_id: 1, model: 'water', status: 'offline', report_interval: 60 }

async function authenticate(page: Page, role: string) {
  await page.addInitScript(() => {
    localStorage.setItem('iolink.admin.token', 'synthetic-permission-test-token')
    localStorage.setItem('iolink.admin.expires_at', String(Date.now() + 3600_000))
    localStorage.setItem('iolink.admin.platform', 'false')
  })
  await page.route('**/setup/v1/status', route => route.fulfill({ json: { required: false } }))
  await page.route('**/user/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 403, json: { error: 'tenant action forbidden' } })
      return
    }
    if (path === '/user/v1/session') {
      await route.fulfill({ json: { platform_admin: false, tenant_id: 1, tenant_role: role } })
    } else if (path === '/user/v1/farms') {
      await route.fulfill({ json: [{ id: 1, name: '测试养殖场' }] })
    } else if (path === '/user/v1/ponds') {
      await route.fulfill({ json: [{ id: 1, farm_id: 1, name: '测试池塘' }, { id: 2, farm_id: 1, name: '目标池塘' }] })
    } else if (path === '/user/v1/devices') {
      await route.fulfill({ json: { list: [device], total: 1, page: 1, page_size: 20 } })
    } else if (path === '/user/v1/devices/test-device') {
      await route.fulfill({ json: device })
    } else if (path === '/user/v1/alarm-rules') {
      await route.fulfill({ json: [{ id: 1, pond_id: 1, metric: 'ph', max_value: 8.5, level: 'warning', enabled: true }] })
    } else if (path === '/user/v1/alarms') {
      await route.fulfill({ json: [{ id: 1, device_no: 'test-device', pond_id: 1, metric: 'ph', current_value: 9, threshold: 8.5, level: 'warning', created_at: '2026-10-10T00:00:00Z' }] })
    } else if (path === '/user/v1/products') {
      await route.fulfill({ json: [{ id: 1, tenant_id: 1, name: '测试产品', current_version: 1 }] })
    } else if (path === '/user/v1/products/1/models') {
      await route.fulfill({ json: [{ id: 1, product_id: 1, version: 1, fields: [], published_at: '2026-10-10T00:00:00Z' }] })
    } else {
      await route.fulfill({ status: 404, json: { error: 'unmocked endpoint' } })
    }
  })
}

for (const role of ['member', 'viewer', 'support']) {
  test(`${role} reads business resources without management actions`, async ({ page }, info) => {
    await authenticate(page, role)
    const writes: string[] = []
    page.on('request', request => {
      if (request.url().includes('/user/v1/') && request.method() !== 'GET') writes.push(request.method())
    })
    await page.goto('/ponds')
    await expect(page.getByText('测试池塘', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '新增养殖场' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '新增池塘' })).toHaveCount(0)
    await expect(page.getByText('当前角色仅可查看，请联系组织管理员')).toBeVisible()
    await page.screenshot({ path: info.outputPath(`${role}-ponds.png`), fullPage: true })
    await page.goto('/devices')
    await expect(page.getByRole('button', { name: '注册设备' })).toHaveCount(0)
    await page.getByRole('button', { name: '查看详情' }).click()
    await page.getByRole('tab', { name: '遥测' }).click()
    await expect(page.getByText('设备尚未上报数据')).toBeVisible()
    await page.getByRole('tab', { name: '配置' }).click()
    for (const name of ['调至所选池塘', '停用设备', '恢复设备']) {
      await expect(page.getByRole('button', { name })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: '打开产品与物模型' })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`${role}-device-config.png`), fullPage: true })
    await page.goto('/alarms/rules')
    await expect(page.getByRole('row', { name: /测试池塘/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '新增规则' })).toHaveCount(0)
    await page.goto('/products')
    await page.getByRole('tab', { name: '设备绑定' }).click()
    await expect(page.getByPlaceholder('输入设备编号')).toBeDisabled()
    await expect(page.getByRole('button', { name: '绑定模型' })).toHaveCount(0)
    expect(writes).toEqual([])
  })
}

for (const role of ['owner', 'admin']) {
  test(`${role} retains management forms and reports rejected writes`, async ({ page }) => {
    await authenticate(page, role)
    await page.goto('/ponds')
    await page.getByRole('button', { name: '新增养殖场' }).click()
    const farmDialog = page.getByRole('dialog', { name: '新增养殖场' })
    await farmDialog.getByPlaceholder('例如：东港示范养殖场').fill('新养殖场')
    await farmDialog.getByRole('button', { name: '确认创建' }).click()
    await expect(page.getByText('tenant action forbidden', { exact: true })).toBeVisible()
    await expect(farmDialog).toBeVisible()
    await farmDialog.getByRole('button', { name: '取消' }).click()
    await page.getByRole('button', { name: '新增池塘' }).click()
    await expect(page.getByRole('dialog', { name: '新增池塘' })).toBeVisible()
    await page.goto('/devices')
    await expect(page.getByRole('button', { name: '注册设备' })).toBeVisible()
    await page.getByRole('button', { name: '查看详情' }).click()
    await page.getByRole('tab', { name: '配置' }).click()
    await expect(page.getByRole('button', { name: '调至所选池塘' })).toBeVisible()
    await expect(page.getByRole('button', { name: '停用设备' })).toBeVisible()
    await page.goto('/alarms/rules')
    await page.getByRole('button', { name: '新增规则' }).click()
    await expect(page.getByRole('dialog', { name: '新增报警规则' })).toBeVisible()
  })
}

for (const role of ['owner', 'admin', 'member', 'support', 'viewer']) {
  test(`${role} alarm confirmation follows the server policy`, async ({ page }) => {
    await authenticate(page, role)
    let confirmed = 0
    await page.route('**/user/v1/alarms/1/confirm', async route => {
      confirmed++
      await route.fulfill({ status: 204 })
    })
    await page.goto('/alarms')
    await expect(page.getByRole('row', { name: /test-device/ })).toBeVisible()
    if (role === 'viewer') {
      await expect(page.getByRole('button', { name: '确认', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /批量确认/ })).toHaveCount(0)
    } else {
      await expect(page.getByRole('button', { name: /批量确认/ })).toBeVisible()
      await page.getByRole('button', { name: '确认', exact: true }).click()
      await expect(page.getByText('已确认 1 条报警', { exact: true })).toBeVisible()
      expect(confirmed).toBe(1)
    }
  })
}
