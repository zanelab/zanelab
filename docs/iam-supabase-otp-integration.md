# iam 登录页对接云 Supabase —— 详细实施手册

> 对应任务：archive/2026-10/10-25-supabase-iam-login-page（前端已完成，commit 6fdaf80）。本手册覆盖 **云端 + Edge Fn + 前端联调** 三层的全部落地步骤。前端契约已冻结（下方 §2），Edge Fn 侧实现恢复自 M1 stash（`git stash@{0}`，WIP: 10-19-m1-supabase-iam-backend）。

---

## 0. 前置条件

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Supabase 云项目 | **未提供 ref** | 控制台 https://supabase.com/dashboard 建项目，ref 在项目 URL 里（`https://supabase.com/dashboard/project/<ref>`） |
| supabase CLI | ✅ devDependencies 2.121.0 | `pnpm exec supabase --version` 验证 |
| M1 工件 | ✅ 在 `git stash@{0}` | migrations ×4 / Edge Fn 单文件 / scripts / README，见 §1 恢复 |
| 前端 | ✅ 已完成 | LoginPage + OtpVerifyModal + 语言模块；`VITE_IAM_API_TARGET=` 留空占位 |

需要 deno 在 PATH（仅 `functions:check` 类型检查用，不装不阻塞部署）。

---

## 1. 恢复 M1 工件（stash → 工作区）

M1 工件含 password 登录版 Edge Fn；**OTP 两路由（otp/send / otp/verify）不在其中**，需按 §3 新增。恢复方式（stash pop 会连带恢复任务文档，推荐只取需要的文件）：

```bash
# 查看 stash 内容清单
git show 'stash@{0}^3' --stat

# 恢复全部 untracked 工件（apps/iam 子应用 + 仓根 supabase/ + scripts/）
git checkout 'stash@{0}^3' -- apps/iam supabase scripts/create-admin.mjs scripts/sync-migrations.mjs packages/utils/src/supabase-client

# 注意：apps/iam/package.json 在 stash 父提交（^2）里，单独取：
git checkout 'stash@{0}^2' -- apps/iam/package.json
```

恢复后的关键文件：

```
apps/iam/supabase/functions/iam/index.ts   # Edge Fn 单入口（需加 OTP 路由，§3）
apps/iam/supabase/config.toml              # verify_jwt = false
apps/iam/supabase/migrations/iam_000{1..4}*.sql   # schema/RLS/claims hook/seed
supabase/config.toml + supabase/README.md  # CLI 工作目录 + 云模式文档
scripts/sync-migrations.mjs                # 收集 apps/*/migrations → 仓根 supabase/migrations/
scripts/create-admin.mjs                   # GoTrue admin API 建管理员
```

> stash 里另有 `.trellis/tasks/10-19-m1-supabase-iam-backend/` 任务文档（design.md 有 claims/RLS 设计细节），需要设计背景时一并恢复。

---

## 2. 前端契约（已冻结，Edge Fn 按此实现）

### 2.1 路由与 envelope

前端经宿主共享 axios（`props.http`）请求，**baseURL 由宿主 http 实例决定**，iam只发相对路径；成功响应经宿主拦截器解包（直接返回 `body.data`），前端已做双形态兼容。

| 路由 | 方法 | 请求体 | 成功出参（envelope 包裹前） |
| --- | --- | --- | --- |
| `/api/v1/auth/otp/send` | POST | `{ email }` | `{ success: true }` |
| `/api/v1/auth/otp/verify` | POST | `{ email, code }` | `{ token, refreshToken, user: { id, username, email } }` |

- envelope：`{ code: 0, data: <上表出参>, msg: 'ok' }`；失败 `{ code: <非0>, data: null, msg: '<中文>' }`
- 错误码沿用 M1 风格：1001 invalid json / 1002 缺参 / 1003 验证码错误或已过期 / 2xxx 内部错误
- CORS：函数内联 `Access-Control-Allow-Origin: *`（M1 版已带，OPTIONS 预检直接 200）
- 说明：M1 stash 无 OTP 路由（grep 验证为空），以上两路由是 10-25 任务新定契约；发码出参形状对齐 legacy `/sys/auth/otp` 先例（`{ success: true }`）

### 2.2 寻址与代理

```
集成态（登录页请求带 /iam 前缀，从 props.basename 派生）：
浏览器 → portal axios /iam/api/* → portal 配置代理（剥 /iam）→ ${VITE_IAM_API_TARGET}/api/*   （dev/prod 同模式）
真实后端 Edge Fn 实际 URL：https://<ref>.supabase.co/functions/v1/iam/api/v1/auth/otp/send
mock 路线 target = http://localhost:8081（iam dev server，剥前缀后由 iam 的 MSW worker 拦截）
```

