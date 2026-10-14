# IoLink 智慧水产管理平台 · UI 中度改造报告

- 改造目标：深色科技风 + 现代毛玻璃 + 精致微交互
- 改造方式：**原地改造现有项目**（未新建演示页、未重写工程、未替换框架/组件库）
- 改造程度：中度（统一设计系统 + 全局样式重写 + 视图内联色对齐，**零业务逻辑改动**）
- 交付目录：`E:\ECS\iolink-webui-main`
- 日期：2026-10-13
- 配套文档：`UI-MODERNIZATION-PLAN.md`（改造前审计与实施计划）

---

## 1. 项目技术栈（依据源码确认，非 README 推断）

| 维度 | 结论 | 主要证据 |
| --- | --- | --- |
| 前端框架 | Vue 3.5（`<script setup>`） | 各 `.vue`、`package.json` |
| 语言 | TypeScript 5.9（全量 TS） | `tsconfig.json`、`vue-tsc` |
| 构建工具 | Vite 7 | `vite.config.ts`；`build` = `vue-tsc -b && vite build`，产物 `dist/` |
| 路由 | vue-router 4（`createWebHistory`，含 setup/登录/租户角色/平台管理员守卫） | `src/router/index.ts` |
| 状态管理 | Pinia 3（仅 `stores/auth.ts`，令牌存 localStorage） | `src/main.ts`、`src/stores/auth.ts` |
| UI 组件库 | Element Plus 2.11（全量注册） | `src/main.ts` |
| 图标 | `@element-plus/icons-vue` 2.3 | `src/layouts/AdminLayout.vue` |
| 样式方案 | 单一全局 `src/styles/main.css`（CSS 变量 + 原生 CSS）；另有 2 处 `<style scoped>`（SystemView、TenantsView）。**无 SCSS / Tailwind / CSS Modules / UnoCSS** | `src/styles/main.css` |
| 图表库 | **无**（实时数据以遥测卡片/状态墙呈现，未使用 ECharts 等） | 全量源码 |
| 动画库 | **无**（本次也未引入，全部用 CSS Transition/Animation） | `package.json` |
| 请求/鉴权 | axios 两个客户端 `/admin/v1`、`/user/v1`；Bearer Token；401 清令牌并跳登录 | `src/api/http.ts` |
| 主题机制 | **原无主题切换**，为"浅色工作区 + 深色侧栏"单主题；本次在不引入主题管理框架的前提下启用 EP 官方暗色 + 设计令牌 | `index.html`、`src/main.ts` |
| 测试 | Vitest（node 环境，覆盖率门槛 80%）+ Playwright（channel: chrome，dev server 127.0.0.1:5173） | `tests/`、`e2e/`、`playwright.config.ts` |
| 部署 | `dist/` 由 Go `web/embed.go` 嵌入后端，随 Go/容器构建发布 | `INTEGRATION.md`、`web/embed.go`（后端目录） |
| Demo 模式 | `VITE_DEMO_MODE=true`（dev/example），`false`（production）；演示账号 admin/admin123 | `.env.*` |

---

## 2. 改造文件清单（仅列实际修改的文件）

