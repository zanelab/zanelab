# iam-web: 接口调用收敛到 src/api 层（/functions/v1 统一管理）

## Goal

iam-web 的接口调用目前**内联在页面组件里**：请求路径字面量、API 前缀拼装、请求/响应类型、双态解包与成功判定全部住在 `src/pages/LoginPage.tsx`。这带来两个后果：

1. **API URL 无处统一管理**——集成态 `/iam` 前缀与路径片段在组件内拼接（`apiUrl`），新增接口只能再抄一遍；路径一旦调整（如 Edge Fn 路由改名），要逐页找字面量。
2. **接口契约知识落在 UI 层**——"成功怎么判、从哪个字段取 token"是后端契约，却写成页面里的分支表达式，换一个调用点就得重新推导。

目标：在 iam-web 建立 `src/api/` 层，把所有 `/functions/v1/...` 调用收敛进去，API URL 处理集中单点，形态参照 `apps/portal-web/src/api/auth.ts`（按域命名空间对象 + 层内完成类型化与响应映射），收敛深度为**完整收敛**（URL + 类型 + 双态解包 + 成功判定 + 错误语义）。

用户价值：路径与契约的改变只影响一处；页面只消费领域对象；`/functions/v1` 的调用点可被一处审计（当前 2 处，规模会涨）。

## Background / Confirmed facts

- **F1 · 调用点只有 2 处，且都在组件里**：iam-web 无 `src/api/` 目录；全仓 `/functions/v1` 调用点仅
  `apps/iam-web/src/pages/LoginPage.tsx:131`（发码）与 `:159`（验码）。
- **F2 · URL 拼装在组件内**：`LoginPage.tsx:78-80` 定义
  `apiPrefix = props.basename.replace(/\/$/, '') ?? ''` 与 `apiUrl = (path) => apiPrefix + path`，
  作用域限于该组件——API 寻址知识住在 UI 层。
- **F3 · 传输层无领域类型**：`apps/iam-web/src/utils/http.ts:56` 的 `post(path, body): Promise<unknown>`
  返回 `unknown`，类型由调用方各自断言。
- **F4 · 请求/响应类型散在页面**：`OtpSendResponse` / `OtpVerifyResponse`（`LoginPage.tsx:41-63`）与
  双态解包助手 `unwrap`（`:113-115`）都定义在页面文件内。
- **F5 · 成功判定与取数是契约知识，却写在页面里**：
  成功判定 `data?.code === 0 || data?.success || data?.data?.success`（`:141`）、
  取数 `data?.token ? data : data?.data`（`:186`）、错误文案 `data?.msg || t(...)` 散在三处。
- **F6 · 参照模式**：`apps/portal-web/src/api/auth.ts` —— 按域一个命名空间对象
  `authApi = { login, logout, changePassword }`；端点取自运行时配置 `appConfig.api.*` 而非硬编码；
  层内完成入参编码（`encryptPassword`）与出参映射（`mapLoginResult` → 领域类型 `LoginResult`）；
  页面只见领域对象，不见 envelope。**注**：iam-web 无 `config.js`，其 API 前缀由 `props.basename`
  派生（见 F10），故 F6 的「端点取自运行时配置」在 iam 侧对应「前缀取自 props 单点派生」。
- **F7 · LoginPage 头部契约注释已与代码脱节（同一文件内 4 处）**：注释写
  `POST {apiPrefix}/api/v1/auth/otp/send`，代码实际是 `/functions/v1/iam/auth/otp/send`；
  注释指向 `src/http/compat`，实际文件是 `src/utils/http.ts`；注释引用 `VITE_IAM_API_TARGET`
  （全仓无此变量）；注释说宿主代理 `/iam/api/*`，而 `apps/portal-web/vite.config.ts:29-37` 实际是 `/iam/functions/v1`。
