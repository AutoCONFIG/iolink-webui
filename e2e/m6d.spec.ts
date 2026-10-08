import { expect, test } from '@playwright/test'

async function authenticate(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('iolink.admin.token', 'm6d-browser-token')
    localStorage.setItem('iolink.admin.expires_at', String(Date.now() + 3600_000))
  })
}

test('demo API Key form and audit navigation smoke', async ({ page }) => {
  await authenticate(page)
  await page.goto('/system')
  await page.getByPlaceholder('Key 名称').fill('scope')
  await page.getByPlaceholder('农场 ID（逗号分隔，可选）').fill('4')
  await page.getByPlaceholder('池塘 ID（逗号分隔，可选）').fill('7')
  await page.getByPlaceholder('设备号（逗号分隔，可选）').fill('dev-1')
  await page.getByRole('button', { name: '签发 Key' }).click()
  await expect(page.getByRole('region', { name: '开放平台 API Key', exact: true }).locator('.el-alert')).toBeVisible()
  await page.reload()
  const panel = page.getByRole('region', { name: '开放平台 API Key', exact: true })
  await expect(panel.locator('.el-alert')).toHaveCount(0)
  const row = panel.locator('.el-table').first().getByRole('row', { name: /scope/ })
  await row.getByRole('button', { name: '撤销' }).click()
  await expect(row).toContainText('已撤销')
  await page.getByRole('link', { name: '开放平台日志' }).click()
  await expect(page.getByRole('heading', { name: '开放平台操作日志' })).toBeVisible()
})