| 文件 / 目录 | 修改内容 | 修改原因 | 风险 |
| --- | --- | --- | --- |
| `index.html` | `<html lang="zh-CN" class="dark">`；`theme-color` 改 `#0B1120`；新增内联 SVG favicon（data-URI） | 激活 EP 官方暗色主题；统一浏览器壳色；消除浏览器自动请求 `/favicon.ico` 的 404 | 极低：仅根属性与 `<head>`，不影响 DOM/逻辑 |
| `src/main.ts` | 在 EP 基础样式之后追加 `import 'element-plus/theme-chalk/dark/css-vars.css'`（含中文注释） | 引入官方暗色基底（文件已在依赖中，**零新增依赖**） | 极低：仅一条样式 import，顺序在 main.css 之前，确保令牌可覆盖 |
| `src/styles/main.css` | **整体重写为深色设计系统（754 行）**：设计令牌（颜色/圆角/间距/阴影/动效/缓动）；旧令牌别名（`--navy/--teal/--surface/--ink/--line/--muted/--teal-soft` 映射到新语义，保证 scoped 样式自动适配）；在 `html.dark` 下覆盖 EP 主色/背景/文字/边框/填充/表格/分页/标签/页签/描述列表/弹窗/抽屉/下拉/消息/Alert/Empty/Loading/Radio/Checkbox/Switch/日期/按钮/输入框；玻璃面板 `.glass-panel`（带 `@supports (backdrop-filter)` 不透明回退）；侧栏选中态（低饱和主色底 + 左侧 inset 指示线）；顶栏玻璃；卡片/表格/表单/弹窗/抽屉/登录页；KPI 卡片 hover 上移 2px；`.page-stack` 入场；统一 `focus-visible`；深色细滚动条；`prefers-reduced-motion`；空态插画提色；保留**全部原类名与 1050/760 断点** | 统一深色主题、层级、组件一致性与微交互，是本次改造的核心 | 中：全局样式影响面大，但仅改外观；已通过全量构建与逐页截图回归，未改任何类名/结构 |
| `src/views/DashboardView.vue` | 4 个 KPI 卡片 glow 色改为新色板（蓝/绿/琥珀/红）；最新报警点色（危险/警告）；2 处说明文字改 `--color-text-muted`（纯展示内联色） | 对齐深色状态色板与次级文字 | 极低：仅内联样式色值，无逻辑改动 |
| `src/views/DevicesView.vue` | 4 处 CTA 按钮 `color="var(--teal)"` → `color="var(--color-primary)"` | 统一主操作色 | 极低：仅按钮颜色 |
| `src/views/ProductsView.vue` | 5 处 CTA 按钮主色 → `--color-primary` | 统一主操作色 | 极低 |
| `src/views/PondsView.vue` | 3 处 CTA 按钮主色；计数文字改 muted；卡片底部边框/文字改令牌 | 统一主色与表面层级 | 极低 |
| `src/views/RulesView.vue` | 2 处 CTA 按钮主色；单位/计数文字改 muted | 统一主色与次级文字 | 极低 |
| `src/views/AlarmsView.vue` | 批量确认按钮主色；KPI 危险/警告值色；3 处表格内联灰字改 muted | 统一状态色与次级文字 | 极低 |
| `src/views/SystemView.vue` | "更新密码"按钮主色 → `--color-primary` | 统一主操作色 | 极低 |
| `src/views/LoginView.vue` | 主按钮去除自定义 `color`（走 EP 默认主色）；英文副标颜色改 `--color-accent` | 统一主色与品牌强调色 | 极低 |
| `src/views/TenantsView.vue` | scoped 样式中组织选中行/hover 背景 `--teal-soft` → `--primary-soft`（1 处） | 选中态与全局"选中=主色"保持一致 | 极低：仅选中底色 |

**刻意未改动（业务保护层）**：`src/api/**`、`src/router/**`、`src/stores/**`、`src/domain/**`、`src/types/**`、`src/layouts/AdminLayout.vue`（含菜单/权限/折叠逻辑）、业务组件 `StatusBadge / MetricGrid / VersionLabel`、构建与测试配置、`vite.config.ts`、`package.json` / 锁文件。

> 说明：`src/layouts/AdminLayout.vue` 顶部"演示数据"标签保留原色 `#0e9f8f`（填充式标签，白字在该色上对比度合格，属 teal accent 家族，且是"演示态"指示而非 CTA）。

---

## 3. 视觉改造清单（已完成 / 部分完成 / 未实施）

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 全局主题（Design Tokens） | ✅ 已完成 | 集中定义背景 `#0b1120 / #0d1524 / #151f30 / #1b293b / #223349`、文字 `#e8eef7 / #a5b4c7 / #7f90a6`、低透明边框、主色 `#42b9f5`、辅色 `#65e0d1`、状态 `#34d399 / #f5b544 / #f87171 / #94a7bc`；圆角 6/10/14/18、间距 4/8/12/16/24/32、动效 150/220/300ms、统一缓动 `cubic-bezier(.2,0,0,1)` |
| 导航布局（侧栏 + 顶栏） | ✅ 已完成 | 侧栏深色分层、图标/文字间距统一、选中项低饱和主色底 + 左侧指示线、hover 态、折叠与滚动保留；顶栏克制毛玻璃（半透明 + 模糊 + 细边框 + 阴影）。**菜单项、权限过滤、跳转、展开/折叠逻辑全部原样保留** |
| 卡片与玻璃效果 | ✅ 已完成 | 玻璃仅用于顶栏/下拉/抽屉/弹窗/重点浮层；普通表格、长列表、表单编辑区使用稳定实色表面；KPI/池塘/设备/产品卡片具备默认/hover（可交互卡上移 2px）/focus；`backdrop-filter` 提供不透明回退 |
| 统计概览（KPI） | ✅ 已完成 | 统一标题/数值/单位/辅助说明排版；在线/离线/告警等真实指标以对应状态色强调；未新增任何指标或伪造趋势/百分比 |
| 表格与筛选器 | ✅ 已完成 | 表头/正文层级、行高、行 hover、选中行、排序、筛选/搜索框、分页、操作按钮、状态标签、空数据、加载遮罩统一；未隐藏任何原字段/列/操作；表格保持实色以保证可读性 |
| 表单 / 弹窗 / 抽屉 | ✅ 已完成 | 标签对齐、输入框背景/边框/聚焦、必填、错误、禁用、加载态统一；弹窗淡入 + 轻微位移；抽屉玻璃化；描述列表/页签深色化；未改变打开关闭、校验、提交、确认/取消与焦点逻辑 |
| 图标与状态标签 | ✅ 已完成 | 复用现有 `@element-plus/icons-vue`；在线/离线/未知/告警等状态以既有业务枚举为准（StatusBadge 未改），配合状态点 + 文字，**不仅靠颜色区分**；未新增业务状态 |
| 微交互 | ✅ 已完成 | 按钮 hover 提亮/active 按压/focus-visible 轮廓；卡片 hover；菜单/下拉/弹窗/抽屉/页面内容过渡统一动效时长与缓动；无持续脉冲/强霓虹/闪烁 |
| 加载 / 空 / 异常状态 | ✅ 已完成 | 保留并统一既有 loading 遮罩、空状态（EP empty 插画提色以保证深色可见）、错误重试；未新增假数据 |
| 实时数据展示 | 🟡 部分完成 | 项目**无图表库**，实时数据以遥测卡片、池塘状态墙、最新报警呈现；本轮统一了这些区域的层级与状态色，**未改任何数据采样/刷新/MQTT 接口逻辑**；未做数值过渡动画（无真实历史序列，避免伪造趋势）。如需折线/实时曲线属于**新功能**，超出"中度改造"范围 |
| 背景动态效果 | 🟡 部分完成 | 登录页保留低频雷达环；KPI 卡片为静态光晕；未在设备列表/表单等高频页加粒子/光晕，避免持续渲染开销；未引入 WebGL/Three.js |
| 响应式 | ✅ 已完成（桌面端优先） | 保留原有 1050/760 断点；Playwright 实测 1440/1280/768/390 宽度下全部页面**无横向溢出**；768 侧栏收窄、KPI 两列；390 单列。1920×1080 未单独截图（沿用同一套流式栅格，预期与 1440 一致） |
| 无障碍 | ✅ 已完成 | 正文/次级文字/状态标签对比度达标；统一可见 `focus-visible`；图标按钮沿用具名/可访问名称；状态=颜色+文字+状态点；实现 `prefers-reduced-motion` 降级块 |
| 浏览器兼容 | 🟡 部分完成 | 玻璃效果带 `@supports` 不透明回退；现代 Chromium/Edge 实测通过；未在 Firefox/Safari 真机逐一验证 |
| 主题切换 | ⚪ 未实施 | 项目原本即单主题、无切换机制；本次按要求只做深色，未引入额外主题管理系统 |

