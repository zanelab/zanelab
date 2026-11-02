# env 体系重构: .env.example 模式 + VITE_USE_MOCK 统一 + VITE_API_KEY(apikey header)

## Goal

两应用的 `.env.development` / `.env.production` 职责混乱：`.env.development` 入库带默认值、
`.env`（gitignored）放本机覆盖——两者同名变量相互覆盖（上个任务已实测踩坑：`.env` 的值被
`.env.development` 的空值压掉）。改为业界常规的 **`.env.example` 模板模式**：仓库只存
`.env.example`（介绍每个参数的名称与作用），开发者 copy 成 `.env` 填真实值。

同时：

1. 两应用 mock 开关统一为 **`VITE_USE_MOCK`**（iam 现名 `VITE_IAM_USE_MOCK`，统一消除前缀差异）。
2. 新增 **`VITE_API_KEY`**（= Supabase `SUPABASE_PUBLISHABLE_KEY`）：请求头注入 `apikey`。
   现状两条请求链路都不带 apikey，而 Edge Fn 云上部署声明
   `withSupabase({ auth: ['publishable', 'secret'] })`（`supabase/functions/iam/index.ts:80`）——
   直连云 Supabase 时无 key 会被拒，这是当前"配了 VITE_PROXY_TARGET 指云也跑不通"的疑因之一。
3. `VITE_PROXY_TARGET` 语义**不变**（用户已确认）：仍只作用 dev 的 Vite 反代；生产请求路径不变，
   由部署侧网关接管。`.env.example` 中注明。

用户价值：env 参数有单一权威说明处；本机真实值集中一个文件；两应用 dev 开关心智模型一致；
直连云 Supabase 的请求带上凭据。

## Background / Confirmed facts

- **F1 · 现存 env 文件**：portal-web 有 `.env`（gitignored，值 `VITE_PROXY_TARGET=https://…supabase.co`）、
  `.env.development`（入库，`VITE_USE_MOCK=false` + `VITE_PROXY_TARGET=`空）、
  `.env.production`（空文件）；iam-web 只有 `.env.development`（`VITE_IAM_USE_MOCK=false` + 注释）。
- **F2 · 覆盖陷阱（既有踩坑）**：Vite 的 `.env.[mode]` 在 `.env` **之后**加载，同名键后者胜。
  portal-web 的 `.env.development:13` 把 `VITE_PROXY_TARGET=` 置空，压掉 `.env` 里的云地址——
  dev 实际解析为空 → 回落 `http://localhost:8081`。上个任务（use-mock-dev-env）已验证并记入
  spec `env-config-guidelines.md` 的 Warning。删除 `.env.development` 后该陷阱自然消失。
- **F3 · `.gitignore:16-17`**：`.env` 被忽略，注释明说「.env.development 等显式命名文件仍可入库」。
  改为模板模式后需改成忽略 `.env*`（保留 `!.env.example`）。
- **F4 · `VITE_IAM_USE_MOCK` 消费点（3 处代码 + 2 处文档）**：
  `apps/iam-web/src/main.tsx:148,175`（两处同形判断）、`apps/iam-web/README.md:80-81`、
  `.trellis/spec/frontend/env-config-guidelines.md:49`（spec 表格）。portal-web 侧
  `main.tsx:78` 与 `.env.development` 已用 `VITE_USE_MOCK`，无需改。
- **F5 · apikey 注入点（两处，用户已确认）**：
  (a) iam 独立态：`apps/iam-web/src/utils/http.ts` 的请求拦截器（现注入 Accept-Language 与
  Bearer token，:28-40）加一行 apikey；
  (b) 集成态经宿主代理：`apps/portal-web/vite.config.ts` 的 `proxy['/iam/functions/v1']` 配
  `headers: { apikey: … }`（http-proxy 的转发头注入）——集成态页面请求发到 :5173 同源，
  由 proxy 转发时带上，浏览器端无需改。
- **F6 · Edge Fn 鉴权**：`supabase/functions/iam/index.ts:80` `withSupabase({ auth: ['publishable', 'secret'] })`；
  CORS 的 `Access-Control-Allow-Headers` 已含 `apikey`（:51），header 名无需后端改动。
  `--no-verify-jwt` 部署跳过 JWT 校验但 withSupabase 的 auth 层独立生效。
- **F7 · key 的来源**：Supabase 新版 publishable key（`sb_publishable_…`）或 legacy anon key
  （`eyJ…`）均可作 apikey 值；二者都属公开凭据（配合 RLS 使用），放 gitignored 的 `.env`
  不入库。README 的 curl 示例（`apps/iam-web/README.md:33-44`）不带 apikey——本地 supabase
  start 时无鉴权可用，直连云时须补 `-H "apikey: <key>"`，README 需注明。
- **F8 · `.env.production` 是空文件**：无任何内容，删除无损失。
- **F9 · 既有 spec/文档引用**：`env-config-guidelines.md` 的表格与两处 Warning 提到
  `.env.development`/`.env.[mode]` 覆盖规则（:47-49, :80-86, :130）；`microfrontend-guidelines.md`
  与 iam README 提到 portal-web 侧 `VITE_PROXY_TARGET`/`VITE_IAM_USE_MOCK`——删除文件后这些
  表述要跟着改，否则 spec 与现实脱节（本仓已有两次同类教训）。

## Requirements

- **R1** 删除 `apps/portal-web/.env.development`、`apps/portal-web/.env.production`、
  `apps/iam-web/.env.development`；portal-web 现存 `.env`（本机文件）保留不动（gitignored）。
