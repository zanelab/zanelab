<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Go 后端规范（Gin / gRPC / 模块）

> 合并转写自 wg-skills 的 6 个技能：`go-gin-init-skill`、`go-frame-init-skill`、
> `go-grpc-init-skill`、`go-ws-module-skill`、`go-auth-module-skill`、`go-storage-module-skill`
> （位于源仓库 `vibeCoding/backend/go/` 与 `go-module/`）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。
> 响应信封/错误码/JWT/分页/api-contract 的**唯一定义处在 [conventions.md](./conventions.md)**，
> 本文件只写 Go 侧落地。

## 一、红线（go-gin-init，其余技能沿用）

1. **不生成无契约的骨架**——生成的是包含完整契约层（响应信封/错误码/JWT/api-contract）的版本。
2. **不硬编码版本号**——Go / Gin / 依赖版本一律现场查官方源最新稳定版。
3. **不跳过环境探测**——生成前先检查用户环境（Go ≥ 1.20、GolangCI-Lint），无法安装则明确提示。
4. **不强制安装系统级数据库**——本机有 Docker 可自动拉起开发数据库容器（可选）；否则提供 `references/db-guide.md` 的 Docker 命令由用户自行启动。
5. **不替用户提交 git**。
6. **默认值必须安全**——`.env.example` 对 `JWT_SECRET` / `CORS` / `APP_DEBUG` 有醒目警告；安全头中间件强制开启。
7. **所有注释、文档用中文**。
8. **接口契约与 frontend-request-skill 对齐**——响应信封、错误码、字段命名前后端一致。
9. **`.env` 与 `.gitignore` 必须随脚手架生成，且 `.env` 配置必须被加载**——`config.go` 经 `godotenv` 读取，禁止硬编码端口/数据库密码/JWT 密钥。
10. **密码与签名按场景选型**——用户密码只存 bcrypt（cost 12）或 Argon2id，禁 MD5/SHA1/SHA256 裸哈希与可逆加密；JWT 固定 HS256 验签（`jwt.WithValidMethods([]string{"HS256"})`），密钥不少于 32 字节，缺失或过短**拒绝启动**。细则见 [crypto.md](./crypto.md)。

## 二、Gin 骨架（go-gin-init-skill）

核心能力 11 项：① 环境探测（Go ≥ 1.20）；② 自动安装（go.mod、依赖、`go build` 检查）；③ 一键启动/重启 `./restart.sh [dev|prod]`（环境搭建、拉代码、装依赖、安全停旧进程、启动）；④ 开发模式 `./restart.sh dev` 热重载（air），日志 `logs/dev.log`；⑤ 生产模式 `./restart.sh prod` 后台多 worker，日志 `logs/app.log`；⑥ SSE 流式（`gin-sse`，`/api/sse/chat`）；⑦ 文件上传（`/api/upload` 单文件、`/api/uploads` 多文件）；⑧ 统一响应中间件；⑨ 全局异常（BusinessError / 校验错误 / 兜底）；⑩ JWT（golang-jwt/v5：注册/登录/刷新/当前用户注入）；⑪ 基础安全头。

## 三、多框架支持（go-frame-init-skill）

| 框架 | 特点 | 场景 |
|------|------|------|
| **Gin** | 最流行、性能好 | 默认推荐 |
| **Hertz** | 阿里开源、云原生 | 高性能 HTTP |
| **Fiber** | Express 风格、易上手 | 快速开发 |
| **Chi** | 轻量、Router 链路 | API Gateway |

配置走 `configs/config.yaml`；与 go-gin-init 的关系：gin 是默认实现，frame-init 是多框架选型入口。

## 四、gRPC 骨架（go-grpc-init-skill）

| 能力 | 说明 |
|------|------|
| .proto 定义 | 消息 + 服务 + 4 种 RPC 模式 |
| 服务端骨架 | 拦截器链 + 日志 + 错误处理 + 启动脚本 |
| 客户端封装 | 重试 / 熔断 / 超时 / 连接池 |
| JWT 认证 | 拦截器 + Token 校验 |
| 流模式 | Server / Client / Bidirectional Streaming |
| 错误码映射 | gRPC status code ↔ wg-skills 负数错误码 |
| 健康检查 | gRPC Health Check Protocol |
| 拦截器链 | 日志 / 认证 / 错误转换 / 链路追踪 |

