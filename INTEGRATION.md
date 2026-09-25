# 接入 IoLink 与 ECS 部署

## 1. 开发接入

将本项目内容放入 IoLink 仓库：

```text
iolink/
└─ web/admin/
   ├─ package.json
   ├─ src/
   ├─ vite.config.ts
   └─ dist/          # npm run build 生成
```

本地后端运行在 `http://localhost:8080` 时：

```bash
cd web/admin
npm install
echo VITE_DEMO_MODE=false > .env.local
npm run dev
```

前端始终通过相对地址 `/admin/v1` 调用 API；开发时由 Vite 代理，生产时页面和 API 由同一个 `iolinkd:8080` 提供，因此不需要 CORS。

## 2. 构建嵌入

```bash
cd web/admin
npm ci
npm run coverage
npm run typecheck
VITE_DEMO_MODE=false npm run build

cd ../..
go test ./...
go build -o iolinkd ./cmd/iolinkd
```

现有 `web/embed.go` 使用：

```go
//go:embed all:admin/dist
```

所以必须先生成真实 `dist`，再编译 Go。前端改变后必须重新构建 Go 二进制或 Docker 镜像；只向运行中容器复制 `dist` 不会改变已嵌入的页面。

## 3. 推荐 Docker 多阶段构建

```dockerfile
FROM node:22-alpine AS frontend
WORKDIR /src/web/admin
COPY web/admin/package*.json ./
RUN npm ci
COPY web/admin/ ./
RUN npm run coverage && npm run typecheck && VITE_DEMO_MODE=false npm run build

FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /src/web/admin/dist ./web/admin/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/iolinkd ./cmd/iolinkd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /out/iolinkd /app/iolinkd
EXPOSE 8080 1883
ENTRYPOINT ["/app/iolinkd"]
```

建议在 CI 中使用 `VITE_DEMO_MODE=false`，否则构建产物会保留演示数据模式。

## 4. ECS 网络结构

```text
浏览器 ── HTTPS 443 ──► Nginx/Caddy ──► iolinkd:8080
设备   ── MQTTS 8883 ─► TLS 入口     ──► iolinkd:1883
                                      └─► TimescaleDB（仅容器内网）
```

安全组建议只开放：

- 443：管理后台和 API
- 8883：设备 MQTTS
- 22：仅固定运维 IP或堡垒机

不要公网开放 5432、8080、1883。`/metrics` 只允许内网 Prometheus 访问。

## 5. 前端联调前的后端阻断项

1. `sensor_data` 写入使用 `signal`，但 `docs/schema.sql` 没有该列；新库遥测入库会失败。
2. `adminapi.Deps` 没有注入 `Telemetry: svc.Telemetry()`，所以池塘 `latest` 恒为空。
3. 部分管理接口返回 Go PascalCase 字段，与文档 snake_case 不一致。本骨架有临时适配层，但后端应改成稳定 DTO。
4. Admin OpenAPI 的多个响应没有 schema，应补齐后再冻结前端类型。
5. 现有 schema 只在新数据卷初始化时执行，不是数据库迁移；ECS 升级应引入 Goose、Atlas 或 golang-migrate。
6. 正式部署前应把管理员密码从普通 SHA-256 改为 Argon2id/bcrypt，取消固定 `admin123`，并增加登录限流。

## 6. 推荐上线顺序

1. 修复上述数据库、Telemetry 和 JSON 契约问题。
2. 在测试 ECS/预发布环境构建完整镜像。
3. 走通登录 → 建场/池塘 → 注册设备 → 建规则 → MQTT 上报 → 报警确认 → 改密。
4. 配置域名、HTTPS、MQTTS、安全组和数据库备份。
5. 以 commit SHA 镜像发布，保留上一版本用于回滚。