- **R2** 新建 `apps/portal-web/.env.example` 与 `apps/iam-web/.env.example`（入库）：逐参数注释
  名称与作用，值留空或给安全占位。至少涵盖：`VITE_USE_MOCK`、`VITE_PROXY_TARGET`（注明仅 dev
  生效、留空回落 :8081）、`VITE_API_KEY`（= Supabase publishable key，用于 apikey header）。
- **R3** `.gitignore` 改为忽略 `.env*`、保留 `!.env.example`（更新对应注释）。
- **R4** iam-web mock 开关改名 `VITE_IAM_USE_MOCK` → `VITE_USE_MOCK`（F4 全部消费点），语义不变。
- **R5** `VITE_API_KEY` 注入 apikey header（F5 两处）：iam 独立态 http 拦截器 + portal dev proxy
  `headers`。变量存在才注入，缺省不注入（本地 supabase 无鉴权场景不受影响）。集成态 iam 页面
  自身 fetch 直落 :8081 或经代理——代理注入已覆盖云直连场景；iam 独立态直连云场景由 (a) 覆盖。
- **R6** portal-web 现存 `.env` 不迁移不改动（本机文件）；但 `.env.example` 的注释要提示
  copy 后生效、以及 shell 变量优先级（`process.env` > `.env`）。
- **R7** 文档与 spec 同步（F9）：`env-config-guidelines.md`（env 文件角色、参数表、覆盖规则
  Warning 重写为 `.env` 单文件模式）、`microfrontend-guidelines.md`、iam README（mock 命令、
  curl 补 apikey 说明、前端指向云一节）、portal-web README（如有 env 表述）。
- **R8** 确认无代码消费 `.env.production` / `.env.development` 的隐式依赖（如 CI、turbo 配置）。

## Acceptance Criteria

- **AC1** 三个旧 env 文件已删；两个 `.env.example` 存在且逐参数有注释；`git check-ignore .env`
  仍命中、`git check-ignore .env.example` 不命中。
- **AC2** iam-web 源码与文档无 `VITE_IAM_USE_MOCK` 残留；`VITE_USE_MOCK` 在两应用语义一致
  （`=== 'true'` 判定 + `DEV` 守卫）。
- **AC3** portal dev proxy 带 apikey：设 `VITE_API_KEY` 后启动 dev，经 :5173 代理转发的请求头
  含 `apikey`；未设置时不含。
- **AC4** iam 独立态带 apikey：设 `VITE_API_KEY` 启动 `pnpm dev:iam`，页面发出的请求头含
  `apikey`；未设置时不含。
- **AC5** copy 流程可走通：`cp .env.example .env` 填值后 `pnpm dev`，`VITE_USE_MOCK` /
  `VITE_PROXY_TARGET` / `VITE_API_KEY` 的解析值与 `.env` 一致（不再有 mode 文件压值）。
- **AC6** 两应用 build/test/lint 全绿；spec 与 README 无 `.env.development` 残留表述。
- **AC7** 直连云验证（手动）：`.env` 配云地址 + publishable key，独立态发码请求 200
  （无 key 场景 401——验证 key 确实在起作用）。
- **AC8（R9 新增）** 独立态连云通路成立：设 `VITE_PROXY_TARGET=<基址>` 启动 `pnpm dev:iam`，
  `POST /functions/v1/iam/auth/otp/send` 经本 dev server 代理转发到目标（不再是本机 404）；
  未设该项时行为与改动前一致（仍 404，只能靠 mock）；`VITE_USE_MOCK=true` 时 worker 优先拦截。

## R9 · iam 独立态的 dev proxy（实施期发现，用户已批准）

**原缺陷（实施期实测）**：`apps/iam-web/vite.config.ts` **没有任何 proxy 配置**，而独立态
`apiPrefix()` 为空 → 请求是相对路径 `/functions/v1/iam/auth/otp/send` → 落在 :8081 自己的
dev server 上 → **HTTP 404**（2026-11-01 curl 实测）。后果：iam 侧的 `VITE_API_KEY`（R5a 的
消费点）成为死代码——独立态根本到不了云，header 注入无从生效；实施代理在 `.env.example`
里写的「独立态直连云」描述了走不通的路径。

> 历史背景：iam README 早先写的 `VITE_IAM_API_TARGET` 是从未实现的幻变量，独立态连云一直是
> 「有文档无实现」。

**修正（已定案：加 dev proxy）**：`apps/iam-web/vite.config.ts` 加 `server.proxy`：
`/functions/v1` → `VITE_PROXY_TARGET`（设了才代理，空则保持现状）。路径**原样转发不 rewrite**
（与 portal 侧不同——那条要剥 `/iam` 前缀），故 `VITE_PROXY_TARGET` 填 Supabase **基址**。
与 mock 正交：`VITE_USE_MOCK=true` 时 SW 在页面层先拦截，请求到不了代理。

**连带改动**：iam `.env.example` 补 `VITE_PROXY_TARGET` 一项 + 修正 `VITE_API_KEY` 注释；
README 独立态补「路线 A 走 mock / 路线 B 连云」双路线与 404 警示；
`env-config-guidelines.md` 参数表把 `VITE_PROXY_TARGET` 从 portal 单列改为「两 app 各自、
语义不同」。

## Out of scope

- 生产部署侧的 apikey 注入（nginx/网关层）——部署仓不在此仓。
- portal-web 自身 `/sys/auth` 接口带 apikey（旧后端无此要求；将来需要再加）。
- env 参数校验（zod/启动时 fail-fast）——本任务只做模板与注入。
- `supabase/config.toml` 与 Edge Fn 代码（鉴权声明已是目标状态）。

## Open questions (blocking)

（无——范围两问已由用户确认：proxy 仅 dev；apikey 注入 http 拦截器 + proxy 两处）
