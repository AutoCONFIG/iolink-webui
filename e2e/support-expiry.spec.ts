import { expect, test } from '@playwright/test'

for (const timezoneId of ['Asia/Shanghai', 'UTC', 'America/New_York']) {
  test.describe(`支持到期：${timezoneId}`, () => {
    test.use({ timezoneId })
    test('上海时间显示、编辑、保存和重载保持同一瞬间', async ({ page }) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem('iolink.demo.tenant-members')) {
          localStorage.setItem('iolink.demo.tenant-members', JSON.stringify([
            { tenantId: 1, userId: 2, name: '时区测试成员', role: 'support', active: true, expiresAt: '2099-10-02T05:00:00Z' },
          ]))
        }
      })
      await page.goto('/login')
      await page.getByRole('button', { name: '进入控制台' }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await page.goto('/tenants')
      const member = page.getByRole('row', { name: /时区测试成员/ })
      await expect(member).toBeVisible()
      const expiry = member.locator('input').nth(1)
      await expect(expiry).toHaveValue('2099-10-02 13:00')
      await expiry.fill('2099-10-03 13:00')
      await expiry.press('Enter')
      await expect(expiry).toHaveValue('2099-10-03 13:00')
      await member.getByRole('button', { name: '保存' }).click()
      await expect(page.getByText('成员权限已更新')).toBeVisible()
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('iolink.demo.tenant-members') ?? 'null'))).toEqual([
        { tenantId: 1, userId: 2, name: '时区测试成员', role: 'support', active: true, expiresAt: '2099-10-03T05:00:00Z' },
      ])
      await page.reload()
      await expect(page.getByRole('row', { name: /时区测试成员/ }).locator('input').nth(1)).toHaveValue('2099-10-03 13:00')
    })
  })
}