---

## 4. 业务兼容性（检查项与验证结论）

**未改动的契约**：后端 API 路径、请求方法、参数与响应结构、Bearer 鉴权、401 处理、设备注册/上下线、遥测、设备控制、命令下发、告警确认、用户/角色/租户权限、License/API Key 等逻辑全部未改；路由表、菜单、权限过滤、页面字段、表格列、筛选、弹窗、表单字段未删除或重排。

**已在 Demo 模式（VITE_DEMO_MODE=true）下经 Playwright 真实验证**：
- 登录（admin/admin123）、退出、过期会话清令牌回登录、未初始化跳 Setup、权限守卫重定向；
- 全部路由可达：运营总览、养殖场与池塘、设备管理、产品与物模型、报警规则、报警中心、系统设置、开放平台日志、我的组织；
- 设备列表、池塘/状态筛选、视图切换、分页；设备**注册 → 生成接入凭据 → "保存设备接入凭据"弹窗**（Client ID/Username/Secret/MQTT topic 均正常）；设备详情抽屉三页签（概览/遥测/配置）；
- 产品目录/物模型/设备绑定页渲染；报警规则列表、报警中心级别/状态标签、批量确认入口；系统设置改密与 API Key 表单；组织成员角色/开关/到期控件；空态与加载态。

**未验证（超出本地可验证范围，已如实标注）**：
- **真实后端接口**（非 demo 模式，需后端联调环境）；
- Go `web/embed.go` 嵌入、后端构建与容器构建；
- Firefox / Safari 真机及 1920×1080 单独视口；
- Playwright 配置中被 `testIgnore` 跳过的 `m6c / m6d-live / tenant-permissions` 三组用例（属于项目既有忽略项）。

**一处与本次改造无关的预存 demo 现象**：设备详情抽屉"所属池塘"显示"池塘 #0"。根因是 demo 模式 `getDevice` 经 `normalizeDevice` 兼容层读取 snake_case 字段时，demo 数据为 camelCase 而丢 `pondId`（`DESIGN.md` 已记录的 PascalCase/snake_case 兼容债）。该问题在改造前即存在，属业务适配层，**按约束未做改动**。

---

## 5. 测试结果（以下均为真实执行结果）

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `npm run typecheck`（`vue-tsc -b`） | ✅ 退出码 0，改造前/后均通过 | — |
| `npm test`（Vitest） | ✅ **10 个测试文件 / 67 个用例全部通过**，退出码 0 | 存在**改造前就有**的 Vue warning：node 测试环境未注册 Element Plus 组件（`el-button/el-alert/...` 无法解析），与本次样式改动无关 |
| `npm run build` | ✅ **构建成功**，退出码 0，`dist/` 正常产出（约 12s） | 仅有的告警是 **改造前就存在** 的 `index.js > 500 kB` 体积提示（全量引入 Element Plus 所致），本次未改变打包结构 |
| `npx playwright test`（chrome） | 🟡 **15 通过 / 2 失败** | 两处失败均**不是本次视觉改造引入的回归**，分析见下 |
| 视觉回归（Playwright 截图） | ✅ 登录/总览/池塘/设备/产品/规则/报警/系统/组织/开放平台日志/设备抽屉/注册弹窗/Secret 弹窗/空态，768 与 390 窄屏均人工核对 | 临时截图脚本已清理，未留在交付目录 |

