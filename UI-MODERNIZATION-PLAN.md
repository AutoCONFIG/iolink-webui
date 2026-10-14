# IoLink 管理后台 UI 深色科技风改造计划（中度改造）

> 本文件是改造前的审计与实施计划，改造后的结论见 `UI-MODERNIZATION-REPORT.md`。
> 原则：**不改业务契约、不改路由、不换框架/组件库、不造假数据**；以设计令牌统一 + 组件库官方暗色主题 + 全局类名重绘为主。

## 1. 技术栈（源码确认）

| 维度 | 结论 | 证据 |
| --- | --- | --- |
| 前端框架 | Vue 3.5（`<script setup>` 组合式 API） | `package.json`、全部 `.vue` |
| 语言 | TypeScript 5.9 | `tsconfig.json`、`*.ts` |
| 构建工具 | Vite 7，`vue-tsc -b && vite build`，产物 `dist/` | `vite.config.ts`、`package.json` |
| 路由 | vue-router 4（`createWebHistory`，路由守卫含鉴权/初始化/租户角色） | `src/router/index.ts` |
| 状态管理 | Pinia 3（`auth` store，localStorage 令牌） | `src/stores/auth.ts` |
| UI 组件库 | Element Plus 2.11（全量注册） | `src/main.ts` |
| 图标库 | @element-plus/icons-vue 2.3 | `AdminLayout.vue` |
| 样式方案 | 单一全局 CSS（CSS 变量 + 原生 CSS），无 SCSS/Tailwind/CSS Modules；两处 scoped style | `src/styles/main.css`、`SystemView/TenantsView` |
| 图表/动画库 | 无（KPI/池塘/指标为纯 CSS 网格；动效仅少量 transition） | 源码 |
| HTTP/鉴权 | axios，两个客户端 `/admin/v1`、`/user/v1`，Bearer Token；401 清令牌跳登录 | `src/api/http.ts` |
| 主题机制 | 无主题切换；当前为“浅色工作区 + 深色侧栏”单一主题，令牌集中在 `main.css` | `main.css` |
| 测试 | Vitest（node 环境，domain+adapters 覆盖率门槛 80%）；Playwright（Chrome channel，自带 dev server） | `vite.config.ts`、`tests/`、`e2e/` |
| 部署 | 构建 `dist/`，由 Go `web/embed.go` 嵌入 `iolinkd` 镜像 | `README.md`、`INTEGRATION.md` |

## 2. 页面与组件清单（以源码实际存在为准）

- 公共：`layouts/AdminLayout.vue`（固定侧栏 + sticky 顶栏 + 可折叠导航）。
- 认证：`LoginView`、`RegisterView`、`SetupView`、`PendingView`。
- 业务总览：`DashboardView`（平台/租户两套 KPI、池塘状态墙、最新报警）。
- 资源：`PondsView`（养殖场/池塘）、`DevicesView`（列表/卡片、分页、筛选、注册、Secret 弹窗、详情抽屉三页签、调塘/停用/恢复）、`ProductsView`（产品/物模型版本/设备绑定）。
- 告警：`RulesView`（阈值规则）、`AlarmsView`（单条/批量确认）。
- 管理：`SystemView`（License、改密、API Key）、`TenantsView`（组织与成员）、`APIKeyAuditView`（开放平台日志）。
- 复用组件：`StatusBadge`、`MetricGrid`、`VersionLabel`。
- 公共视觉类：`surface`、`kpi-*`、`pond-card`、`device-card`、`product-*`、`toolbar`、`table-wrap`、`status-badge`、`alarm-*`、`empty-note`、`login-*`、`setup-*` 等（均在 `main.css`）。

## 3. 现有 UI 问题

