# 执行计划：refresh apikey 修复

## 步骤

### S1. portal：refreshToken() 补 apikey + 未配置前置失败 `[main]`
`apps/portal-web/src/utils/http.ts`：
- refreshToken()：`appConfig.api.publishableKey` 非空 → headers 加 `apikey`；
  为空 → 不发请求，console.error（修复指引：public/config.js api.publishableKey）
  + notify.error，抛独立错误（如 Error('refresh gateway misconfigured')，
  classifyRefreshError 需归为非 invalid 类别）。
- notify：portal 用 errorMessageResponseInterceptor 同款通道或直接 i18n
  （看 http.ts 现有 import，保持一致；i18n key 若无现成的用 common.http.* 新键，
  zh/en 都补）。

### S2. portal：classifyRefreshError 增加 'gateway' 类别 `[main]`
- 网关 401 判定：响应体可解析且 `source === '@supabase/server'`（F4；
  code 值用 includes('MISSING_CREDENTIALS') 兜底——未来网关可能加新错误码，
  凡 @supabase/server 来源一律视为网关层错误）。
- refreshToken() 现在解析响应体（成功分支已在 parse；失败分支目前只看 status）：
  401/403 时先读 body 判网关错误 → 抛 gateway 错误（不设 status 或设
  `kind:'gateway'` 标记）；否则按现逻辑设 status 抛出。
- classifyRefreshError：优先识别 gateway 标记 → 'gateway'；main.tsx 消费处
  （bootstrap）'gateway' 与 'network' 同走「保留旧 token + console.error +
  notify」，**绝不 handleLogout**。
- preset-interceptors 链路（R3）：doRefreshToken 抛 gateway 错误时，
  portal http.ts 的 doRefreshToken 包装（bizCode '401' 逻辑）需绕过——gateway
  错误保持非 401 bizCode，使 isSessionExpiredError 不命中 → 401 单飞失败不触发
  doReAuthenticate；但 preset-interceptors 的 catch 分支无论如何会 doReAuthenticate
  （packages/utils，跨包改动需谨慎）——**检查该链路**：若拦截器失败必触发
  doReAuthenticate，则 portal doRefreshToken 包装层吞掉 gateway 错误改为
  console.error + notify + 返回空 token / 抛可识别错误并接受登出？——不行，R2
  要求不登出。方案：gateway 错误时 doRefreshToken 返回**原 token**（让重试用旧
  token 自然 401，但 __isRetryRequest 已标记 → doReAuthenticate……仍有问题）。
  **实现时细读 preset-interceptors.ts 后定方案**，底线：运行期网关错误不触发
  doReAuthenticate 或触发前有明确 notify（用户可见），并在 implement 记录实际取舍。

### S3. iam 独立态：refreshAndReplay() 同款修复 `[main]`
`apps/iam-web/src/utils/http.ts`：
- VITE_API_KEY 非空 → apikey 头；为空 → 前置失败：console.error + notify
  （src/utils/notify.ts），不 redirectToLogin。
- 401 响应先解析 body 判网关错误 → console.error + notify，不 redirectToLogin、
  不抛给 401 拦截器（防止重入）；GoTrue 业务 401 → 原链路 redirectToLogin。

### S4. 测试 `[main]`
- portal：http.refresh 相关测试（找现有 refreshToken/classifyRefreshError 测试；
  若无则新建）：apikey 头断言 / 未配置前置失败断言 / 网关 401 vs 业务 401 分类断言；
- iam：http.refresh.test.ts 补三同款用例（现有文件在 apps/iam-web/src/utils/）；
- 注意 mock config（appConfig.api.publishableKey 可控注入）。

### S5. 验证 `[main]`
```bash
pnpm --filter @zanelab/portal-web exec tsc --noEmit && pnpm --filter @zanelab/portal-web test
pnpm --filter @zanelab/iam-web exec tsc --noEmit && pnpm --filter @zanelab/iam-web test
grep -rn 'apikey' apps/portal-web/src/utils/http.ts apps/iam-web/src/utils/http.ts
```
- 浏览器实测（dev servers 已在跑）：塞过期 token + 有效 refresh token → 刷新
  /home → refresh 请求带 apikey → 200 → 正常进入登录态。

## 回滚点

单 commit，revert 即回滚。

## 收尾

commit（scope=project）→ spec 沉淀（Supabase 网关鉴权要求 + MISSING_CREDENTIALS
特征 → microfrontend 或 http 规范）→ 归档 → journal。