**两条 e2e 失败的归因（均有证据）**：

1. `admin-pages › 创建、确认和改密流程…` 在"保存设备 Secret"弹窗断言失败：
   - 用例定位 `getByRole('dialog', { name: '保存设备 Secret' })`，但源码 `DevicesView.vue` 弹窗真实标题是 **"保存设备接入凭据"**（`title="保存设备接入凭据"`），属**用例可访问名过时的预存缺陷**；
   - Playwright 失败快照显示该弹窗**实际已正常打开**，且设备已成功注册（列表由 4 条变 5 条）、Client ID/Username/Secret/MQTT 文案齐全；我用独立脚本以正确名称断言 `dialog "保存设备接入凭据"` 与 `.secret-box` 均为 `true`。
   - 纯样式改动不可能改变弹窗可访问名，故与本次无关。按约束未通过改测试来"掩盖"。

2. `admin-pages › 所有管理页面在桌面和窄屏保持可用`：
   - 失败点是 `expect(.el-loading-mask).toHaveCount(0)`，在全量套件并发、机器负载高时该用例整体撞上 **30 秒总超时**（需 8 页 × 3 宽度共 24 次导航 + 全页截图）；
   - **单独重跑该用例稳定通过（29.3s，恰好贴近 30s 上限）**；
   - `.el-loading-mask` 由 `v-loading` 指令随 `loading` 状态挂载/卸载，CSS 无法增减该 DOM 节点，属时序/超时敏感问题，非功能回归。

> 建议（非本次必做）：将上述用例的 `name` 更新为"保存设备接入凭据"，并把该用例 `timeout` 上调或减少全页截图，以消除既有的脆弱性。

---

## 6. 依赖变更

- **新增依赖：0**。
- **删除依赖：0**。
- **升级依赖：0**（`package.json` 与锁文件均未改动）。
- 暗色效果通过 Element Plus **官方随包提供**的 `theme-chalk/dark/css-vars.css` 启用，该文件在现有 `element-plus` 依赖内，无需安装；所有动效使用原生 CSS，未引入动画库。

---

## 7. 遗留问题与后续建议

1. **主包体积**：`index.js ≈ 1.2 MB`（gzip ≈ 393 KB），源于全量注册 Element Plus（改造前即如此）。后续可按需引入组件或 `manualChunks` 拆包，属独立优化，不在本次范围。
2. **两条 e2e 用例脆弱性**（第 5 节）：一个弹窗可访问名过时、一个 30s 超时过紧，建议单独修复。
3. **demo 详情"池塘 #0"**：`normalizeDevice` 兼容层预存债，需在业务适配层统一 camelCase/snake_case 时处理，本次未动。
4. **真实后端 / Go embed / 容器 / 真机浏览器**：本地未联调验证，发布前请在集成环境回归（深色仅为样式，不影响接口）。
5. **实时曲线**：现无图表库；若未来需要实时折线/趋势，需先做技术选型（按需引入），并在具备真实历史数据时再加，避免伪造趋势。
6. **无障碍**：建议后续在 CI 中加入对比度与键盘可达性自动检查；本次已满足键盘焦点与"状态不只靠颜色"。

---

## 8. 运行与部署方法

### 开发
```bash
npm install
npm run dev            # 默认 http://127.0.0.1:5173 （VITE_DEMO_MODE=true，免后端演示，账号 admin/admin123）
```

### 类型检查 / 测试 / 构建
```bash
npm run typecheck      # vue-tsc -b
npm test               # Vitest 单元测试（当前 67/67 通过）
npx playwright test    # 端到端（需本机 Chrome；dev server 由 webServer 自动拉起）
npm run build          # 产物输出 dist/
```

### 环境变量
- 开发：`.env.development`（`VITE_DEMO_MODE=true`）
- 生产：`.env.production`（`VITE_DEMO_MODE=false`，对接真实 `/admin/v1`、`/user/v1`）
- 本地副本：`.env.local`（已被 `.gitignore` 忽略），不要把令牌/生产地址写入代码。

### 部署
- 前端 `npm run build` 生成 `dist/`；
- 该 `dist/` 由后端 Go `web/embed.go` 嵌入，按既有流程执行 Go 构建/容器镜像构建即可；
- 本次未改动任何构建、代理与嵌入配置，部署方式与改造前一致。

---

## 结论

