# refresh 请求补 apikey 与网关鉴权失败区分

## Goal

修复 refresh 链路的静默故障：portal 宿主与 iam 独立态调 `/auth/refresh` 用裸
fetch 绕过了 RequestClient 拦截器，漏发 `apikey` 头，被 Supabase 平台网关以
401 MISSING_CREDENTIALS 拦截（请求未到 Edge Function）。后果是**任何持有有效
refresh token 的用户每次刷新页面都被强制登出**（网关 401 → classifyRefreshError
归为 invalid → handleLogout / 跳登录）。

两项修复（用户已确认）：
1. 两处 refresh fetch 补 apikey；来源唯一 = `config.js` 的 `api.publishableKey`
   （portal）/ `import.meta.env.VITE_API_KEY`（iam 独立态，与各自请求拦截器同源）；
   **未配置时前端给出明确提示**（console.error + 可见的 notify），不再静默。
2. 区分「网关鉴权失败」与「refresh_token 真失效」：网关 401（MISSING_CREDENTIALS，
   响应体 `source: @supabase/server` + `code: MISSING_CREDENTIALS`）绝不触发
   handleLogout / 跳登录——报配置错误，保留登录态。

## Background / Confirmed facts

- **F1 · 复现与实证**（2026-11-21 curl 实测，dev proxy :5173）：
  - 无 apikey → 401，响应体 `{"source":"@supabase/server","code":"MISSING_CREDENTIALS",...,"received":{"authorization":"absent","apikey":"absent"}}`；
  - 带 apikey（同一 body）→ 200 + 正常双 token。请求未到 Edge Function。
- **F2 · 漏发点**（仅两处，全仓已排查）：
  - portal：`apps/portal-web/src/utils/http.ts:149-156` refreshToken() 裸 fetch，
    头 = buildLegacyHeaders()（content-type / x-client-info / Authorization，无 apikey）；
  - iam 独立态：`apps/iam-web/src/utils/http.ts:80-84` refreshAndReplay() 裸 fetch，
    头仅 content-type。
  - 业务请求不受影响：portal http.ts:284 拦截器注入 apikey（appConfig.api.publishableKey）；
    iam http.ts:126-129 注入 VITE_API_KEY。
- **F3 · key 来源现状**：
  - portal：`public/config.js` `api.publishableKey`（已有值）；config/index.ts:31
    默认 undefined（留空 = 拦截器不注入）。用户确认：**只依赖 config.js**，不加 env 兜底。
  - iam 独立态：`.env` `VITE_API_KEY`（已有值），构建期注入，与拦截器同源。
- **F4 · 网关 401 特征**：响应体可解析 JSON 且含 `source: "@supabase/server"`
  与 `code: "MISSING_CREDENTIALS"`；HTTP 层与业务 401（Edge Fn 的
  `{code:1004,msg}`）无法从 status 区分，**必须看响应体**。
- **F5 · 消费链路**：
  - portal 启动：main.tsx:106-134 → refreshToken() 失败 → classifyRefreshError()
    → 'invalid' → handleLogout()；'network' 才保留旧 token。
  - portal 运行期：preset-interceptors 401 单飞 → doRefreshToken()（同
    refreshToken()）失败 → doReAuthenticate()。
  - iam 独立态运行期：http.ts 401 单飞 → refreshAndReplay() 失败 → redirectToLogin()。
  - iam 独立态启动：无启动期主动刷新（只有运行期 401 触发）。
- **F6 · notify 通道**：portal 有 ToastRegion；iam 独立态有 src/utils/notify.ts
  （本地渲染）。网关配置错误提示用各自现有通道。

## Requirements

- **R1**：portal refreshToken() 与 iam refreshAndReplay() 的 fetch 补 apikey 头；
  key 缺失（portal publishableKey 未配置 / iam VITE_API_KEY 为空）时**发请求前
  即失败**：console.error（含修复指引）+ notify 明确提示「refresh 端点未配置
  publishable key」，不触发登出/跳登录。
- **R2**：两处 refresh 响应处理识别网关鉴权失败（F4 特征）：视为**配置错误**
  （新错误类别，如 classifyRefreshError 增加 'gateway' 或独立判定），不触发
  handleLogout / doReAuthenticate / redirectToLogin；console.error + notify
  「部署配置错误：refresh 端点被网关拒绝（缺 apikey）」。
- **R3**：portal 运行期拦截器链（doRefreshToken 抛错路径）同样遵守 R2——
  网关错误不上抛为会话失效（不触发 doReAuthenticate）。
- **R4**：行为不变项：GoTrue 真 401（Edge Fn code:1004 或 GoTrue grant 401
  的业务响应）仍走原失效链路（handleLogout / redirectToLogin）；网络瞬断仍保
  留旧 token。
- **R5**：注释更新：refresh 端点的「匿名端点」语义补充「网关层仍要求 apikey」；
  buildLegacyHeaders 头注释同步。

## Out of scope

- 不改 Edge Function（/auth/refresh 端点本身行为正确）。
- 不改业务请求拦截器的 apikey 注入逻辑。
- 不做定时/可见性主动会话探测（另一需求）。

## Acceptance Criteria

- [ ] AC1：portal 配置了 publishableKey 时，启动期 refreshToken() 发出的请求带
      `apikey` 头（代码审查 + 测试断言）。
- [ ] AC2：publishableKey 未配置时：不发请求、console.error + notify 提示、
      不 handleLogout（保留 token 与登录态 UI）。
- [ ] AC3：模拟网关 401（MISSING_CREDENTIALS 响应体）→ 不 handleLogout /
      不跳登录，console.error + notify 配置错误提示；模拟 GoTrue 业务 401
      （code:1004）→ 仍 handleLogout。
- [ ] AC4：iam 独立态：VITE_API_KEY 配置时 refresh 带 apikey；未配置时发请求前
      失败 + 提示、不跳登录；网关 401 不跳登录、GoTrue 业务 401 仍跳登录。
- [ ] AC5：portal + iam tsc / test / build 全绿；现有测试不回归。
