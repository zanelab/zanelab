# iam-web

qiankun 子应用：承载 portal 登录页（`/iam/login`）+ 系统管理页。认证走云 Supabase email+OTP 两步登录；菜单管理是 iam 首个业务域（RBAC 数据底座随迁移落地）。

```
src/
  pages/LoginPage.tsx        # 登录页（邮箱发码 → 验证弹窗）
  pages/OtpVerifyModal.tsx   # OTP 验证弹窗（6 位码 + 重发倒计时共享）
  pages/MenuManagementPage.tsx # 菜单管理页（树形表格 + CRUD，iam 首个业务域）
  api/                       # 接口层：endpoints.ts 路径常量 + auth/menus 域 api
  props.ts                   # props 契约与状态（类型 + getProps/setProps；无副作用可测试）
  locales/                   # 语言模块（zh-CN / en-US）
  utils/http.ts              # http 兼容封装（集成态/独立态；任务 10-29 后为 RequestClient 组装）
  utils/menu-tree.ts         # 菜单树纯函数（buildTree/flatten/countWithDescendants）
  mocks/                     # MSW mock handlers（路径从 src/api/endpoints.ts 派生）
.env.example                # env 模板（VITE_USE_MOCK / VITE_PROXY_TARGET / VITE_API_KEY；真实值 copy 成 .env）
supabase/
  config.toml                # CLI 配置（verify_jwt = false）
  migrations/0001_rbac_init.sql # RBAC 底座：menus/roles/user_roles/role_permissions + 注册触发器
  functions/iam/index.ts     # Edge Function（OTP send + verify；菜单 list/CRUD）
```

## 认证契约

| 端点 | 方法 | 请求头 | 请求体 | 成功出参（envelope `{code,data,msg}` 的 data） |
| --- | --- | --- | --- | --- |
| `/auth/otp/send` | POST | `Accept-Language: zh-CN` | `{ email }` | `{ success: true }` |
| `/auth/otp/verify` | POST | `Accept-Language: zh-CN` | `{ email, code }` | `{ token, refreshToken, user: { id, username, email } }` |

错误消息根据 `Accept-Language` 返回中文或英文；缺省 zh-CN。

## 菜单契约（RBAC；任务 11-04 修订后）

| 端点 | 方法 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `/auth/menus` | GET | 匿名可调 | 无/无效 JWT → 游客可见子集（`hidden=false + scopes 含 C（客户端） + 非按钮` + 祖先链）；有效 JWT → 按用户角色权限过滤；admin（权限含 `*`）→ 全量 |
| `/menus` | POST | 仅 admin | 无 JWT → 1010/401；非 admin → 1011/403；**类型联动校验违例 → 1014/400**；编码（code）由服务端自动生成（`m_<id>`，请求不携带） |
| `/menus/:id` | PUT | 仅 admin | 更新（缺省字段沿用行值后再校验；编码不可改——body.code 忽略） |
| `/menus/:id` | DELETE | 仅 admin | 删除（FK 级联子树；id 不存在 → 1013/404） |

**类型联动矩阵**（前端弹窗与 Edge Fn 同一语义，绕过前端直调 API 同样被拦）：

| type | uri | component | icon/active_icon | pid（父级菜单） |
| --- | --- | --- | --- | --- |
| app（默认） | **必填**（应用路由） | 选填 | 选填 | 可为根 |
| group | 不入库 | — | — | **必填** |
| menu | **必填**（组件路由） | 选填 | 选填 | **必填** |
| button | 不入库 | — | — | **必填** |

`scopes` = 适用范围多选（**A=管理端 / C=客户端**，必填至少一项）；**含 C 即游客可见**。

### 会话刷新（独立态 401 单飞的数据源；任务：token refresh）

| 端点 | 方法 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `/auth/refresh` | POST | 匿名（凭 refresh_token 本身） | `{ refreshToken }` → GoTrue 轮换（grant_type=refresh_token）→ `{ token, refreshToken }` 双发；失效 1004/401（前端单飞失败 → 跳登录）。**GoTrue rotate 语义：旧 refresh_token 一次性**，调用方须覆盖本地双 token |

### 用户契约（任务 11-05）