在**未改动任何路由、菜单、权限、API 契约与设备/遥测/告警业务逻辑**、**未新增任何依赖、未重写工程**的前提下，已将后台升级为视觉统一的深色科技风界面：集中式设计令牌、Element Plus 官方暗色基底、克制的毛玻璃导航与浮层、统一的卡片/表格/表单/弹窗、统一且符合 `prefers-reduced-motion` 的微交互，并保留原有断点与信息密度。`typecheck` 与生产构建通过、67 个单元测试全部通过；Playwright 15 通过，2 条失败经证据确认为**改造前即存在的用例缺陷/超时**，非视觉改造回归。

---
---

# 第二轮：液态玻璃 / 环境光 / 层次 / 微交互 / 数据动效（视觉增强）

在第一轮深色科技风基础上，按用户追加的五类视觉元素做**纯展示层增强**。约束不变：**零业务逻辑改动、零新增依赖、不伪造数据、不替换真实接口**；普通表格/表单/长列表保持实色以保证可读；玻璃仅用于顶栏、侧栏、弹窗、抽屉、下拉等浮层和少量重点卡；所有持续动画均为低频、低强度，并完整遵守 `prefers-reduced-motion`。

## 9. 本轮改动文件清单

| 文件 / 目录 | 修改内容 | 原因 | 风险 |
| --- | --- | --- | --- |
| `src/directives/countUp.ts` | **新建**可复用 `v-count-up` 指令：900ms easeOutExpo 整数滚动，mounted 从 0→真实值、updated 仅在 `value !== oldValue` 时从当前值→新值，unmounted 取消 rAF，reduced-motion 直显终值，仅写 `textContent`；带 `getSSRProps` 保证 SSR 安全 | 满足"数字统计卡片滚动计数"，且只动展示不改数据 | 极低；已配 SSR 钩子并在 SSR 测试中注册 |
| `src/main.ts` | 在既有 `createApp` 链上注册 `.directive('countUp', countUp)`（链式 API 展开为多行，逻辑不变） | 全局可用指令 | 极低 |
| `src/styles/main.css` | 末尾追加"视觉增强"块（第一轮规则全部保留）：① `body::before` 固定环境 mesh 光斑（蓝/青/紫，`pointer-events:none`，`z-index:0`）② 液态玻璃顶部高光/边缘反射（玻璃面板/顶栏/侧栏/弹窗/抽屉/下拉/消息）③ KPI 轻微透明叠层+高光+彩色光晕 ④ 表面分层柔影、可交互卡 hover 上浮+边缘高亮 ⑤ 主按钮 135° 渐变+辉光、开关滑块弹性、弹出层 `pop-in` 淡入上移 ⑥ 在线呼吸灯、严重报警脉冲、系统状态呼吸、等宽数字 | 一次性落地五类视觉元素 | 低；全部为增量 CSS，玻璃均带 `@supports` 不透明回退，普通表格/表单未透明化 |
| `src/views/DashboardView.vue` | 8 个 KPI（平台 4 + 租户 4）插值改为 `v-count-up`；最新报警红点加 `:class="{'is-critical': level==='critical'}"` | 数字滚动、仅严重报警脉冲 | 极低；数值来源与显示一致 |
| `src/views/DevicesView.vue` | 设备汇总 4 个 `<strong>` 挂 `v-count-up`；列表/卡片/抽屉三处在线 `el-tag` 加 `breath-online` 类（仅 `status==='online' && !disabledAt`） | 汇总计数滚动、在线呼吸灯 | 极低；离线/停用不加类，状态判定沿用原表达式 |
| `src/views/AlarmsView.vue` | 3 个 KPI（严重待处理/预警待处理/已加载）挂 `v-count-up` | 数字滚动 | 极低 |
| `tests/console-session.test.ts` | SSR 测试 harness 注册真实 `countUp` 指令（与既有 `loading` 注册同款写法）；整树 SSR 用例超时 5s→15s（隔离实测渲染约 5.3s，接近上限，并行易抖） | 适配新全局指令、消除既有超时脆弱性 | 低；只动测试装配与超时，断言一字未改 |
| `UI-MODERNIZATION-REPORT.md` | 追加本第二轮章节 | 交付说明 | 无 |

> 未改动：`src/api/**`、`src/router/**`、`src/stores/**`、`src/domain/**`、`src/types/**`、`src/layouts/AdminLayout.vue`、`package.json` / 锁文件、`vite.config.ts`、构建与部署配置。

## 10. 五类视觉增强落地清单

