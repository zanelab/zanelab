# iam-web

qiankun 子应用：承载 portal 登录页（`/iam/login`）+ 系统管理页。认证走云 Supabase email+OTP 两步登录。

```
src/
  pages/LoginPage.tsx        # 登录页（邮箱发码 → 验证弹窗）
  pages/OtpVerifyModal.tsx   # OTP 验证弹窗（6 位码 + 重发倒计时共享）
  locales/                   # 语言模块（zh-CN / en-US）
  utils/http.ts              # http 兼容封装（集成态/独立态；任务 10-29 后为 RequestClient 组装）
  mocks/                     # MSW mock handlers
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

- `apps/iam-web/.env.development`：`VITE_IAM_API_TARGET=https://<ref>.supabase.co/functions/v1/iam`
- 集成态代理在 portal-web 的 vite.config.ts 中配置（`/iam/api` → 转发到 iam dev server 或云）

## mock 路线

mock 用 MSW，handler 在 `src/mocks/otp-handlers.ts`，契约与 Edge Fn 一致：

- 发码恒返 success（300ms 模拟延迟）
- 验码接受任意 6 位数字（测试用 `123456`）
- 验码成功返回 mock 会话

### 集成态

```
/iam/* → portal 代理 → iam dev server (:8081) → iam MSW worker 拦截
```

### 独立态

```bash
cd apps/iam-web && pnpm dev   # .env.development VITE_IAM_USE_MOCK=true
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
