import { expect, test } from '@playwright/test'

test('管理员可从登录进入运营总览', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await page.getByRole('button', { name: '进入控制台' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: '水域运行态势' })).toBeVisible()
  await expect(page.getByText('池塘状态墙')).toBeVisible()
  await expect(page.getByText('东港示范养殖场').first()).toBeVisible()
  await expect(page.locator('.el-loading-mask')).toHaveCount(0)
  await page.screenshot({ path: '../.omo/evidence/todo7-dashboard.png', fullPage: true })
})

test('主导航可进入设备管理', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: '进入控制台' }).click()
  await page.getByRole('link', { name: '设备管理' }).click()
  await expect(page.getByRole('heading', { name: '设备管理', level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: '注册设备' })).toBeVisible()
})