1. 工作区为浅色，与深色侧栏割裂，无统一深色基调；卡片阴影偏“轻飘”，层级感弱。
2. 颜色令牌为浅色系（白底/浅文字），Element Plus 未启用暗色主题，表格、弹窗、抽屉、下拉、表单在深底下不可直接用。
3. 大量硬编码浅灰色内联色（`#8497a4`、`#7b909e`、`#8799a5`、`#edf2f4` 等）散落模板，深底上对比度不足。
4. CTA 按钮混用 `color="#0fae9b"` / `color="var(--teal)"`，与 Element Plus 默认主色不统一。
5. 缺少统一的聚焦态、按压反馈、弹窗/抽屉过渡；玻璃拟态仅顶栏一处且无回退。
6. 少量类名被引用但无全局样式（`.muted`、`.platform-note`、`.product-workspace`、`.product-model-panel`、`.field-draft`、`.draft-chip`）。
7. 无 `prefers-reduced-motion` 处理；滚动条为浏览器默认。

## 4. 设计令牌（新增 / 调整）

在 `main.css :root` 建立深色令牌，并保留旧令牌名做**语义别名**（避免改动模板结构）：

- 背景：`--color-bg #0B1120`、`--color-sidebar #0D1524`、`--color-surface #151F30`、`--color-surface-elevated #1B293B`、`--color-surface-hover #223349`。
- 文字：`--color-text #E8EEF7`、`--color-text-secondary #A5B4C7`、`--color-text-muted #7F90A6`。
- 边框：白色低透明（0.06 / 0.08 / 0.10 / 0.14 / 0.20）。
- 主色：`--color-primary #42B9F5`；辅助 `--color-accent #65E0D1`。
- 状态：成功 `#34D399`、警告 `#F5B544`、危险 `#F87171`、信息蓝（在线/成功/告警同时保留文字标签，不只用颜色）。
- 圆角 `6/10/14/18`、间距 `4/8/12/16/24/32`、动效 `150/220/300ms`、缓动 `cubic-bezier(.2,0,0,1)`。
- 阴影：`--shadow-sm/md/lg` 深色柔影；玻璃：`.glass-panel`（含 `@supports` 不透明回退）。
- 别名：`--surface/--ink/--line/--muted/--danger/--warning/--link/--teal/--teal-soft/--line-soft/--surface-tint/--navy*` 映射到新语义。

Element Plus：启用官方暗色主题（`element-plus/theme-chalk/dark/css-vars.css`，`html.dark`），再覆盖 `--el-color-primary/-light-*/-dark-*`、`--el-bg-color*`、`--el-text-color*`、`--el-border-color*`、`--el-fill-color*`，**不逐组件硬改内部 DOM**。

## 5. 预计修改文件与原因

| 文件 | 修改 | 原因 |
| --- | --- | --- |
| `index.html` | `<html class="dark">`、更新 `theme-color` | 激活 EP 官方暗色主题；状态栏配色 |
| `src/main.ts` | 引入 EP dark css-vars | 官方主题 API，零新增依赖 |
| `src/styles/main.css` | 重写为深色令牌体系 + 全局组件/浮层/动效/无障碍 | 改造主体 |
| `AdminLayout.vue` | 演示数据标签配色、必要的微调 | 深底可读 |
| 7 个业务视图 | 内联 `color` 主色统一、硬编码浅灰改令牌/可读色 | 深底对比度与一致性 |
| `SystemView.vue`/`TenantsView.vue` scoped | 选中态浅底改深色半透明 | 深色适配 |
| `metrics.ts` | 仅在必要时微调数据可视化色值（纯展示，不改数据逻辑） | 深底可读 |

**不改**：`api/**`、`router/**`、`stores/**`、`domain/**`（业务逻辑）、`types/**`、构建/测试配置、路由与菜单结构、任何接口与字段。

## 6. 风险与测试

- 风险：EP 组件深底对比度；玻璃模糊不兼容（已备 `@supports` 回退）；`color` 属性按钮色差；弹窗/抽屉/下拉 teleport 到 body 需全局覆盖。
- 回归：`npm run typecheck`、`npm test`（67 项）、`npm run build`；启动 dev（demo mode）用浏览器逐页核对登录、总览、设备/池塘/产品/告警/系统/组织。
- 基线：改造前 typecheck ✅、67/67 单测 ✅、build ✅（仅有既有的 chunk 体积提示）。

## 7. 实施顺序

P1 令牌 + EP 暗色 → P2 布局/导航/卡片/表单/表格/浮层 → P3 各业务页面内联色与细节 → P4 微交互/空态/玻璃浮层 → P5 回归与视觉验证、输出报告。