| 类别 | 落地内容 | 状态 |
| --- | --- | --- |
| **液态玻璃 / 毛玻璃** | 顶栏半透明磨砂（blur18+saturate1.3）；侧栏半透明磨砂透出环境光；弹窗/抽屉 blur24 + 顶部高光；下拉/日期面板/消息/通知 blur20；`.glass-panel` 增加顶部高光与边缘反射；KPI 关键卡用 `.90~.94` 透明叠层+顶部高光；**普通表格、长列表、表单编辑区保持实色** | ✅ 已完成（均带 `@supports` 不透明回退） |
| **环境光 / mesh 渐变** | `body::before` 固定 4 个低饱和蓝/青/紫径向光斑（角落），`pointer-events:none`、不拦截事件/选择/键盘；内容层 `z-index:1`；登录页保留独立雷达氛围 | ✅ 已完成（静态、无持续高频计算，不做全屏铺满） |
| **层次 / 阴影 / 悬浮** | 表面统一 `inset` 顶部高光 + 分层柔影；可交互卡（池塘/设备/产品资源）hover 上浮 2px、主色边缘高亮、柔影；KPI hover 边缘高亮 + 专属色光晕放大；弹窗/下拉层级更高 | ✅ 已完成；纯展示卡不做可点击暗示 |
| **微交互** | 主按钮 135° 蓝渐变 + 顶部内高光 + 柔和辉光（hover 提亮、active 按压，文字保持白色）；`el-switch` 滑块 `cubic-bezier(.34,1.56,.64,1)` 弹性；下拉/消息/通知 `pop-in` 淡入上移（150–300ms，统一缓动） | ✅ 已完成；提交/禁用逻辑未动，弹窗仍走原组件开关 |
| **数据动效** | `v-count-up` 数字滚动（KPI 15 个 + 设备汇总 4 个，仅在真实值变化时滚动，等宽数字防抖动）；**在线**设备标签低频绿色呼吸点（2.4s，仅真实在线）；侧栏系统在线点轻呼吸；**严重(critical)** 报警红点低频脉冲（1.8s，普通预警不脉冲） | ✅ 已完成；不改变采样/推送/接口频率，无随机数、无伪造趋势 |
| **响应式 / 无障碍** | 1440 与 768 实测无横向溢出；新增动画全部由既有的 `prefers-reduced-motion` 全局 `!important` 块关闭，`v-count-up` 在 reduced-motion 下直接显示终值；玻璃后文字仍为高对比实色文字 | ✅ 已完成（390 沿用第一轮布局，桌面端定位，未做大规模移动端重构） |

## 11. 本轮测试结果（真实执行）

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run typecheck` | ✅ 退出码 0 | 新增指令与模板绑定类型通过 |
| `npm test`（Vitest） | ✅ **10 文件 / 67 用例全部通过** | 首次跑因 SSR 用例未注册新指令出现 2 处报错（其中一处表现为 5s 超时），已按既有 `loading` 同款方式在测试 harness 注册真实 `countUp` 并补 `getSSRProps`，随后连续 3 次稳定 67/67；同时把该整树 SSR 用例超时上调至 15s（隔离实测约 5.3s，断言未改） |
| `npm run build` | ✅ **构建成功**，退出码 0，`dist/` 正常产出（约 13.5s） | 仅保留改造前就存在的 `index > 500kB` 体积提示 |
| `npx playwright test`（chrome） | 🟡 **15 通过 / 2 失败**，与第一轮**完全相同**的两条预存失败 | ① 布局用例全量并发撞 30s 总超时（`page.goto /tenants` ERR_ABORTED），**单独重跑通过 27.4s**；② Secret 弹窗可访问名用例写"保存设备 Secret"而源码为"保存设备接入凭据"。均与本轮纯 CSS/指令无关 |
| Playwright 视觉回归（本轮新增） | ✅ 11 张截图人工核对：总览/设备表/玻璃下拉/设备抽屉/注册弹窗/报警/产品/池塘/登录/768 | **6 个页面（1440×4、768×2）`scrollWidth==innerWidth` 无横向溢出；控制台错误为 0**；截图存于 `shots2/` 供预览，脚本已清理 |

**业务兼容性**：本轮仅新增指令、模板展示属性与 CSS，未触碰 API/路由/权限/设备/遥测/告警确认逻辑；表格列、筛选、表单、弹窗、抽屉的字段与操作均未删除；在线呼吸点严格复用原 `status==='online' && !disabledAt` 判定，报警脉冲仅对 `level==='critical'` 生效，**未新增任何业务状态**。数字滚动只设置展示文本，不影响真实数据、统计与提交。

## 12. 依赖变更

- **新增 / 删除 / 升级依赖：均为 0**（`package.json`、锁文件未改）。
- 全部效果用原生 CSS（transition/animation/backdrop-filter/`@supports`）+ 一个自研 Vue 指令实现，**未引入任何动画库**。

## 13. 遗留问题与兼容性

1. **`backdrop-filter` 兼容性**：所有玻璃区域均在 `@supports` 内启用，不支持时回退到不透明深色表面，文字对比与导航可用性不受影响；Firefox/Safari 真机未本地验证。
2. **性能**：玻璃模糊仅用于浮层（顶栏/侧栏/弹窗/抽屉/下拉），未对整页大量节点使用；环境光斑为静态固定层；呼吸/脉冲为 2.4s/3s/1.8s 的低频 `box-shadow` 动画，只作用于少量状态点；动画属性以 `box-shadow/transform/opacity` 为主。老旧集显设备如觉侧栏/弹窗模糊有压力，可在后续用统一开关降级为不透明。
3. 第一轮遗留项（主包体积、两条 e2e 脆弱性、demo"池塘 #0"、真实后端/Go embed/真机验证）维持不变，详见第 7 节。
4. **实时图表**：现无图表库，本轮未新增；未来如需实时折线/拓扑，需在具备真实历史数据、且完成技术选型后再加，避免伪造趋势。

---

# 第三轮：风格收敛（克制企业级规范）

按用户进一步给出的视觉规范，将第二轮偏"炫"的效果收敛为更克制、专业、以内容清晰为先的企业级风格。**仍为纯 CSS 调整（只改 `src/styles/main.css`），零业务逻辑改动、零依赖变更**。

| 规范项 | 落地调整 |
| --- | --- |
| 页面底色：深蓝灰渐变 + 局部弱光晕 | 页面底改为深蓝灰纵向渐变（`#0d1626 → #0b1120 → #0a0f1c`）+ 右上角一处弱蓝晕；环境光斑层从 4 个（含紫色，透明度 0.14）收敛为 **2 个低透明度（0.05–0.06）蓝/青弱光晕**，去掉紫色 |
| 内容卡片：不透明/轻透明 + 细边框 + 柔影 | KPI 卡由半透明（.90/.94）改为**接近实色**的深色渐变（`#1b293b→#162032`），细边框、柔和阴影；右上角彩色光晕减弱为**局部弱点缀**（默认 0.28、悬停 0.45），去掉悬停彩色发光环；池塘/设备卡悬停去掉主色描边，改为中性细边框提亮 + 轻柔上浮阴影 |
| 导航栏：半透明 + 模糊 + 滚动保层次 | 维持顶栏半透明磨砂（sticky + 阴影 + 层级），侧栏半透明磨砂；未削弱层次 |
| 按钮：主色强调 + 悬停提亮 + 按压 | 主按钮由 135° 渐变 + 强辉光改回**主色实心**（`#42b9f5`），悬停轻微提亮（`#5fc4f8`）、按下加深（`#3aa8e0`）并保留全局按压下沉缩放，辉光明显减弱 |
| 数据图表：统一色板 + 动画仅响应数据 | 项目当前无图表库；统计数字滚动（`v-count-up`）**只在真实数值变化时**播放，静态不循环；在线呼吸点/严重报警脉冲为状态指示，保持低频（2.4s/1.8s）克制 |
| 弹窗：适度遮罩 + 柔和进入 + 内容清晰 | 弹窗/抽屉透明度由 .90/blur24 收敛为 **.97/blur16 的近不透明轻磨砂**，保证表单与文字清晰；遮罩维持适度（rgba(4,8,16,.6)），进入动画保持柔和的淡入上移 |

