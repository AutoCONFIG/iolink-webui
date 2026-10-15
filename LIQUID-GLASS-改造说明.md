# Liquid Glass 液态玻璃改造说明（浅色版）

本次改造把 IoLink 管理平台的整体 UI 复刻为 GitHub 项目 [`rdev/liquid-glass-react`](https://github.com/rdev/liquid-glass-react)
的 **Apple Liquid Glass（液态玻璃）** 视觉风格，并把配色从深海军蓝切换为**浅白（Light）**基调。

由于本项目是 Vue 3 + Vite 技术栈（非 React），无法直接安装 React 组件库，因此使用 Vue + CSS 完整复刻了其视觉原理与交互行为。

---

## 一、最终成品（直接打开）

- **成品文件**：`dist/index.html`（约 1.76 MB，单文件、完全自包含）
- **打开方式**：在文件资源管理器中**双击 `dist/index.html`**，即可在浏览器中打开，无需启动任何后端或服务器。
- 成品内置演示数据（demo 模式），登录账号和密码已预填，直接点击 **「进入控制台」** 即可浏览所有页面。
- 路由采用 hash 模式（`#/dashboard`、`#/devices` 等），通过左侧菜单可在所有页面间导航，全程离线可用。

> 说明：现代浏览器出于安全策略，禁止用 `file://` 直接加载外部 ES Module，因此成品特意打包成所有 JS/CSS 内联的单文件，才能双击运行。

---

## 二、浅色液态玻璃的还原方式

| 特征 | 实现方式 |
| --- | --- |
| **白色玻璃 + 背景透色** | `--lg-tint` 为高不透明白色渐变（≈0.8），叠在浅白 mesh 渐变与蓝/紫/品红/青色光斑之上；`backdrop-filter: blur() saturate(1.75~1.85)` 让背景色高饱和地透过玻璃 |
| **镜面边缘高光** | `::after` 用 1.5px 描边 + `mask-composite: exclude` 绘制白色镜面环，并叠加 `inset` 内高光，形成玻璃"厚度感" |
| **顶部光泽与柔和阴影** | 表面顶部内高光 `inset 0 1px 0 rgba(255,255,255,0.9)`；阴影统一改为低透明冷色（`rgba(20,45,75,0.06~0.26)`），避免深色主题的黑色重阴影 |
| **Apple 胶囊按键** | 所有实心按键为 999px 胶囊玻璃按键：`::before` 承载顶部光泽 + 左下青 / 右上粉的折射色散，`::after` 用多层 `inset` 阴影画出「中心通透、四周发光」的镜面环，hover 增强光泽并轻微上浮，按压 `scale(0.97)` |
| **跟随鼠标的边缘高光** | `LiquidGlass.vue` 双层渐变描边（screen + overlay 混合），角度随鼠标位置变化 |
| **靠近弹性拉伸 / 磁吸** | 鼠标进入 200px 激活区时，玻璃按方向做弹性形变与轻微位移 |
| **按压缩放** | 可点击元素按下时 `scale(0.96)`，并出现顶部径向高光 |
| **弹窗聚焦** | 半透明浅色遮罩 + 背景模糊，弹窗/抽屉本身为高模糊白色玻璃 |

### 关于 SVG 位移折射（重要）

原深色版通过 SVG `feDisplacementMap` + RGB 通道差异化位移实现「边缘折射 + 色差」。

在浅色主题下**该滤镜被关闭**（`--lg-filter: none`），原因是：浅色高亮白玻璃的边界位移会在高对比边缘产生**明显的红/黄色差描边**——
官方组件的折射层本身不携带白色底（它折射的是背景画面），而本项目的业务卡片必须有白色底以保证文字可读性，两者的位移会产生肉眼可见的彩色边缘。

浅色主题因此改用「模糊 + 高饱和透色 + 镜面描边 + 阴影」来表达玻璃质感，视觉上与官方浅色外观一致，且更干净。
滤镜定义（`GlassFilters.vue`、`displacement-maps.ts`）全部保留，若需要切回深色主题可直接重新启用。

### 关于按键实现（易踩的两个坑）

按键的玻璃层次用两个伪元素实现，但必须遵守两条约束，否则会破坏 Element Plus 的既有功能：

1. **`::before` 必须限定 `:not(.is-loading)`**：Element Plus 把 loading 蒙层写在 `.el-button.is-loading:before` 上，无条件覆盖 `::before` 会让 loading 态失去遮罩。
2. **各变体规则必须限定 `:not(.is-disabled)`**：变体选择器优先级高于 EP 的 `.el-button.is-disabled`，不加限定会让禁用按钮看起来仍可点击。

另外，EP 在 `type` 为空时**不会**输出 `el-button--default` 类（`useNamespace` 的 `m(modifier)` 对空值返回空串），所以「默认按钮」要用
`:not(:is(.el-button--primary, .el-button--danger))` 这类排除式选择器选中。

### 关于动画与弹窗（第三个坑，已修复）

**不要给包含 `el-dialog` / `el-drawer` 的容器加 `transform` 动画。**

- **现象**：点「新增规则」后弹窗只显示上半部分、被拦腰裁切，遮罩也没盖住整个页面。
- **原因**：`.page-stack` 原来的入场动画是 `animation: page-in … both`，动画结束后元素上仍永久保留 identity 矩阵 `transform: matrix(1,0,0,1,0,0)`。
  只要 `transform` 不是 `none`，该元素就会成为 `position: fixed` 后代的 **containing block**。
  EP 的对话框遮罩并未 teleport 到 `body`，而是挂在 `.page-stack` 下，于是 `.el-overlay`（`position: fixed; inset: 0`）
  被解析成 `.page-stack` 的尺寸（实测 784×346，位于 y=110），弹窗随即被裁切。
- **修复**：`.page-stack` 的入场动画改为只动 `opacity`，且 `animation-fill-mode` 不使用 `both` / `forwards`。
  同时移除了 `.el-dialog` 上不必要的 `overflow: hidden`。

---

## 三、新增 / 修改的文件

**新增**
- `src/glass/displacement-maps.ts` —— 三张贴图的 base64 数据与 `GlassMode` 类型（自动生成，勿手改；浅色主题下暂未启用）
- `src/glass/GlassFilters.vue` —— 全局 SVG 滤镜定义（standard / strong / prominent；浅色主题下暂未启用）
- `src/components/LiquidGlass.vue` —— 可复用的液态玻璃 Vue 组件（含完整交互）
- `.reference/liquid-glass.esm.js` —— 官方 ESM 参考副本
- `.reference/extract-maps.cjs` —— 从官方 ESM 提取位移贴图的脚本
- `shots5/` —— 浅色主题验收截图（登录 + 全部管理页 + 弹窗/抽屉/下拉/窄屏）
- `shots6/` —— Liquid Glass 按键专项验收截图（主按钮 / 默认按钮 / 禁用态 / 图标按钮 / 单选按钮组 / loading 态 / 离线成品）

**修改**
- `index.html` —— 移除 `<html class="dark">`，`theme-color` 改为 `#EEF4FB`
- `src/main.ts` —— 移除 Element Plus 暗色主题 `css-vars.css`，改用官方浅色基底
- `src/styles/main.css` —— **整体重写为浅色令牌体系**：背景/文字/边框/阴影/玻璃/Element Plus 覆盖全部改为浅色，`html.dark` 覆盖块改为 `html:root`；统一玻璃机制关闭位移折射；**按键重写为 Apple Liquid Glass 胶囊按键**
- `src/components/LiquidGlass.vue` —— 文字色改为继承（深色文字 + 白色柔光）、边缘描边与阴影改为浅色适配、关闭位移折射
- `src/views/LoginView.vue` —— 硬编码的 `#65e0d1` 改为 `var(--color-primary-strong)`
- `src/layouts/AdminLayout.vue`、`src/App.vue` —— 沿用原结构，无样式改动需求
- `DESIGN.md` —— 视觉令牌章节更新为浅色令牌 + Liquid Glass 机制 + **Liquid Glass 按键规范**

---

## 四、开发与构建命令

```bash
# 安装依赖
npm install

# 开发模式（demo 数据，热更新）
npm run dev
# 访问 http://localhost:5173/

# 生产构建（连接真实后端，history 路由，输出到 dist/）
npm run build

# 本地预览生产构建
npm run preview
```

### 重新生成「双击即用」的离线单文件成品

```bash
# 1) 临时启用 demo + 离线（构建后可删除）
printf 'VITE_DEMO_MODE=true\nVITE_OFFLINE=true\n' > .env.production.local

# 2) 离线构建
VITE_OFFLINE=true npm run build

# 3) 删除临时配置
rm -f .env.production.local
```

### 切换回真实后端

- 将 `.env.production` 中的 `VITE_DEMO_MODE` 保持为 `false`；
- 正常执行 `npm run build`（此时使用 history 路由、`base: '/'`，与改造前一致）。

---

## 五、兼容性

- 推荐使用基于 Chromium 的现代浏览器（Chrome / Edge），背景模糊与透色效果最佳。
- Firefox 下会自动去掉 `filter` 折射（浅色主题本已关闭），保留背景模糊。
- 不支持 `backdrop-filter` 的浏览器会回退为不透明浅色表面（`--glass-solid: #f4f8fc`）。
- 已适配 `prefers-reduced-motion`，减少动态效果偏好下关闭动画。