所以：**`VITE_IAM_API_TARGET=https://<ref>.supabase.co/functions/v1/iam`** （Edge Fn 按函数名寻址，`/functions/v1/iam` 之后的 path 原样传入函数内部分发）。

### 2.3 前端已就位的行为（无需改动）

- 发码成功 → 60s 倒计时 + 弹出验证弹窗；验码成功 → `props.onLoginSuccess({ token, refreshToken, user })` 交还宿主 bootstrapSession
- 验证码输入：6 位数字，daisyUI otp 组件自带跳格/退格/粘贴分发
- 错误不静默：envelope msg / 网络错误文案直接展示在错误提示区
- 语言：文案随基座 `preferences.locale` 切换（zh-CN/en-US 两包）

---

## 3. Edge Fn 增补 OTP 路由（唯一需要写代码的点）

在恢复出的 `apps/iam/supabase/functions/iam/index.ts` 的 `Deno.serve` 分发表中加两条：

```ts
// ---- auth 域（匿名）----
if (method === 'POST' && path.endsWith('/api/v1/auth/otp/send'))
  return await authOtpSend(req);
if (method === 'POST' && path.endsWith('/api/v1/auth/otp/verify'))
  return await authOtpVerify(req);
```

实现（GoTrue 原生两步，service_role client 调用）：

```ts
// 步骤 1 发码：GoTrue signInWithOtp 向邮箱发 6 位验证码
// 说明：service_role 调 signInWithOtp 不受「confirm email 才能登录」限制；
// create_user 缺省 true——邮箱未注册时 GoTrue 自动建号（免注册登录）。
// 如需「仅已注册邮箱可登录」，传 { create_user: false }，未注册返回 error 1008。
async function authOtpSend(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body?.email) return error(1002, 'email is required');
  const sb = getServiceClient();
  const { error: otpErr } = await sb.auth.signInWithOtp({
    email: body.email,
    options: { shouldCreateUser: true }, // 按业务取舍，见上注释
  });
  // 恒返 success：不向客户端泄露邮箱是否已注册（防枚举）；真实发送失败记日志
  if (otpErr) console.error('[iam] otp send failed:', otpErr.message);
  return json({ success: true });
}

// 步骤 2 验码：verifyOtp 换取 session（access_token/refresh_token）
async function authOtpVerify(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.code)
    return error(1002, 'email and code are required');
  const sb = getServiceClient();
  const { data, error: vErr } = await sb.auth.verifyOtp({
    email: body.email,
    token: String(body.code),
    type: 'email',
  });
  if (vErr || !data?.session) return error(1003, '验证码错误或已过期', 401);

  // 出参形状对齐 M1 authLogin（token/refreshToken/user 三元组）
  const { data: iamUser } = await sb
    .from('users')
    .select('user_id, username, email')
    .eq('user_id', data.user.id)
    .maybeSingle();
  return json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.user.id,
      username: iamUser?.username ?? body.email.split('@')[0],
      email: iamUser?.email ?? body.email,
    },
  });
}
```

> GoTrue 侧安全参数（云控制台 Authentication → Providers → Email 或 config auth 段）：OTP 有效期缺省 1 小时、可调 `otp_expiry`；发码频率限制由 GoTrue 内置（同邮箱重发有 cooldown，超限返回 429——前端已有 60s 倒计时防抖，正常路径不会触发）。 **邮件模板**：控制台 Authentication → Emails → 模板 `{{ .Token }}` 即 6 位码；生产换自定义 SMTP（控制台 Project Settings → Auth → SMTP），否则走 Supabase 内置发件（限流严格，仅够开发用）。

---

## 4. 云端落地步骤（一次执行）

```bash
# 1) 关联云项目（一次性；写进 supabase/.temp，不入库）
pnpm exec supabase link --project-ref <ref>

# 2) 收集各子应用 migrations → 仓根 supabase/migrations/（__synced___* 前缀）
node scripts/sync-migrations.mjs

# 3) 应用全部 migration（iam_0001 schema → 0002 RLS → 0003 claims hook → 0004 seed）
pnpm exec supabase db push

# 4) 配置 claims hook（M1 设计 D5——把 iam claims 注入 JWT）
#    控制台 Authentication → Hooks → Custom Access Token Hook → 选 iam.custom_access_token_hook
#    （或 `pnpm exec supabase config push`，hook 段在 supabase/config.toml）

# 5) 部署 Edge Fn（单入口一条命令；--workdir 指 apps/iam/supabase）
pnpm exec supabase functions deploy iam --workdir apps/iam/supabase --project-ref <ref>

# 6) （可选）建平台管理员（GoTrue 用户无法纯 SQL seed；登录后可走 OTP 或密码）
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
node scripts/create-admin.mjs admin@zanelab.local <password> admin
```

控制台手工项核对清单：

