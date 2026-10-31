# iam-web

qiankun 子应用：承载 portal 登录页（`/iam/login`）+ 系统管理页。认证走云 Supabase email+OTP 两步登录。

```
src/
  pages/LoginPage.tsx        # 登录页（邮箱发码 → 验证弹窗）
  pages/OtpVerifyModal.tsx   # OTP 验证弹窗（6 位码 + 重发倒计时共享）
  api/                       # 接口层：endpoints.ts 路径常量 + auth.ts 认证域 api
  locales/                   # 语言模块（zh-CN / en-US）
  utils/http.ts              # http 兼容封装（集成态/独立态；任务 10-29 后为 RequestClient 组装）
  mocks/                     # MSW mock handlers（路径从 src/api/endpoints.ts 派生）
supabase/
  config.toml                # CLI 配置（verify_jwt = false）
  functions/iam/index.ts     # Edge Function（OTP send + verify）
```

## 认证契约

| 端点 | 方法 | 请求头 | 请求体 | 成功出参（envelope `{code,data,msg}` 的 data） |
| --- | --- | --- | --- | --- |
| `/auth/otp/send` | POST | `Accept-Language: zh-CN` | `{ email }` | `{ success: true }` |
| `/auth/otp/verify` | POST | `Accept-Language: zh-CN` | `{ email, code }` | `{ token, refreshToken, user: { id, username, email } }` |

错误消息根据 `Accept-Language` 返回中文或英文；缺省 zh-CN。

## 部署

```bash
# 部署 Edge Function（无需 db push，Auth 用 Supabase 内置表）
pnpm exec supabase functions deploy iam --no-verify-jwt --project-ref <ref>

# 部署验证
curl -X POST https://<ref>.supabase.co/functions/v1/iam/auth/otp/send \
  -H 'content-type: application/json' \
  -H 'accept-language: zh-CN' \
  -d '{"email":"admin@example.com"}'
# → {"code":0,"data":{"success":true},"msg":"ok"}

curl -X POST https://<ref>.supabase.co/functions/v1/iam/auth/otp/verify \
  -H 'content-type: application/json' \
  -H 'accept-language: zh-CN' \
  -d '{"email":"admin@example.com","code":"123456"}'
# → {"code":0,"data":{"token":"eyJ...","refreshToken":"...","user":{...}},"msg":"ok"}
```

控制台需确保：Email provider 已启用。

## 前端指向云

- 本应用**无**「云目标」环境变量：请求路径 = `src/api/endpoints.ts` 常量 + `props.basename` 派生的前缀（集成态 `/iam`，独立态空）。
- 集成态转发目标由**宿主**配置：`apps/portal-web/.env.development` 的 `VITE_PROXY_TARGET` （留空 → 回落到 `http://localhost:8081`，即本应用 dev server；指向云则填 `https://<ref>.supabase.co`）。本机临时覆盖用 shell 变量，宿主 vite.config 里 `process.env` 优先于 `.env` 文件：`VITE_PROXY_TARGET=https://<ref>.supabase.co pnpm dev`。
- 代理规则在 `apps/portal-web/vite.config.ts`：`/iam/functions/v1` → 剥掉 `/iam` 前缀后转发（云直连时目标需指到 `https://<ref>.supabase.co`，路径里的 `functions/v1/iam` 由请求自带的函数名段承担）。

## 接口层（src/api）

所有 `/functions/v1/...` 调用收敛在 `src/api/`，页面不出现路径字面量：

- `src/api/endpoints.ts` —— **零依赖**路径常量（`INTEGRATION_PREFIX` / `OTP_SEND_PATH` / `OTP_VERIFY_PATH`）。零依赖是硬要求：MSW worker 也 import 它，引入应用入口会把整个 bundle 拖进 worker。
- `src/api/auth.ts` —— 认证域命名空间对象 `authApi`，层内完成 URL 拼装（前缀运行时从 `props.basename` 派生）、双形态归一化、成功判定与错误语义（失败一律 `throw Error(msg)`）；页面只拿领域对象（`LoginSession`）。
- mock（`src/mocks/otp-handlers.ts`）从同一组常量派生 handler 路径——路径漂移在结构上不可能发生。

## mock 路线

mock 用 MSW，handler 在 `src/mocks/otp-handlers.ts`，契约与 Edge Fn 一致：

- 发码恒返 success（300ms 模拟延迟）
- 验码接受任意 6 位数字（测试用 `123456`）
- 验码成功返回 mock 会话

### 集成态

```
/iam/functions/v1/* → portal 代理（剥 /iam）→ iam dev server (:8081) → iam MSW worker 拦截
```

### 独立态

```bash
cd apps/iam-web && VITE_IAM_USE_MOCK=true pnpm dev
# .env.development 缺省 VITE_IAM_USE_MOCK=false，须显式置 true 才启 mock
```

## http 兼容封装

`src/utils/http.ts` 统一处理集成态和独立态：

| 能力      | 集成态（qiankun）         | 独立态（直接 :8081）                |
| --------- | ------------------------- | ----------------------------------- |
| http.post | 透传宿主 `props.http`     | 本地 axios + envelope 解包          |
| 401       | 宿主 rejectSessionExpired | `window.location.replace('/login')` |
| 登录会话  | `props.onLoginSuccess`    | 本地 localStorage + 跳 `/home`      |

## 常用命令

```bash
pnpm dev                     # 独立 dev server :8081
pnpm build                   # 生产构建
pnpm exec tsc --noEmit       # 类型检查
```
