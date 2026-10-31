# Implement — iam-web 接口层收敛

> 设计依据：[design.md](./design.md)（DD1–DD8）。事实编号见 [prd.md](./prd.md)。
> 顺序编排原则：先立常量与 api 层，再切消费方（mock、页面），最后改文档——每一步之后代码都可用。

## 执行清单

- [ ] **S1 · 新建端点常量模块（DD1/DD2）**
  - `apps/iam-web/src/api/endpoints.ts`：**零 import**。
  - 导出：`INTEGRATION_PREFIX = '/iam'`（集成态宿主代理前缀 = 子应用 activeRule）、
    `OTP_SEND_PATH = '/functions/v1/iam/auth/otp/send'`、`OTP_VERIFY_PATH = '/functions/v1/iam/auth/otp/verify'`。
  - 注释写明两件事：① `iam` 这一段是 Supabase Edge Function **函数名**，不是目录，改名须与
    `supabase/functions/iam/` 部署名同步；② `INTEGRATION_PREFIX` 只服务 mock（api 层运行时从
    `props.basename` 派生），改 activeRule 时须与 `portal-web/public/config.js` 的 `microApps` 同步。

- [ ] **S2 · 新建认证域 api（DD3/DD4）**
  - `apps/iam-web/src/api/auth.ts`：导出 `LoginSession` 类型与 `authApi = { sendOtp, verifyOtp }`。
  - 私有 `apiPrefix()`（从 `getProps().basename` 派生，见 DD2）、私有归一化助手（双形态读值）、
    私有错误提取助手（DD4 的四级顺序）。
  - `sendOtp(email)` 成功判定 `success === true`（兼容 `data.success`）；`verifyOtp(email, code)`
    成功判定 `token` 非空，返回 `LoginSession`。失败一律 `throw new Error(msg)`。
  - 保留现状语义：发码失败与验码失败的判定口径与改动前一致，只是从页面搬进来。

- [ ] **S3 · mock 改由常量派生（DD5）**
  - `apps/iam-web/src/mocks/otp-handlers.ts`：import `endpoints.ts` 的三个常量；把
    `otpPaths(suffix)` 换成 `pagePaths(p) => [p, INTEGRATION_PREFIX + p]`，分别以 `OTP_SEND_PATH`
    / `OTP_VERIFY_PATH` 调用。
  - 修正文件头契约注释（`:9-10`）的路径（现写 `/functions/v1/auth/otp/send`，缺 `iam` 段）。
  - 保留文件内既有说明：为什么两种页面级路径都要登记（SW 拦截发生在宿主 proxy rewrite 之前）。

- [ ] **S4 · 页面切到 api 层（R2/R4，主改动）**
  - `apps/iam-web/src/pages/LoginPage.tsx`：
    - 删：`apiPrefix`、`apiUrl`（`:78-80`）、`OtpSendData`/`OtpSendResponse`/`OtpVerifyData`/
      `OtpVerifyResponse`（`:41-63`）、`unwrap`（`:113-115`）、`post` 的 import。
    - `sendCode` / `verify` 改调 `authApi.sendOtp` / `authApi.verifyOtp`；成功路径直接用领域对象
      （`verifyOtp` 返回的 `session.token` 交给 `emitLoginSuccess`），不再做 `data?.token ? data : data?.data`。
    - `catch` 只保留：决定展示位置（`error` / `verifyError`）+ i18n 兜底文案
      （`e instanceof Error && e.message ? e.message : t(...)`）。
    - 修头部契约注释 4 处（F7）：路径改 `/functions/v1/iam/auth/otp/*`；`src/http/compat` →
      `src/utils/http.ts`；删 `VITE_IAM_API_TARGET` 引用；宿主代理 `/iam/api` → `/iam/functions/v1`。
  - **不要**改动 `OtpVerifyModal.tsx`（纯展示，不持请求）。