- **F8 · 同类漂移在 spec 与 README**：`.trellis/spec/frontend/microfrontend-guidelines.md` 称 iam 的
  兼容层在 `apps/iam-web/src/http/compat.ts`（实际 `src/utils/http.ts`——portal-web 亦用
  `src/utils/http.ts`，故应改 spec 而非挪文件）；
  `apps/iam-web/README.md:50-51`（`VITE_IAM_API_TARGET`、`/iam/api`）与 `:70`（`VITE_IAM_USE_MOCK=true`
  与 `.env.development` 的 `false` 不符）同样失准。
- **F9 · iam-web 无测试基础设施**：`package.json` 无 `test` script、无 vitest 依赖、无 `*.test.*`
  文件（portal-web 有完整 vitest + MSW node server）。
- **F10 · 独立运行性是硬约定**：`props.basename` 缺省时前缀为空，请求直落本 dev server；
  spec [微前端与子应用](../../spec/frontend/microfrontend-guidelines.md) 明确「props 派生值缺省有义」。
  api 层须保持该性质，不得让独立态打到不存在的宿主路径。
- **F11 · OTP mock 在两种模式下都不匹配（既有缺陷）**：真实契约是
  `/functions/v1/iam/auth/otp/{send,verify}`（Edge Fn 名字 `iam` 即路径段，见
  `apps/iam-web/supabase/functions/iam/index.ts:85-92` 按 `path.endsWith('/auth/otp/send')` 分派，
  与 `README.md:33,39` 的 curl 一致），api 请求的也是该路径；但 mock 登记的是
  `/iam/functions/v1/auth/otp/{suffix}` 与 `/functions/v1/auth/otp/{suffix}`
  （`src/mocks/otp-handlers.ts:38-39`）——**均缺 `iam` 段**。MSW 按路径精确匹配，故
  `VITE_IAM_USE_MOCK=true` 下请求穿透 → 404（集成态经宿主 proxy 落到 8081 无路由，独立态直落
  本 dev server 无路由）。mock 文件头注释（`:9-10`）也按错误路径描述契约。

## Requirements

- **R1** 新建 `apps/iam-web/src/api/`，按**域**拆文件（当前认证域 → `api/auth.ts`），形态参照
  F6：命名空间对象导出，层内完成路径、类型、响应映射。
- **R2** 所有 `/functions/v1/...` 调用移入 api 层；页面组件不再出现该路径字面量。
- **R3** API 前缀（集成态 `/iam` / 独立态 `''`）在 api 层集中为**单点**，页面不再拼 URL（消除 F2）。
- **R4 · 完整收敛（Q1 已定）**：api 层负责 URL + 请求/响应类型 + 双态解包 + 成功判定 + 错误语义。
  页面只拿领域对象；失败经 `throw Error(msg)` 上抛，页面 `catch` 后只负责 i18n 兜底文案与展示位置。
  故 F4/F5 的类型、`unwrap`、成功判定、取数全部从 `LoginPage.tsx` 移出。
- **R5** 独立运行性不变（F10）。
- **R6** 与本任务直接相关的陈旧注释按实际代码修正：F7 的 4 处、F8 的 README/spec 三处。
- **R7** 约定沉淀：把「新增 `/functions/v1` 调用必须走 `src/api/` 层、路径常量集中在 api 层」
  写入 spec，使后来者有据可依。
- **R8 · 修正 mock 路径（Q4 已定）**：把 F11 的路径字面量改为**从 api 层常量派生**——路径与集成态前缀
  抽到零依赖的 `src/api/endpoints.ts`，api 层与 mock handler 共同 import，使路径漂移在结构上不可能再发生。
  已知代价：mock 不再独立声明契约（常量写错则两侧同错），契约真伪以 `supabase/functions/iam/index.ts`
  与 README 的 curl 为外部基准（design DD5）。

## Acceptance Criteria

- **AC1** `grep -rn "functions/v1" apps/iam-web/src` 的命中只剩 `src/api/` 与 `src/mocks/`；
  `src/pages/**` 无命中。