| 端点 | 方法 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `/auth/users` | GET | 仅 admin | service role 列 `auth.users` + `user_roles`/`roles` 聚合（email/角色/`banned_until`/时间） |
| `/users/:id/roles` | PUT | 仅 admin | 全量替换角色绑定（`{ roles: string[] }`，码须在 `roles` 表）；1016 = 角色码无效 |
| `/users/:id/ban` | PUT | 仅 admin | 禁用/恢复（`{ disabled: boolean }`）→ `auth.admin.updateUserById` 置 GoTrue `banned_until`；**自禁 1015**；被禁用户下次 OTP 登录由 GoTrue 拒绝 |

用户域的读与写均走 `ctx.supabaseAdmin`（`withSupabase` 提供的 secret-key client）—— `auth` schema 对 publishable key 不可见。页面路由 `/iam/users`（权限码 `system:user:list` 由 admin `*` 通配命中，未单独种子——用户确认）。

- **RBAC 初始化**（`supabase/migrations/0001_rbac_init.sql`）：首个注册用户自动成为 `admin`（`auth.users` INSERT 触发器，`user_roles` 空表判定），其余注册用户默认 `guest`；角色权限种子随迁移写入（admin: `*` + `system:menu:*`；guest: 无——只能看公开子集）。
- **表结构（11-04 修订，已并入初始化迁移 0001）**：无 `menu_type`（与 type 重复）与 `parent`（旧树冗余，宿主消费端零使用，pid 单源承载树形）；有 `active_icon`（激活态图标，app/menu 类型成对使用）；`scopes` 值域 A/C。字段名与旧 `RawMenuItem` 契约已脱钩——宿主 `fetchMenus` 将来切数据源时 `transformMenu` 需做一层映射。
- **不启用 RLS**：Edge Fn 是唯一写入口，前端不直连 Postgres；将来若引入 supabase-js 直查，必须先补 RLS。

## 部署

```bash
# 部署 Edge Function（Auth 用 Supabase 内置表；菜单功能需先执行迁移）
pnpm exec supabase functions deploy iam --no-verify-jwt --project-ref <ref>
# 迁移（本地：supabase start 后 db reset 自动重放；云上：db push 或控制台执行 SQL）
pnpm exec supabase db push --project-ref <ref>

# 部署验证（直连云 Supabase 网关须带 apikey —— publishable key；本地
# supabase start 无鉴权、不需 apikey）
curl -X POST https://<ref>.supabase.co/functions/v1/iam/auth/otp/send \
  -H 'content-type: application/json' \
  -H 'accept-language: zh-CN' \
  -H "apikey: <publishable-key>" \
  -d '{"email":"admin@example.com"}'
# → {"code":0,"data":{"success":true},"msg":"ok"}

curl -X POST https://<ref>.supabase.co/functions/v1/iam/auth/otp/verify \
  -H 'content-type: application/json' \
  -H 'accept-language: zh-CN' \
  -H "apikey: <publishable-key>" \
  -d '{"email":"admin@example.com","code":"123456"}'
# → {"code":0,"data":{"token":"eyJ...","refreshToken":"...","user":{...}},"msg":"ok"}

# 菜单列表（匿名 → 游客子集；带 Authorization: Bearer <JWT> → 按权限）
curl -X POST https://<ref>.supabase.co/functions/v1/iam/auth/menus \
  -H "apikey: <publishable-key>"
# 新建菜单（仅 admin；Bearer 用登录返回的 token）
curl -X POST https://<ref>.supabase.co/functions/v1/iam/menus \
  -H 'content-type: application/json' \
  -H "apikey: <publishable-key>" \
  -H "authorization: Bearer <access-token>" \
  -d '{"code":"roles","name":"角色管理","uri":"/roles","type":"menu","sort":3}'
# → {"code":0,"data":{...新节点...},"msg":"ok"}
```

控制台需确保：Email provider 已启用。

## 前端指向云

