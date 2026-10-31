# Design — iam-web 接口层收敛

> 事实编号（F1…F11）见 [prd.md](./prd.md)。本文件记录技术设计与权衡。

## 决策记录

### DD1 · 三层分工

| 层 | 文件 | 职责 | 本次是否改 |
|---|---|---|---|
| 端点常量 | `src/api/endpoints.ts`（新建） | **零依赖**纯常量：路径片段、集成态代理前缀。供 api 层与 mock 共同 import | 新建 |
| 域 API | `src/api/auth.ts`（新建） | 命名空间对象；拼 URL、发请求、归一化响应、抛领域错误 | 新建 |
| 传输 | `src/utils/http.ts` | 集成态透传 `props.http` / 独立态本地 `RequestClient`；`post(path, body)` | **不改** |

`endpoints.ts` 必须**零 import**：mock worker 会在独立 bundle 中 import 它，若经由它引入 `getProps()`
（`src/main.tsx`）会把整个入口模块拖进 worker bundle，并可能形成环。

### DD2 · API 前缀单点派生（R3）

```ts
// src/api/endpoints.ts
/** 集成态宿主代理前缀 = 子应用 activeRule（见 portal-web config.js microApps） */
export const INTEGRATION_PREFIX = '/iam';

// src/api/auth.ts
function apiPrefix(): string {
  return (getProps().basename as string | undefined)?.replace(/\/$/, '') ?? '';
}
```

- 集成态：`props.basename === '/iam'` → 前缀 `/iam` → 完整路径 `/iam/functions/v1/iam/auth/otp/send`
  （宿主 `vite.config.ts` 的 `/iam/functions/v1` 代理剥掉 `/iam` 后转发）。
- 独立态：`props.basename` 缺省 → `''` → `/functions/v1/iam/auth/otp/send` 直落本 dev server。

**前缀仍在运行时从 props 派生**（不改成常量）：这是 F10「props 派生值缺省有义」的要求，也是独立运行性的
基础。`INTEGRATION_PREFIX` 常量**只**给 mock 用（它需要页面级完整路径，而此时无 props 可读）。
两处取值同源（都对应 activeRule `/iam`），若 activeRule 改名，`endpoints.ts` 的常量与
portal-web `config.js` 需同步——这一点在 R7 的 spec 里写明。

### DD3 · 返回形态归一化（R4 前半）

传输层实际只有两种结果（依据 `packages/utils/src/http/preset-interceptors.ts:21-56` 与
`apps/portal-web/src/utils/http.ts:8`）：

| 传输层行为 | 触发条件 |
|---|---|
| **resolve 解包后的 `data`** | 2xx 且 body 是 envelope 且 `code === 0` → 返回 `body.data` |
| **resolve 原 body** | 2xx 且 body **不含 `code` 字段**（非 envelope）→ 原样返回 |
| **reject** | HTTP 非 2xx，或 2xx 但 envelope `code !== 0`（抛 `{...response, response}`） |

所以 `{ code, data, msg }` 形态**不会**作为成功值到达调用方。但现有 `LoginPage` 的
`data?.code === 0 || data?.success || data?.data?.success`（`:141`）与
`data?.token ? data : data?.data`（`:186`）仍在兼容"未解包"形态——属防御性冗余。

api 层归一化策略：**保留一小段双形态读值（解包优先，envelope 兜底）**，但收敛为单一私有助手，
对外只暴露领域类型：

```ts
export interface LoginSession {
  token: string;
  refreshToken?: string;
  user?: { id?: number | string; username?: string; email?: string };
}

export const authApi = {
  /** 发码。成功无返回值；失败 throw Error(msg) */
  async sendOtp(email: string): Promise<void>,
  /** 验码。成功返回领域对象 LoginSession；失败 throw Error(msg) */
  async verifyOtp(email: string, code: string): Promise<LoginSession>,
};
```

**成功判定**：发码取 `success === true`（兼容 `data.success` 退出）；验码取 `token` 非空——
与现状语义等价，只是从页面搬进 api 层。**取数**：`data ?? res`（解包优先）。

### DD4 · 错误语义（R4 后半）

`authApi` 失败一律 `throw new Error(msg)`，`msg` 提取顺序：

```
error.response?.data?.msg   // AxiosError（HTTP 非 2xx）
  → error.data?.msg         // 2xx 但 envelope code!==0（解包层抛出的 {...response, response}）
  → error.message           // 普通 Error（网络/超时/兜底）
  → undefined               // 取不到 → 抛无 message 的 Error，交页面用 i18n
```

**行为增量（需评审确认）**：现状 `LoginPage` 的 `catch` 只看 `e instanceof Error`，故 2xx-envelope-失败
抛出的**非 Error 对象**会丢掉后端 `msg`，落到 i18n 兜底文案（`t('iam.login.networkError')`）；HTTP 非 2xx
时 `e.message` 是 axios 的 `"Request failed with status code 400"`，同样丢掉后端 `msg`。归一化后**后端
`msg` 能正常透出**（如 `验证码错误或已过期`）。这是本任务预期的改善，但属**用户可见的行为变化**，
需在 AC4/AC5 手工验证时确认可接受。

页面保留的职责：错误展示位置（登录页 inline / 弹窗内）+ i18n 兜底文案。即
`e.message || t('iam.login.sendFailed')` 形态。