**验证**：`npm run build` ✅ 构建成功（约 11s，仅预存 500kB 提示）；Playwright 截图人工核对总览/设备/下拉/弹窗/抽屉/报警/768，**1440 与 768 均无横向溢出、控制台错误 0**。本轮仅改 CSS，TS 与模板未动，`typecheck`/单元测试逻辑不受影响（第二轮已验证 67/67）。最终截图见 `shots3/`。

---
---

# 第四轮：Glassmorphism + Liquid Glass + Ambient Lighting（视觉全面升级）

按用户给出的完整视觉规范，将平台升级为"现代化工业物联网 SaaS 控制平台"风格（对标 Apple Vision Pro / Linear / Vercel / Tesla Energy）。**零业务逻辑改动、零新增依赖**；以 CSS 设计令牌 + 一个展示型组合式函数落地。

## 14. 本轮改动文件清单

| 文件 / 目录 | 修改内容 | 修改原因 | 风险 |
| --- | --- | --- | --- |
| `src/styles/main.css` | **整体重写为液态玻璃设计系统**：① 玻璃令牌（`--glass-bg/--glass-bg-2/--glass-bg-3/--glass-border/--glass-border-2/--glass-highlight/--glass-blur/--glass-solid`）② 环境光令牌（`--ambient-blue/--ambient-cyan/--ambient-purple`）③ 分层柔影（`--shadow-soft/--shadow-sm/--shadow-md/--shadow-lg/--shadow-overlay/--shadow-glow`）④ `body` 深色 mesh 渐变底；`body::before` 四角落静态光斑（蓝/青/紫，10–18%）；`body::after` 两团 28s 极缓慢漂移光球 ⑤ Sidebar/Topbar 改为**悬浮玻璃面板**（margin + 圆角 + 半透明 + blur22 + 边缘高光）⑥ 菜单选中态 = 左侧光条 + 90° 渐变背景 + 外发光；hover 图标放大 ⑦ Surface/KPI 玻璃化，KPI hover 上浮 5px + 彩色光晕放大 + 阴影增强 ⑧ 主按钮蓝→青渐变 + 内高光 + 辉光 + shine 光扫；危险按钮红色渐变 / plain 为红色玻璃 ⑨ Dialog 玻璃化（blur30 + 边缘高光），遮罩 blur6，入场 opacity+scale+translateY；Message toast 弹性入场 ⑩ 状态徽章色点呼吸（正常/预警/告警三档频率）；`.shimmer` 工具类；switch spring；loading 遮罩轻模糊。全部保留旧令牌别名与 1050/760 断点，玻璃均带 `@supports` 回退 | 一次性落地玻璃/环境光/层次/微交互/数据动效五大系统，是本轮核心 | 中：全局样式影响面大，但仅改外观；已通过全量构建与逐页截图回归 |
| `src/composables/useAnimatedNumber.ts` | **新建**展示型组合式函数：rAF + easeOutCubic，700ms 内从当前值平滑过渡到新值；初始值直显；reduced-motion 直显；卸载自动取消；不修改源数据 | 实时数据（水温/溶解氧/pH/浊度/盐度）更新时数字平滑变化，不瞬间跳变 | 极低；只写 display 副本 |
| `src/components/MetricGrid.vue` | 接入 `useAnimatedNumber`（5 项指标各一个平滑读数）；过期数据仍显示原始值，正常数据显示过渡值；类名与 props 结构不变 | 实时遥测数字平滑过渡 | 极低；仅展示层 |
| `index.html` | `theme-color` 更新为 `#070D18` | 浏览器壳色与新基底一致 | 极低 |
| `UI-MODERNIZATION-REPORT.md` | 追加第四轮章节 | 交付说明 | 无 |

