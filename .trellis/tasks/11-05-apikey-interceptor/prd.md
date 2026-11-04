# apiKey 注入迁移到 http 拦截器（运行时配置）

## Goal

env-restructure 任务（11-01）把 `apikey` 头的注入放在了 **vite proxy**（`VITE_API_KEY`，dev-only）。
用户评审指出缺口：**生产环境没有 vite proxy**——`config.js` 的 `api.baseURL` 指向云 Supabase
（或网关）时，请求不带 `apikey` → 云网关 401。

目标：`apikey` 成为 **http 层请求头语义**，注入点迁移到请求拦截器：

- **portal**：`requestClient` 请求拦截器（`src/utils/http.ts:224-237`），key 来自
  **运行时配置** `config.js` 的新字段 `api.apiKey`（与"接口地址一律从运行时配置读取"的
  不变式同构——生产换 key 改 config.js 即可）；
- **iam**：独立态本地拦截器（`src/utils/http.ts`，已有 Bearer 注入处），key 来自 env
  （iam 无 config.js，维持 11-01 的 env 语义）；
- **删除** portal `vite.config.ts` 的 proxy 注入（单一注入点，无重复）。

用户价值：dev/prod 行为一致；注入逻辑单点；生产部署改 config.js 即可带凭据。

## Background / Confirmed facts

- **F1 · 现状缺口**：注入仅存在于 `apps/portal-web/vite.config.ts:38`（proxy headers），
  生产请求（portal `requestClient` 直连或经网关）不携带。用户已确认这是缺陷。
- **F2 · iam 集成态链路**：子应用请求经 `props.http` = `window.__http` = portal requestClient
  只读代理 → **走 portal 的请求拦截器**——portal 侧注入一次即覆盖 iam 集成态。
- **F3 · iam 独立态链路**：本地 `RequestClient` 拦截器（`apps/iam-web/src/utils/http.ts:32-35`）
  已有 `VITE_API_KEY` 注入（11-01 落地），本任务**保留不动**（env 语义在独立态正确）。
- **F4 · 凭据公开性**：publishable key 本就是公开凭据（随页面 JS 分发）；从 proxy 换到拦截器
  不增加暴露面。
- **F5 · 覆盖语义**：若 proxy 注入保留会造成同名头双写（同值无害但混乱）；删除后 dev/prod
  单点。portal 拦截器注入对所有请求生效（含 portal 自身 `/sys/auth/*`——无 apikey 需求的
  旧后端收到多余头也无害，axios 不因多余头报错）。
- **F6 · 工作树事件**：config.js 曾被手改（删 loginEndpoint）已按用户决定还原；本任务往
  config.js 加字段时基于已提交版本。
- **F7 · zod 契约**：`ApiConfigSchema`（`packages/types/src/config.ts:47-55`）增可选
  `apiKey: z.string().optional()`——**非 strict**（未知键 strip），旧 config.js 不带该键不受影响。

## Requirements

- **R1** `ApiConfigSchema` 增 `apiKey`（可选，注释：Supabase publishable key，运行时配置）；
  portal `DEFAULT_CONFIG` 与 `public/config.js` 同步补字段（config.js 留空串示例 + 注释）。
- **R2** portal `http.ts` 请求拦截器注入：`appConfig.api.apiKey` 非空才 set `apikey` 头
  （与 TOKEN_HEADER 同款守卫风格，注释说明覆盖 iam 集成态）。
- **R3** 删除 `vite.config.ts` 的 `VITE_API_KEY` 读取与 proxy `headers` 注入（含注释）。
- **R4** `.env.example`（portal）的 `VITE_API_KEY` 段更新：删除该项并注明"apiKey 已迁至
  运行时配置 config.js（api.apiKey）"；iam 的 `.env.example` 保留（独立态仍用 env）。
- **R5** 测试：portal 侧 loadConfig 对 `apiKey` 的透传用例；拦截器注入用例（有 key → 带、
  无 key → 不带——portal http.ts 有现成测试基建 `http.integration.test.tsx`）。
- **R6** spec 同步：`env-config-guidelines.md` 的注入矩阵改写（proxy 注入 → 拦截器注入，
  两应用两态的落点表）；README（iam 的"前端指向云"节）同步。
- **R7** 用户手改的 config.js 端点切换（还原掉的那个）不在本任务范围——另任务。

## Acceptance Criteria

- **AC1** `loadConfig` 透传 `api.apiKey`（新增单测：config.js 带 key → `appConfig.api.apiKey`
  为该值；不带 → undefined，不报错不回退）。
- **AC2** portal 拦截器：config.apiKey 非空 → 请求头含 `apikey`；空/缺失 → 不含（单测，
  MSW 下断言请求头）。
- **AC3** `grep -n "VITE_API_KEY" apps/portal-web` 仅剩 README/.env.example 的迁移说明，
  `vite.config.ts` 无该变量。
- **AC4** iam 独立态注入不受影响（既有用例 `menus.test.ts` 的身份链路照常绿）。
- **AC5** 两 app build/tsc/prettier 绿；spec/README 与实现一致。

## Out of scope

- config.js 端点切换到 iam（R7，另任务；含 logout 端点补齐）。
- iam 集成态的独立注入（F2：portal 拦截器已覆盖）。
- auth/v1（GoTrue）请求的 apikey（宿主 OTP 登录链路走 iam 子应用，不经 portal http 客户端；
  若将来 portal 直连 GoTrue 再扩）。

## Open questions (blocking)

（无——方案 A/B 已由用户确认选 B：拦截器为唯一注入点，删 proxy 注入）