### DD5 · mock 从常量派生（R8 / F11，已定）

```ts
// src/mocks/otp-handlers.ts
import { INTEGRATION_PREFIX, OTP_SEND_PATH, OTP_VERIFY_PATH } from '../api/endpoints';

/** 集成态页面 fetch 带 /iam 前缀（SW 拦截发生在宿主 proxy rewrite 之前），
 *  独立态无前缀——两种页面级路径都由常量派生，杜绝路径再次漂移 */
const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];
```

修正内容：现有字面量 `/iam/functions/v1/auth/otp/${suffix}` 与 `/functions/v1/auth/otp/${suffix}`
**均缺 `iam` 函数名段**，改为派生的 `/functions/v1/iam/auth/otp/{send,verify}` 及其带前缀形态。
同时修正 `otp-handlers.ts:9-10` 的契约注释（同样按错误路径描述）。

**代价（已知并接受）**：mock 不再独立声明契约——常量写错则两侧同错。换取的是路径漂移在结构上不可能
再发生；契约真伪由 `supabase/functions/iam/index.ts` 与 README 的 curl 作为外部基准。

### DD6 · 不动 `src/utils/http.ts`（Q3 已定）

spec 称 iam 的兼容层在 `apps/iam-web/src/http/compat.ts`，实际是 `src/utils/http.ts`，而 portal-web
同样用 `src/utils/http.ts`。两 app 实际一致，**改 spec 而非挪文件**（挪文件要动 import 与 spec 另三处引用，
收益为零）。

### DD7 · 注释修正范围（R6）

- `LoginPage.tsx` 头部契约注释 4 处（F7）——该文件本就要大改，留着假注释比不写更糟。
- `apps/iam-web/README.md:50-51,70`（F8）。
- `.trellis/spec/frontend/microfrontend-guidelines.md` 的兼容层路径（F8）。
- `supabase` 侧文档（`config.toml:28,35`）已正确，不动。

### DD8 · 验证缺口（显式记录）

iam-web 无测试基础设施（F9），本任务**不引入**（Q2 已定）。因此：

- api 层的双形态归一化与错误提取**没有自动化覆盖**——它们在 portal-web 是由 vitest 覆盖的那类逻辑。
- 唯一验证手段是 AC3 构建 + AC4/AC5/AC7 的手工端到端双模式确认。
- 这意味着**回归风险集中在"手工没走到的分支"**：非 envelope 响应、`code!==0` 的 2xx 响应、
  网络中断三种路径在手工验证中容易被跳过。故 implement 的手工清单要求**刻意触发失败分支**
  （用 mock 的 `fail()` 路径），而不是只走 happy path。

## 数据流

```
页面 LoginPage
  └─ authApi.sendOtp(email)                    ← 页面只给领域入参
       └─ apiPrefix() + OTP_SEND_PATH            ← 前缀+路径单点（DD2）
       └─ post(fullPath, { email })              ← utils/http.ts：集成态 props.http / 独立态本地 client
       └─ normalize(res) / extractMsg(err)       ← 双形态归一化 + 错误提取（DD3/DD4）
       │     ├─ 成功 → return（或 LoginSession）
       │     └─ 失败 → throw Error(msg)
  └─ try/catch：只决定展示位置与 i18n 兜底文案

mock（dev）                    ← 与 api 层共享 endpoints.ts 常量（DD5）
  mocks/otp-handlers.ts: pagePaths(OTP_SEND_PATH).map(p => http.post(p, ...))
```

## 改动边界

| 文件 | 改动 |
|---|---|
| `apps/iam-web/src/api/endpoints.ts` | 新建：零依赖常量（路径 + 集成态前缀） |
| `apps/iam-web/src/api/auth.ts` | 新建：`authApi = { sendOtp, verifyOtp }` + `LoginSession` |
| `apps/iam-web/src/pages/LoginPage.tsx` | 删 `apiPrefix`/`apiUrl`/response 类型/`unwrap`/成功判定/取数；改调 `authApi`；修头部 4 处注释 |
| `apps/iam-web/src/mocks/otp-handlers.ts` | 路径改由常量派生（DD5）；修文件头契约注释 |
| `apps/iam-web/README.md` | 修 F8 三处（`VITE_IAM_API_TARGET`、`/iam/api`、mock 开关值） |
| `.trellis/spec/frontend/microfrontend-guidelines.md` | 兼容层路径改 `src/utils/http.ts`；补 R7 约定 |

**不改动**：`src/utils/http.ts`、`src/main.tsx`、`src/pages/OtpVerifyModal.tsx`（纯展示，不持请求）、
`supabase/**`、portal-web 任何文件。

## 相容性与风险

- **契约面**：不新增跨应用契约。props 消费仍全部收敛在 `src/utils/http.ts`（业务层无 props 分支不变）。
- **独立运行性**：DD2 保持 props 缺省有义；api 层不引入新的 props 依赖。
- **行为变化**：仅 DD4 的错误文案透出（已知、需确认）。其余路径行为等价。
- **回滚**：无数据迁移、无构建配置变化。回滚 = revert 提交。

## 待评审确认项

1. DD4 的行为增量（后端 `msg` 开始透出到 UI）是否接受。
2. DD5 的代价（mock 失去契约独立性）是否接受——已在提问中确认，此处复述以供复核。