- [ ] **S5 · 文档与 spec（R6/R7）**
  - `apps/iam-web/README.md`：`:50-51` 的 `VITE_IAM_API_TARGET` 与 `/iam/api` 改为实际的
    `VITE_PROXY_TARGET`（宿主侧）与 `/iam/functions/v1`；`:70` 的 `VITE_IAM_USE_MOCK=true` 与
    `.env.development` 的 `false` 对齐（说明需显式置 true 才启 mock）；mock 一节的
    `/iam/*` 路由示意同步为实际形态。
  - `.trellis/spec/frontend/microfrontend-guidelines.md`：兼容层参考实现路径改为
    `apps/iam-web/src/utils/http.ts`；补 R7 约定——**子应用新增 `/functions/v1` 调用必须走
    `src/api/` 层，路径常量集中在 `src/api/endpoints.ts`，mock handler 从同一常量派生**。

## 验证命令

```bash
# 构建（AC3）
pnpm --filter @zanelab/iam-web build

# 路径字面量收敛（AC1）
grep -rn "functions/v1" apps/iam-web/src        # 期望：只剩 src/api/ 与 src/mocks/

# 页面不再持契约知识（AC2）
grep -n "apiPrefix\|apiUrl\|unwrap\|OtpSendResponse\|OtpVerifyResponse" apps/iam-web/src/pages/LoginPage.tsx
                                                 # 期望：无输出

# 陈旧引用清空（AC6）
grep -rn "VITE_IAM_API_TARGET\|/iam/api\b\|src/http/compat" apps/iam-web .trellis/spec
                                                 # 期望：无输出

# mock 与 api 路径同源（AC7）
grep -n "OTP_SEND_PATH\|OTP_VERIFY_PATH\|INTEGRATION_PREFIX" apps/iam-web/src/mocks/otp-handlers.ts
```

## 手工端到端（AC4/AC5/AC7 —— 无自动化覆盖，见 design DD8）

三条路径都要走到，**不能只走 happy path**：

1. **独立态**：`cd apps/iam-web && VITE_IAM_USE_MOCK=true pnpm dev`（:8081）直开登录页
   - happy path：输邮箱 → 发码 → 倒计时 60s 启动 → 输 `123456` → 验码成功 → 本地持会话并跳 `/home`
   - **失败分支**：验码输 `12345`（非 6 位）→ 断言弹窗内显示 mock 的 `验证码错误或已过期`
     （DD4 的行为增量：后端 `msg` 应能透出）；发码留空邮箱 → 断言登录页 inline 错误
2. **集成态**：宿主 `pnpm dev`（:5173）+ iam `VITE_IAM_USE_MOCK=true pnpm dev`（:8081），
   访问 `/iam/login` 走同一组用例；确认请求路径带 `/iam` 前缀且被 mock 拦下（不是 404）
3. **无 mock 直连**（可选但推荐）：`VITE_IAM_USE_MOCK=false`，确认请求确实穿透（404 / 网络错误提示
   正常展示，不静默降级）

> 改动前 `VITE_IAM_USE_MOCK=true` 下这两种模式**都是 404**（F11）。若手工验证时仍 404，
> 说明 mock 路径派生没生效——先查 `endpoints.ts` 常量是否真的被 mock import。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| `src/pages/LoginPage.tsx` | 改动最集中；双态解包逻辑搬家时易丢分支 | S2 的归一化助手必须逐字覆盖原 `unwrap` + 成功判定 + 取数三处语义；手工清单要求走失败分支 |
| `src/api/auth.ts` | 错误提取的四级顺序依赖传输层实际抛出形态（DD4） | design 已按 `preset-interceptors.ts:21-56` 的实际行为推导；手工验证失败分支可证 |
| `src/mocks/otp-handlers.ts` | 从字面量切到常量派生，若常量写错则 mock 与 api 同错（DD5 已知代价） | 以 README 的 curl 路径与 `supabase/functions/iam/index.ts` 为外部基准逐字核对 |
| README / spec | 纯文档，无运行影响 | — |

回滚点：S1–S4 为一次可编译的最小集（S4 之前页面仍用旧字面量，S2 之后旧字面量可删）；
整体 revert 单次提交即可，无数据/构建配置耦合。

## `task.py start` 前的待确认项

- design DD4 的行为增量：后端 `msg` 开始透出到 UI（现状会在多数失败路径丢成通用文案）——
  若要保持旧文案行为需回退该点。
- design DD5 的代价：mock 失去契约独立性（已在提问中确认采纳）。
