import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

for (const timezoneId of ['Asia/Shanghai', 'UTC', 'America/New_York']) {
  test.describe(`支持到期：${timezoneId}`, () => {
    test.use({ timezoneId })
    for (const expiresAt of ['2099-10-02T05:00:37Z', '2099-10-02T05:00:37.123Z']) {
    test(`未编辑到期时间的重复保存保留 UTC 精度：${expiresAt}`, async ({ page }, testInfo) => {
      await page.addInitScript((expiry) => {
        if (!localStorage.getItem('iolink.demo.tenant-members')) {
          localStorage.setItem('iolink.demo.tenant-members', JSON.stringify([
            { tenantId: 1, userId: 2, name: '秒数测试成员', role: 'support', active: true, expiresAt: expiry },
          ]))
        }
      }, expiresAt)
      await page.goto('/login')
      await page.getByRole('button', { name: '进入控制台' }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await page.goto('/tenants')
      const member = page.getByRole('row', { name: /秒数测试成员/ })
      await expect(member).toBeVisible()
      for (let save = 1; save <= 2; save++) {
        await member.getByRole('button', { name: '保存' }).click()
        await expect(page.getByText('成员权限已更新')).toBeVisible()
        const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('iolink.demo.tenant-members') ?? 'null'))
        const artifact = testInfo.outputPath(`unchanged-save-${save}.json`)
        await writeFile(artifact, JSON.stringify(persisted, null, 2))
        await testInfo.attach(`unchanged-save-${save}`, { path: artifact, contentType: 'application/json' })
        expect(persisted).toEqual([
          { tenantId: 1, userId: 2, name: '秒数测试成员', role: 'support', active: true, expiresAt },
        ])
        await page.reload()
        await expect(member.locator('input[placeholder="支持角色必填"]')).toHaveValue('2099-10-02 13:00:37')
      }
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 960 })
        await member.locator('input[placeholder="支持角色必填"]').scrollIntoViewIfNeeded()
        await page.screenshot({ path: testInfo.outputPath(`unchanged-${width}.png`), fullPage: true })
      }
    })
    }

    test('上海时间显示、编辑、保存和重载保持同一瞬间', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem('iolink.demo.tenant-members')) {
          localStorage.setItem('iolink.demo.tenant-members', JSON.stringify([
            { tenantId: 1, userId: 2, name: '时区测试成员', role: 'support', active: true, expiresAt: '2099-10-02T05:00:37Z' },
          ]))
        }
      })
      await page.goto('/login')
      await page.getByRole('button', { name: '进入控制台' }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await page.goto('/tenants')
      const member = page.getByRole('row', { name: /时区测试成员/ })
      await expect(member).toBeVisible()
      const expiry = member.locator('input[placeholder="支持角色必填"]')
      await expect(expiry).toHaveValue('2099-10-02 13:00:37')
      await expiry.fill('2099-10-03 13:00:47')
      await expiry.press('Enter')
      await expiry.blur()
      await expect(expiry).toHaveValue('2099-10-03 13:00:47')
      await member.getByRole('button', { name: '保存' }).click()
      await expect(page.getByText('成员权限已更新')).toBeVisible()
      const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('iolink.demo.tenant-members') ?? 'null'))
      const artifact = testInfo.outputPath('edited-save.json')
      await writeFile(artifact, JSON.stringify(persisted, null, 2))
      await testInfo.attach('edited-save', { path: artifact, contentType: 'application/json' })
      expect(persisted).toEqual([
        { tenantId: 1, userId: 2, name: '时区测试成员', role: 'support', active: true, expiresAt: '2099-10-03T05:00:47Z' },
      ])
      await page.reload()
      await expect(page.getByRole('row', { name: /时区测试成员/ }).locator('input').nth(1)).toHaveValue('2099-10-03 13:00:47')
      await page.screenshot({ path: testInfo.outputPath('edited-reloaded.png'), fullPage: true })
    })
  })
}
