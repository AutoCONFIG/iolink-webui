import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: '进入控制台' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('所有管理页面在桌面和窄屏保持可用', async ({ page }) => {
  const pages = [
    ['/dashboard', '水域运行态势'],
    ['/ponds', '养殖场与池塘'],
    ['/devices', '设备管理'],
    ['/products', '产品与物模型'],
    ['/alarms/rules', '报警规则'],
    ['/alarms', '报警中心'],
    ['/system', '系统设置'],
    ['/tenants', '我的组织'],
  ] as const

  await login(page)
  for (const [path, heading] of pages) {
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: width < 500 ? 900 : 960 })
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
      await expect(page.locator('.el-loading-mask')).toHaveCount(0)
      await page.screenshot({ path: `../.omo/evidence/todo7-${path.slice(1).replaceAll('/', '-')}-${width}.png`, fullPage: true })
    }
  }
})

test('创建、确认和改密流程显示可恢复状态', async ({ page }) => {
  await login(page)

  await page.goto('/ponds')
  await page.getByRole('button', { name: '新增池塘' }).click()
  await expect(page.getByRole('dialog', { name: '新增池塘' })).toBeVisible()
  await page.getByRole('button', { name: '确认创建' }).click()
  await expect(page.getByText('请完整填写池塘信息')).toBeVisible()
  await page.getByRole('button', { name: '取消' }).click()

  await page.goto('/devices')
  await page.getByRole('button', { name: '注册设备' }).click()
  await expect(page.getByRole('dialog', { name: '注册监测设备' })).toBeVisible()
  await page.getByRole('button', { name: '生成接入凭据' }).click()
  await expect(page.getByRole('dialog', { name: '保存设备 Secret' })).toBeVisible()
  await expect(page.locator('.secret-box')).toBeVisible()
  await page.getByRole('button', { name: '我已保存，关闭' }).click()

  await page.goto('/alarms')
  const confirm = page.locator('.el-table__body-wrapper').getByRole('button', { name: '确认' }).first()
  await confirm.click()
  await expect(page.getByText(/已确认 1 条报警/)).toBeVisible()

  await page.goto('/system')
  await page.getByRole('button', { name: '更新密码' }).click()
  await expect(page.getByText('请填写旧密码，新密码至少 8 位')).toBeVisible()
})

test('过期会话回到登录页并清理本地令牌', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('iolink.admin.token', 'expired')
    localStorage.setItem('iolink.admin.expires_at', String(Date.now() - 1))
  })
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
})

test('产品页可创建包含数值和枚举字段的版本并发布分配', async ({ page }) => {
  await login(page)
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: '产品与物模型', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: '创建产品' }).click()
  const productDialog = page.getByRole('dialog', { name: '创建产品' })
  await productDialog.getByPlaceholder('例如：循环水泵控制器').fill('流量演示产品')
  await productDialog.getByRole('button', { name: '确认创建' }).click()
  await expect(page.getByRole('heading', { name: '流量演示产品' })).toBeVisible()
  await page.screenshot({ path: '../.omo/evidence/todo10-m6a-products-created.png', fullPage: true })
  await page.getByRole('tab', { name: '物模型' }).click()
  await page.getByRole('button', { name: '新建模型版本' }).click()
  const modelDialog = page.getByRole('dialog', { name: '新建模型版本' })
  await modelDialog.getByPlaceholder('字段标识，例如 mode').fill('flow')
  await modelDialog.getByPlaceholder('单位').fill('L/min')
  await modelDialog.getByRole('button', { name: '加入字段' }).click()
  await modelDialog.getByPlaceholder('字段标识，例如 mode').fill('mode')
  await modelDialog.locator('.el-select').first().click()
  await page.getByRole('option', { name: '文本/枚举' }).click()
  await modelDialog.getByPlaceholder('枚举值，用逗号分隔').fill('auto,manual')
  await modelDialog.getByRole('button', { name: '加入字段' }).click()
  await expect(modelDialog.getByText('待加入：')).toContainText('flow')
  await modelDialog.getByRole('button', { name: '创建版本' }).click()
  await expect(page.locator('.product-model-fields').getByText('flow')).toBeVisible()
  await expect(page.locator('.product-model-fields').getByText('mode')).toBeVisible()
  await page.screenshot({ path: '../.omo/evidence/todo10-m6a-products-model-draft.png', fullPage: true })
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '发布' }).click()
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: '设备绑定' }).click()
  await page.getByPlaceholder('输入设备编号').fill('demo-device')
  await page.getByRole('button', { name: '绑定模型' }).click()
  await expect(page.getByText(/设备已绑定模型/)).toBeVisible()
  await page.screenshot({ path: '../.omo/evidence/todo10-m6a-products-published-assigned.png', fullPage: true })
})

test('组织成员角色变更、支持期限和停用状态可保存', async ({ page }) => {
  await login(page)
  await page.goto('/tenants')
  const member = page.getByRole('row', { name: /演示成员/ })
  await expect(member).toBeVisible()
  await member.locator('.el-select').click()
  await page.getByRole('option', { name: 'viewer' }).click()
  await member.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('成员权限已更新')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('row', { name: /演示成员/ }).locator('.el-select')).toContainText('viewer')
  const restored = page.getByRole('row', { name: /演示成员/ })
  await restored.locator('.el-select').click()
  await page.getByRole('option', { name: 'support' }).click()
  await restored.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('支持角色需要未来的到期时间')).toBeVisible()
  await restored.locator('.el-select').click()
  await page.getByRole('option', { name: 'viewer' }).click()
  await restored.locator('.el-switch').click()
  await restored.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('成员权限已更新')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('row', { name: /演示成员/ }).locator('.el-switch')).not.toHaveClass(/is-checked/)
})