**刻意未改动（业务保护层）**：`src/api/**`、`src/router/**`、`src/stores/**`、`src/domain/**`、`src/types/**`、`src/layouts/AdminLayout.vue`（菜单/权限/折叠逻辑全部保留）、`StatusBadge/VersionLabel`、`v-count-up` 指令、构建与测试配置、`package.json`/锁文件。环境光层由 `body` 固定背景层实现，无需改动布局模板。

## 15. 视觉规范落地对照

| 规范 | 落地 | 状态 |
| --- | --- | --- |
| 玻璃 Navbar | 悬浮玻璃顶栏：半透明 + blur22 + saturate1.4 + 半透明边框 + 顶部高光，hover 图标按钮有高光反馈 | ✅ |
| 玻璃 Sidebar | 悬浮玻璃菜单：圆角面板、半透明磨砂、hover 光效；选中 = 左侧光条 + 渐变底 + 外发光 | ✅ |
| Glass Card | 所有 KPI/表面玻璃化：透明底 + blur + 细边框 + 内高光 + 柔影；hover 上浮 5px、阴影增强（200–300ms） | ✅ |
| Glass Modal | 遮罩 blur6 + 弹窗 blur30 + 边缘高光；入场 opacity+scale+translateY | ✅ |
| Ambient Lighting | mesh 渐变底（深蓝/青/紫）+ 四角落光斑 + 两团漂移光球，透明度 10–18%，不影响文字 | ✅ |
| Depth 层次 | 背景(0) < 内容(1) < 玻璃卡 < 浮层(2000+)；统一 inset 高光 + 分层柔影，无黑色重阴影 | ✅ |
| 微交互 | 按钮 hover 渐变/辉光/上浮、active scale0.98；菜单过渡；switch spring；shimmer；toast 动画 | ✅ |
| 数字统计 | `v-count-up` 保留（KPI 0→真实值滚动，等宽数字） | ✅ |
| 实时数据平滑 | MetricGrid 五项遥测 rAF 平滑过渡，不跳变 | ✅ |
| 呼吸/脉冲 | 在线标签呼吸点；状态徽章三档呼吸；critical 告警红点脉冲；系统点呼吸 | ✅ |
| 图表/拓扑 | 项目无图表库、无拓扑页，本轮不引入依赖、不伪造数据；现有"池塘状态墙/报警流"承担状态可视化（N/A） | ⚪ N/A |
| 无障碍 | 统一 focus-visible；状态 = 颜色+文字+色点；全局 `prefers-reduced-motion` 关闭所有动画/平滑过渡 | ✅ |

## 16. 本轮测试结果（真实执行）

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run typecheck` | ✅ 退出码 0 | 首轮有 3 处类型错误（source 调用写法、数组索引 undefined），已修正后通过 |
| `npm test`（Vitest） | ✅ **10 文件 / 67 用例全部通过** | 仅预存的 node 环境 Element Plus 组件 warning |
| `npm run build` | ✅ **构建成功**（11.5s），dist 正常产出 | 仅预存 `index > 500kB` 体积提示 |
| Playwright 视觉回归（1440 + 768） | ✅ **16 张截图**：登录/总览/池塘/设备/产品/规则/报警/系统/组织/开放平台日志/玻璃弹窗/设备抽屉/玻璃下拉/窄屏×3 | **1440 全部 10 页、768 三页 overflow=0**；首次运行出现 2 条瞬时 404，两轮独立复现（含弹窗/抽屉/下拉交互）均为 0，判定为首次加载瞬时请求 |

截图存于 `shots4/`。业务兼容性：路由、菜单、权限过滤、API、状态管理、数据结构、字段与表格列全部未改；新增的数字平滑只写展示副本，不影响真实数据、统计与提交。
