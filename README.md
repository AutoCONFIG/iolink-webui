# IoLink 管理后台 UI 骨架

面向智慧水产监测业务的 Vue 3 管理后台。当前包含：

- 登录与 401 退出
- 运营总览、KPI 与池塘状态墙
- 养殖场/池塘管理
- 设备列表、注册与一次性 Secret 提示
- 报警规则
- 报警中心、单条和批量确认
- 修改管理员密码
- 演示数据/真实 `/admin/v1` API 双模式
- 兼容当前 Go 接口 PascalCase 与目标 snake_case 的迁移适配层

## 本地预览

```bash
npm install
npm run dev
```

默认使用演示数据，账号为 `admin / admin123`。

连接真实后端：

```bash
copy .env.example .env.local
# 把 VITE_DEMO_MODE 改为 false
npm run dev
```

Vite 会将 `/admin` 和 `/api` 代理至 `http://localhost:8080`。

## 验证

```bash
npm test
npm run coverage
npm run typecheck
npm run build
```

## 接入 IoLink

将本目录内容放到 IoLink 仓库的 `web/admin/`，执行 `npm run build`。构建结果为 `web/admin/dist/`，现有 `web/embed.go` 会在 Go 编译时把它嵌入 `iolinkd`。

完整部署步骤见 [INTEGRATION.md](INTEGRATION.md)，界面调研见 [UI-REFERENCES.md](UI-REFERENCES.md)。