- **AC2** `src/pages/LoginPage.tsx` 不再定义 `apiPrefix` / `apiUrl` / 接口 response 类型 / `unwrap`；
  不再出现成功判定与取数表达式。
- **AC3** 前端构建通过：`pnpm --filter @zanelab/iam-web build` 绿。
- **AC4** 独立态端到端不变：`pnpm dev:iam` 单独运行登录页，发码/验码链路行为与改动前一致
  （含 60s 倒计时、错误提示位置、成功回传宿主/本地跳首页）。
- **AC5** 集成态端到端不变：经宿主 `pnpm dev` 打开 `/iam/login`，链路行为一致。
- **AC6** F7 的 4 处与 F8 的 README/spec 三处均已按代码实际修正，无 `VITE_IAM_API_TARGET` /
  `/iam/api` / `src/http/compat.ts` 残留。
- **AC7** `VITE_IAM_USE_MOCK=true` 下两种模式（独立态 `pnpm dev:iam`、集成态经宿主 `pnpm dev`）
  发码与验码都被 mock 正常拦截，不再 404；mock 登记路径与 api 层路径常量**同源**（import 同一常量，
  非逐字复制）。
- **AC8（R9 修正后可达）** 验码输入非 6 位数字时，验证码弹窗内展示 mock 返回的
  `验证码错误或已过期`——即 design DD4 的后端 `msg` 透出生效（改动前该文案被 401 会话失效链路
  吞掉，页面整页跳转/登出）。

## R9 · 业务校验失败的状态码契约修正（实施期发现，用户已批准）

**原缺陷**：验证码错误返回 **HTTP 401**（`supabase/functions/iam/index.ts:146` 与 mock 同款），
而 401 在 api 层之前就被前端会话失效链路截走——独立态 `src/utils/http.ts:46` 整页
`location.replace('/login')`；集成态经宿主 `authenticateResponseInterceptor` 刷新 → `handleLogout`。
结果：登录页最高频的失败路径上，用户看到的是页面重载/登出而非错误提示。这是**既有产品缺陷**
（非本次重构引入），401 语义也错位（"未认证"≠"验证码错"）。

**修正（已定案：改后端状态码）**：验码失败改为 `error(lang, 1003, 'codeInvalid')` /
`fail(1003, '验证码错误或已过期')`，即 `error()`/`fail()` 的默认 400；401 只留给真正的会话失效。
两侧同改（Edge Fn + mock，契约一致）。**部署提示**：Edge Fn 改动须
`pnpm exec supabase functions deploy iam --no-verify-jwt --project-ref <ref>` 重新部署后生效。

**集成态宿主侧已核实无副作用**（`apps/portal-web/src/utils/http.ts`）：
- `portalBizInterceptor`（:185-205）：HTTP 400 + envelope code 1003 不命中 reLogin 判定
  （码不在 `['213004','40100','213005']`、状态 400 不在 reLogin 状态表、`msg` 不匹配会话过期正则）
  → 原样放行 AxiosError，`error.response.data.msg` 完好。
- `errorMessageResponseInterceptor`（:280-284）：`resolveStatusMessage(400)` 返回 `null`
  （仅提示 403/5xx）→ 不弹 toast，与弹窗内联错误无重复提示。

## Out of scope

- 新增 `/functions/v1` 接口本身（Edge Fn 侧实现）。
- 统一 portal-web 与 iam-web 的 api 层（apps 间不得互相引用；跨 app 共享须下沉 `packages/*`）。
- **不引入测试栈**（Q2 已定）：iam-web 现状无 vitest，本任务不为 api 层新增单测，验证靠 AC3 构建与
  AC4–AC8 的端到端手工确认（含刻意触发失败分支）。此为**已知验证缺口**，在 design DD8 显式记录。
- 不挪动 `src/utils/http.ts`（Q3 已定：以改 spec 为准，两 app 实际都用该路径）。
- `src/pages/OtpVerifyModal.tsx`（纯展示组件，不持请求）。