- 本应用**无**「云目标」环境变量：请求路径 = `src/api/endpoints.ts` 常量 + `props.basename` 派生的前缀（集成态 `/iam`，独立态空）。
- 集成态转发目标由**宿主**配置：copy `apps/portal-web/.env.example` 为 `.env`，填 `VITE_PROXY_TARGET`（留空 → 回落到 `http://localhost:8081`，即本应用 dev server；指向云则填 `https://<ref>.supabase.co`）。同文件填 `VITE_API_KEY`（publishable key）后，dev proxy 转发 `/iam/functions/v1` 时自动附加 `apikey` 头（云直连必需；本地 `supabase start` 无鉴权可不填）。本机临时覆盖用 shell 变量，宿主 vite.config 里 `process.env` 优先于 `.env` 文件：`VITE_PROXY_TARGET=https://<ref>.supabase.co pnpm dev`。
- 代理规则在 `apps/portal-web/vite.config.ts`：`/iam/functions/v1` → 剥掉 `/iam` 前缀后转发（云直连时目标需指到 `https://<ref>.supabase.co`，路径里的 `functions/v1/iam` 由请求自带的函数名段承担）。
- **独立态直连云**：copy 本应用 `.env.example` 为 `.env` 填 `VITE_API_KEY`，请求拦截器自动附加 `apikey` 头。集成态的 apikey 来自宿主（portal 请求拦截器读其 `config.js` 的 `api.apiKey` 注入，dev/prod 一致）。

## 接口层（src/api）

所有 `/functions/v1/...` 调用收敛在 `src/api/`，页面不出现路径字面量：

- `src/api/endpoints.ts` —— **零依赖**路径常量（OTP 与菜单的全部端点 + `INTEGRATION_PREFIX`）。零依赖是硬要求：MSW worker 也 import 它，引入应用入口会把整个 bundle 拖进 worker。
- `src/api/auth.ts` —— 认证域命名空间对象 `authApi`，层内完成 URL 拼装（前缀运行时从 `props.basename` 派生）、双形态归一化、成功判定与错误语义（失败一律 `throw Error(msg)`）；页面只拿领域对象（`LoginSession`）。
- `src/api/menus.ts` —— 菜单域 `menusApi`（list/create/update/remove），形态同 auth；`MenuItemRecord` 对齐旧项目 `RawMenuItem` 契约（portal 侧同名类型私有，apps 间不互引故按契约复制定义）。
- mock（`src/mocks/otp-handlers.ts`、`src/mocks/menu-handlers.ts`）从同一组常量派生 handler 路径——路径漂移在结构上不可能发生。

## 测试

vitest + jsdom + @testing-library + MSW node server（配置对齐 portal-web）：

```bash
pnpm --filter @zanelab/iam-web test    # 或 cd apps/iam-web && pnpm test
```

覆盖：`utils/menu-tree.ts` 纯函数、`api/menus.ts` 归一化与错误提取、`MenuManagementPage` 核心交互（渲染/展开/新增/删除/游客只读）。**不测 main.tsx**（qiankun 入口在 jsdom 与 vite-plugin-qiankun 冲突）——props 契约与状态已抽到 `src/props.ts`（无副作用模块），api 层的 import 链不经过入口。

## mock 路线

mock 用 MSW，handler 在 `src/mocks/otp-handlers.ts`（OTP）与 `src/mocks/menu-handlers.ts`（菜单），契约与 Edge Fn 一致：

- 发码恒返 success（300ms 模拟延迟）
- 验码接受任意 6 位数字（测试用 `123456`）
- 验码成功返回 mock 会话
- 菜单：内存数据模拟 CRUD；**身份按 `Authorization` 头判定**—— `Bearer mock-admin` → 全量 + 可写；无/Bearer mock-guest → 游客子集 + 写 403。独立态切换身份：devtools 里 `localStorage.iam_token = 'mock-admin'` 后刷新。

### 集成态

```
/iam/functions/v1/* → portal 代理（剥 /iam）→ iam dev server (:8081) → iam MSW worker 拦截
```

### 独立态

```bash
# 路线 A：走 mock（不发真实请求）
cd apps/iam-web && VITE_USE_MOCK=true pnpm dev
# 或 copy .env.example 为 .env 后把 VITE_USE_MOCK 填 true（缺省不填 = 关）

# 路线 B：连云 Supabase（须关 mock，否则 worker 先拦截）
#   .env 填 VITE_PROXY_TARGET=https://<ref>.supabase.co（基址）与 VITE_API_KEY=<publishable key>
VITE_PROXY_TARGET=https://<ref>.supabase.co VITE_API_KEY=<key> pnpm dev
```

> 独立态的 `/functions/v1/*` 是相对路径，落点就是本 dev server——**没有 `VITE_PROXY_TARGET` 时它直接 404**（2026-11-01 实测）。这是 iam 侧 dev proxy 存在的唯一理由；与 mock 正交： `VITE_USE_MOCK=true` 时 SW 在页面层先拦截，请求到不了代理。

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
pnpm test                    # vitest 单测
pnpm exec tsc --noEmit       # 类型检查
```