- [ ] Authentication → Providers → Email：Enable + Confirm email（按 §3 取舍）
- [ ] Authentication → Hooks：custom_access_token_hook 已选
- [ ] Authentication → URL Configuration：Site URL 填 portal dev/prod 域名
- [ ] Project Settings → API：记下 `service_role` key（只服务端用，勿入前端）
- [ ] （生产）SMTP 配置

---

## 5. 前端联调配置

```bash
# apps/iam-web/.env.development（占位注释已就位，填入实际值）
VITE_IAM_API_TARGET=https://<ref>.supabase.co/functions/v1/iam
```

代理注册（**vite.config.ts 是用户本地文件**——由用户自行加，或明确授权后代加；约定见 M1 stash `<APP>_API_TARGET` 通配模式）：

```ts
// apps/portal-web/vite.config.ts server.proxy 增加（集成态登录页请求带 /iam 前缀，
// 前缀从 props.basename 派生；宿主调子应用接口一律经配置代理转发）：
'/iam/api': {
  target: 'http://localhost:8081',  // mock = iam dev server；接云改 ${VITE_IAM_API_TARGET}
  changeOrigin: true,
  secure: false,
  rewrite: (p) => p.replace(/^\/iam/, ''),  // 剥 /iam 前缀 → /api/v1/auth/otp/send
},
```

> 拓扑说明：登录页请求虽经 **宿主 portal 的 axios** 发出（props.http 共享实例，URL 带 `/iam/api` 前缀），但代理把它**转发到 iam 自己的 dev server**（mock 时）或云 Edge Fn（真实时）——**宿主 worker 不登记 iam 路由**（宿主 handlers.ts 只持有宿主自身 mock 契约，子应用 mock 由 iam worker 承担，见 apps/iam-web/README.md mock 一节）。target 留空时代理不注册/404——UI 正常渲染，请求失败展示错误提示区，属预期（不静默降级）。

联调自检链路：

1. `pnpm dev`（portal-web）→ 打开 `/iam/login`
2. 输邮箱 → 获取验证码 → 收 Supabase 邮件（内置 SMTP 或自配）
3. 弹窗输入 6 位码 → 验证 → `onLoginSuccess` 交还宿主 → 跳 `/home`

---

## 6. 验证清单（对接完成判据）

```bash
# 直连云函数（不经前端）——发码
curl -X POST https://<ref>.supabase.co/functions/v1/auth/otp/send \
  -H 'content-type: application/json' \
  -d '{"email":"admin@zanelab.local"}'
# 期望 {"code":0,"data":{"success":true},"msg":"ok"}，邮箱收到 6 位码

# 验码（<code> 换成邮件里的码）
curl -X POST https://<ref>.supabase.co/functions/v1/auth/otp/verify \
  -H 'content-type: application/json' \
  -d '{"email":"admin@zanelab.local","code":"<6位码>"}'
# 期望 {"code":0,"data":{"token":"eyJ...","refreshToken":"...","user":{...}},"msg":"ok"}

# 经代理联调（portal dev 起后）
curl -X POST http://localhost:5173/iam/api/api/v1/auth/otp/send -H 'content-type: application/json' -d '{"email":"admin@zanelab.local"}'
```

- [ ] `supabase db push` 全部 migration 成功（4 个 iam_000*）
- [ ] claims hook 控制台可见且已选
- [ ] Edge Fn deploy 成功（`supabase functions list` 可见 iam）
- [ ] §6 curl 直连两路由全绿
- [ ] 前端全链路：发码 → 邮件 → 弹窗验码 → 登录成功跳 home
- [ ] 基座切语言（偏好面板）→ 登录页/弹窗文案跟随
- [ ] 基座改主题色/圆角/暗色 → 页面随 preferences props 变化
- [ ] iam tsc/build + portal tsc/vitest 基线守恒（回归）

## 7. 已知边界与风险

- **发码防枚举**：§3 `authOtpSend` 恒返 success（真实失败仅日志）——若业务要求「未注册邮箱报错」，改为返回 error 1008，但会泄露邮箱注册状态
- **GoTrue 邮件限流**：内置 SMTP 每小时配额极低（约 2 封/小时量级），联调务必尽早配自定义 SMTP，否则倒计时冷却期容易撞 429
- **verify_jwt = false**：平台层不校验 JWT，token 由函数内 verifyJwt 自验（M1 决策 D 系）；需要平台层校验时改 apps/iam/supabase/config.toml 并重部署
- **JWT 校验是 M1 最简版**（格式+过期，无验签）：生产前应补 JWKS 验签（M1 design 已列为 M2 项）
- **邮箱大小写**：GoTrue 邮箱不区分大小写，`iam.users.email` 查询比对需 lower()（M1 authLogin 已按原样精确匹配，OTP 路径不查表无此问题）