本地验证：`protoc` 生成后终端 1 起 gRPC 服务、终端 2 起 gRPC Gateway（可选，HTTP 兼容）。

## 五、WebSocket 模块（go-ws-module-skill）

模块红线：① 连接必须鉴权——query 参数 token 验证，无效/过期立即关闭（code 4001）；② **消息先落库再投递**，保证不丢；③ 好友关系是消息前置条件（仅 `status=1` 好友可互发）；④ 消息必须带 `client_msg_id`（8-64 字符全局唯一，服务端按此去重）；⑤ 心跳保活——客户端 30s ping、服务端回 pong，超 60s 无消息断开；⑥ 离线消息单次最多推 100 条；⑦ 消息按 `id` 自增有序；⑧ 支持多端登录（同一用户多连接）；⑨ 契约即事实（以 `api-contract-ws.md` 为准）。

模块错误码：`-1001` 参数错误 / `-1002` 未授权 / `-1003` 禁止访问（非好友或给自己发消息）/ `-2000` 系统错误。

## 六、Auth 模块（go-auth-module-skill）

核心能力 9 项：① RBAC（用户/角色/菜单：目录 M、页面 C、按钮 F/组织/岗位/租户）；② **三段式权限码** `模块:资源:动作`，39 个常量唯一源（34 个有菜单 + 5 个无菜单），DB `permission` 列与前端 `v-permission` 逐字一致；③ super_admin 双路径（见下）；④ 四档数据权限 `ALL / DEPT_AND_BELOW / DEPT_ONLY / SELF_ONLY`，多角色取最宽；⑤ 菜单树（单表 `parent_id` 递归，含按钮级权限节点）；⑥ 通用登录 universal-login（第三方应用 App + 密钥 AppKey + 绑定 AppBinding + 绑定码 BindCode）；⑦ 开放接口 `/api/open/**` 用 HmacSHA256 鉴权（300s 时间偏差、常量时间比较）；⑧ 绑定双向流程（app_initiated / user_initiated），绑定码一次性消费；⑨ 零环境依赖（默认 `glebarez/sqlite` 纯 Go，`CGO_ENABLED=0`）。

### ★ 契约红线（踩坑沉淀）

1. **两个权限解析路径故意不同，别合并**：`GET /api/auth/me`（前端权限数组）走 **DB 派生**（`role_menu → menu.permission`，34 个真实菜单权限）；鉴权中间件 `RequirePerm` 走 DB 派生 **∪** 全量常量（super_admin 短路，39 = 34 + 5 个无菜单权限：4 个 `system:tenant:*` + `system:api:view`）。**不要把 `me()` 也短路成 39**——否则前端权限数组与 Java 实现不一致。数量会随新增无菜单权限增长，别把数字写死不复核。
2. **目录菜单的 `permission` 必须存 NULL，不能存 `""`**——装载权限的 SQL 是 `permission IS NOT NULL`，空串不是 NULL，会被带进权限数组（实测曾致 super_admin `me()` 返回 37 = 34 真实 + 3 个空串）。修法：模型字段用 `*string`，落库前空串转 `nil`。
3. **开放接口 `X-App-Key` 是 `AppKey.apiKey`（`ak_xxx`，参与签名），不是 `App.appKey`（`app_xxx`，仅应用标识）**。
4. **收尾自检清单**：交付前逐项打勾（源 SKILL.md「★ 收尾自检清单」节，历史教训清单）。

## 七、Storage 模块（go-module/go-storage-module-skill）

定位：对象存储模块（MinIO/S3 兼容），配置走 `config.yaml` 配置结构体；含数据库模型、接口契约要点与强制交付物（api-contract-storage.md）。模块错误码遵循 `-3xxx` 段（存储服务不可用 `-3001` 等，见 conventions.md 分段规则）。

## 八、源文件对照

| 章节 | 源技能 | 备注 |
|------|--------|------|
| 一/二 | go-gin-init-skill | references/ 含 db-guide、skeleton 等 |
| 三 | go-frame-init-skill | — |
| 四 | go-grpc-init-skill | — |
| 五 | go-ws-module-skill | api-contract-ws.md 在源技能目录 |
| 六 | go-auth-module-skill | ★ 收尾自检清单在源 SKILL.md |
| 七 | go-module/go-storage-module-skill | — |
