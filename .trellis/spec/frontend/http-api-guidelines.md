# HTTP 与数据请求

> 本项目 HTTP 层是 **vben request-client 架构**（任务 10-29-vben-request-client）：共享原语在 `packages/utils/src/http/`（`RequestClient` 类 + InterceptorManager + 三个预置拦截器工厂 + uploader/downloader/SSE 模块），业务组装在各 app 的 `src/utils/http.ts`。业务代码不要自建 `axios.create()`，不要重复写拦截器。

## 架构分层

```
packages/utils/src/http/          # 共享原语（@zanelab/utils 导出）
├── request-client.ts             # RequestClient 类：get/post/put/delete/request 返回 Promise<T>
│                                 #   公开 instance(readonly)/isRefreshing/refreshTokenQueue
├── preset-interceptors.ts        # 三个预置拦截器工厂（见下）
├── modules/                      # InterceptorManager / FileUploader / FileDownloader / SSE
├── helpers.ts                    # bindMethods / merge(defu 语义) / isString / isUndefined / isFunction
└── legacy.ts                     # BizCodeError / isSessionExpiredError（session 失效语义载体）

apps/<app>/src/utils/http.ts      # 业务组装层：new RequestClient + 链式注册拦截器
apps/<app>/src/api/*.ts           # 接口函数：直接拿强类型 Promise<T>
```

## 组装模式（apps/portal-web/src/utils/http.ts）

`createRequestClient(baseURL, options)` 内 `new RequestClient(...)`，然后**按序注册拦截器——顺序即语义**：

1. **请求拦截器**：从 store 读 token（store 才是权威，不从 localStorage 现读），非空才 `config.headers.set(TOKEN_HEADER, token)`（旧后端 raw token，无 Bearer）；再合并 `buildLegacyHeaders()`（x-lang / X-Platform / X-Tenant 等兼容头）。
2. **`defaultResponseInterceptor({ successCode, dataField })`**：envelope 解包三态——
   - `responseReturn: 'raw'` → 原样 AxiosResponse
   - `'body'` / 非 envelope body（无 code 字段的对象、blob、纯文本）→ 返回 body（守卫放行，防误判业务码失败）
   - `'data'` + successCode 命中（支持函数形式，portal 为 `[0,'0','10000']`）→ 返回 `data` 字段，业务层直接拿到 `Promise<T>`
   - envelope 命中失败码 → 抛出携带 `.response` 的错误对象，交给下一层
3. **portal 业务 rejected 拦截器**：解包层错误转 `BizCodeError{bizCode}`（**不附 `.response`**——`RequestClient.request` 对带 response 的错误会改抛 `response.data`，附上会丢失 bizCode/isSessionExpiredError 语义）；reLogin 码（213004/40100/213005）/msg 正则命中 → notify + `handleLogout()`；其余 envelope 失败码 → biz 码 i18n 映射 notify；HTTP 层错误原样放行。
4. **`authenticateResponseInterceptor({ client, doReAuthenticate, doRefreshToken, enableRefreshToken, formatToken, tokenHeaderName })`**：HTTP 401 单飞刷新——`client.isRefreshing` + `refreshTokenQueue` 挂 RequestClient 实例；并发 401 只刷新一次，排队请求以新 token 重放。**`tokenHeaderName` 参数化 token 头**（portal 传 `TOKEN_HEADER`='ailab-token'；缺省写 Authorization 保持 vben 行为）。刷新失败 → `handleLogout()` + reject `BizCodeError('401')`（启动期 restoreSession 兜底判定）。
5. **`errorMessageResponseInterceptor(makeErrorMessage, { resolveStatusMessage, resolveNetworkMessage })`**：403/5xx → notify（i18n 文案经 `resolveStatusMessage` 注入；返回 null/undefined = 该状态不提示）；网络/超时文案经 `resolveNetworkMessage` 注入。packages/utils 不感知 i18n/notify——全部参数注入。

portal 导出：

- `requestClient`（`responseReturn: 'data'`，业务默认用）
- `baseRequestClient`（raw，裸 AxiosResponse，特殊场景）
- `isSessionExpiredError` / `BizCodeError`（re-export 自 @zanelab/utils，`micro/register.ts` 消费）

## requestClient 的使用（业务层）

```ts
// 直接拿强类型数据（拦截器已解包 envelope），不要 .data、不要 as unknown as
const menus = await requestClient.get<RawMenuItem[]>(appConfig.api.menusEndpoint);
const result = await requestClient.post<LoginResult>(appConfig.api.loginEndpoint, body);
```

- `RequestClient` 的 `get/post/put/delete/request<T>` 返回 `Promise<T>`；`responseReturn: 'data'` 下 T 是解包后的 data。
- 非 2xx / envelope 失败 → reject `BizCodeError{bizCode}`（envelope 失败）或 vben 语义的 `error.response.data`（HTTP 层，由 `RequestClient.request` 抛出）。

## 预置拦截器清单（packages/utils/src/http/preset-interceptors.ts）

| 拦截器 | 职责 | 本仓库适配点 |
| --- | --- | --- |
| `defaultResponseInterceptor` | envelope 解包三态 + 成功码校验 | 非 envelope body 守卫放行（保持旧 createHttpClient 行为）；`successCode` 支持函数 |
| `authenticateResponseInterceptor` | 401 单飞刷新 + 队列重放 | `tokenHeaderName` 参数化（重试与队列重放都写该头）；`doRefreshToken` 实现无关（portal 用 fetch，Out of Scope 不变） |
| `errorMessageResponseInterceptor` | 状态码/网络错误文案回调 | `$t` 换成注入式 `resolveStatusMessage`/`resolveNetworkMessage`（null = 跳过提示）；packages/utils 无 i18n 依赖 |

能力模块（当前无业务调用方，仅作为能力保留）：`FileUploader.upload`（FormData 组装 + multipart 头）、`FileDownloader.download`（responseType blob）、`SSE.requestSSE/postSSE`（重放请求拦截器 headers → fetch 流读）、`paramsSerializer`（'brackets'|'comma'|'indices'|'repeat'，经 qs）。

## 微前端只读共享通道（§8.1/§9.3）

宿主把 **RequestClient 实例**（非裸 axios）挂 `window.__http` → `micro/register.ts` 传入子应用 `props.http`。**Proxy 同时挡掉 `interceptors` 与 `instance`**（后者可绕到 `instance.interceptors`，只挡 interceptors 不够）：

```ts
const httpProxy = new Proxy(requestClient, {
  get(target, prop, receiver) {
    if (prop === 'interceptors' || prop === 'instance') return undefined; // 只读
    return Reflect.get(target, prop, receiver);
  },
});
window.__http = httpProxy;
```

子应用（iam-web）侧：

- 集成态：`props.http` 按结构化子集类型（`HostHttpClient`，iam-web `main.tsx` 定义，不 import packages/utils 全量）透传，业务层享受宿主拦截器链。
- 独立态：`new RequestClient({ responseReturn: 'data' })` + 最小拦截器（语言头 + token + 解包 + 401 跳登录）自建，业务层零感知。
- props 消费收敛在 `src/utils/http.ts` 兼容层，业务组件不出现 `props.http` 判空分支。

## Supabase 网关鉴权（2026-11-21 修复沉淀）

- **「匿名端点」≠ 无凭据**：Edge Fn 不校验 JWT 的匿名端点（如 `/auth/refresh`）仍会被 **Supabase 平台网关**要求 `apikey` 头（publishable key）——缺失时网关在 Edge Runtime 之前就以 401 `MISSING_CREDENTIALS` 拦截（响应体 `source: "@supabase/server"`），请求到不了函数。**凡手写裸 `fetch` 调 Supabase 端点，必须与请求拦截器同源注入 apikey**（portal 统一收敛到 `buildLegacyHeaders()`；iam 独立态 `readApiKey()` 单点读取），不要绕过拦截器另起 fetch。
- **网关 401 与业务 401 status 相同，必须看响应体区分**：网关鉴权失败（部署配置错误，`source === '@supabase/server'`）≠ 会话失效（Edge Fn envelope `{code:1004,msg}`）。前者**绝不触发 handleLogout/跳登录**（保留登录态 + console.error 修复指引 + notify 明确提示），后者才走失效链路。教训：网关 401 曾被 `classifyRefreshError` 归为 invalid，导致**任何有效会话每次刷新页面都被强制登出**（启动期 refresh 必被网关拦截）。
- apikey 的 key 来源是**运行时配置**（portal `config.js` 的 `api.publishableKey`）/ **构建期 env**（iam 独立态 `VITE_API_KEY`），与拦截器注入同源、单点读取；未配置时**发请求前即失败**并给出修复指引，不发注定被拦的请求。

## Supabase edge fn 写路径：camel→snake 列映射（2026-11-23 沉淀）

**症状**：edge fn 的 create/update 对真实 DB 全部失败（PostgREST `PGRST204`，"column outputTypes 不存在"），而 vitest 全绿——mock 的 `pickInput` 自带了映射，**mock 通过 ≠ fn 正确**，这条断裂只在云端联调时暴露。

**根因**：fn 的入参解析层（`parseSkillInput`， camelCase——对外 API 契约）与写入层（`.insert(input)` / `.update({...input})`，DB 列 snake_case）之间没有显式映射，PostgREST 不会帮你转列名。

**契约**（skills fn 参考实现 `apps/skills-web/supabase/functions/skills/index.ts`）：

```ts
// 入参解析层产出 camel（API 契约），写库前经 toRowValues 映射为 snake 列名
function toRowValues(input: SkillInput): Record<string, unknown> {
  return { ...input, output_types: input.outputTypes }; // ← camel→snake 仅此处
}
// skillsCreate/skillsUpdate 一律 .insert(toRowValues(input)) / .update(toRowValues(input))
```

- **两处同步点**：`toRowValues`（fn 侧）与 mock `pickInput`（`src/mocks/skill-handlers.ts`）各自持有 camel↔snake 映射，**注释互相标注「与对方同步」**——新增入参字段时两处一起改，漏一处就是「测试绿、线上断」。
- **mock 侧必须有「snake 列名」断言用例**：api 层的 `mapRow` 会把未知的 camel 键**原样透传**，从归一后的对象看不出列名写错——只有直接读 mock 原始行（导出一个 `__getRawSkillRows()` 之类的测试口）才能断言「落库键是 snake、无 camel 残留」。这条用例是「mock 映射 ≠ fn 映射」的护栏（11-24 实现中 mock 曾漏 `taskExpression→task_expression` 等三列映射，靠人工比对发现）。
- **同名列不必映射，但同名 ≠ 同义**：数组/JSONB 列（`media`/`tags`/`deliverables`）camel 与 snake 同名，直接整体赋值即可（结构由 API 契约层定义，fn **不拆解** JSONB 内部结构——避免 fn 里出现第二份结构知识）；但 `taskExpression→task_expression` 这类多词列必须显式登记。
- fn 侧跑不进 vitest（Deno 运行时），守护手段是 `tsc -p supabase/functions/tsconfig.json` + 云端联调；映射函数写成纯函数（不碰 `Deno.env`、不碰 req），将来抽测才有可能。
- Wrong：`parseSkillInput` 之后直接 `.insert(input)`——类型层完全合法（`Record<string, unknown>` 什么都塞得进），编译期零报警，只有运行时 PGRST204。

## 内容型数据的 i18n 存储：主表基线 + 副表译文（2026-11-24 沉淀）

**场景**：内容型实体（技能、商品、文章）有标题/摘要/长文等多语言字段，且列表页只读摘要、详情页读全文。

**契约**（skills 参考实现：主表 `public.skills` + 副表 `public.skills_i18n`）：

```sql
-- 主表：存基线语言内容（zh-CN）+ 语言无关字段
title text not null, summary text not null default '', description text not null default '',
-- 副表：只存译文；字段为 null = 该 locale 无此译文 → 回落基线
create table public.skills_i18n (
  skill_id bigint not null references public.skills(id) on delete cascade,
  locale text not null,
  title text, summary text, description text, task_expression text,
  primary key (skill_id, locale)
);
```

- **列表接口不 join 副表**（性能契约：N+1 零成本）；**只有详情接口按 `?locale=` join**，命中则覆盖、字段为 null/空则保留基线——回落逻辑在服务端（fn 的 `applyI18n`）与 mock 侧各一份。
- **筛选计数口径跟着分页形态走**（2026-11-26 沉淀）：list 接口全量返回（无分页/服务端筛选）时，侧栏 facet 计数由前端按已有数据客户端统计（`computeFilterCounts`，零额外请求）；**一旦上分页或服务端筛选，客户端计数失真**——届时加聚合端点（如 `GET /skills/facet-counts`，SQL group by / JSONB 展开）。不要在客户端计数时代提前建聚合端点（过度设计），但要在上分页的同一个任务里补它，不允许过渡期显示错误计数。
- 写入侧：译文作为**独立载荷**（body.i18n = `{ locale: {字段} }`）随主记录提交，服务端 upsert 副表；主记录写入成功即算成功，副表失败不阻断主流程。
- **可翻译性差异要在存储层显式**：枚举型标签用 JSONB 分桶（`{scenarios, tasks, highlights, styles}`——前三类存 i18n key 可翻译，`styles` 存原文不译）；自由文本字段存基线 + 副表。
- **locale 来源不硬编码**：api 层从 i18n 运行时取当前语言（`i18n.language`），详情请求按需带 `?locale=`；缺省不带 = 返回基线。
- 副表 RLS：读公开（与主表同）；写全部走 edge fn（service role 绕 RLS），与 iam menus 表同款。

### 副表扩列时回落链路的同步点（2026-11-26 沉淀）

**Common Mistake：i18n 副表加列后，详情回落 select 列清单漏新列 → 写入成功但读回落永远不生效**

副表扩列要同步**四处**，漏任何一处都不报错（PostgREST 按需返回、upsert 不存在的列才报 PGRST204，select 少列静默截断）：

1. 写入解析（`parseI18nPayload` 白名单数组）——漏了 = 译文写不进；
2. upsert 赋值（`upsertI18n` 逐字段）——漏了 = 落库为 default；
3. **详情回落 select 列清单**（`.select('title,summary,...')` 字符串）——漏了 = `applyI18n` 拿不到值，回落静默失效（tsc 不查字符串列名，最易漏）；
4. 覆盖逻辑（`applyI18n` 的 textPairs/jsonPairs）。

自查命令：`grep -n "select('.*'" <fn>/index.ts`，副表 select 的列清单必须 ⊇ parseI18nPayload 白名单。类型校验能抓住 1/2，抓不住 3/4——回落链路要有「en 命中覆盖」的集成用例（mock 侧同款回落逻辑 + 断言）兜底。

## 迁移：加列 + 旧数据折进新结构的幂等写法（2026-11-24 沉淀）

- 加列一律 `add column if not exists`；建表 `create table if not exists`——迁移可重复执行。
- **旧数据折进新结构要用值守卫**，否则第二次执行会覆盖用户已改的新值：
  ```sql
  update public.skills set tags = jsonb_build_object('scenarios', to_jsonb(scenes), 'tasks', to_jsonb(roles))
  where tags = '{}'::jsonb and (coalesce(roles,'{}') <> '{}'::text[] or coalesce(scenes,'{}') <> '{}'::text[]);
  ```
  ——`where tags = '{}'` 是「还没折过」的哨兵值；折过的新值非空，不再命中。
- 派生列与旧列同步（如 `free` 由 `price_kind` 推导）用 `where free <> (price_kind = 'free')` 收敛，重复执行无副作用。
- 副表 upsert 用 `on conflict (skill_id, locale) do update` 幂等。

## Supabase 迁移序号：先查目录再定号（2026-11-23 沉淀）

**Common Mistake：迁移文件版本号撞号 → 已应用环境静默跳过**

- **症状**：迁移文件在、SQL 语法对、`supabase migration up` 报 up-to-date/no-op 不报错，但表/数据就是没出现。
- **原因**：新迁移与既有迁移撞了序号（本次 `0007_seed_skills_buttons.sql` 撞 `0007_menu_i18n_key.sql`）。supabase 按目录内**已记录的版本号**判断是否已应用——已应用过 0007 的环境（本地 migration 表或云端）直接跳过同号新文件，**无任何告警**。
- **修复**：重号为下一个空闲号（→ `0008_seed_skills_buttons.sql`），头注释注明「原 0007 撞号重编，不得改回」。
- **预防**：新建迁移**之前**必跑 `ls apps/<app>/supabase/migrations/`（跨分支合并场景再看 `git log --oneline` 该目录），取最大号 +1；序号只要求目录内唯一且递增，不要求日期连续。

## 接口函数的书写（src/api/）

- 请求地址一律取 `appConfig.api.<endpoint>`（如 `menusEndpoint`），**不硬编码路径**（§10：接口路径都可在配置覆盖）。
- 共享端点：`/api/auth/login`、`logout`(可选)、`refresh`(可选)、`/api/user/info`、`/api/user/menus`（§10）。
- 函数式命名：`fetchMenus()`、`fetchExtraPermissions()`，返回类型标注实体类型（见 [类型安全](./type-safety.md)）——`http.get<T>/post<T>` 后无需强转。

## 错误/成功提示：daisyUI `alert` + `toast`

拦截器不能直接渲染 React，用「notify」帮助模块把消息交给根组件的 toast 区显示：

- `@zanelab/utils` 的 `notify.error(msg)` / `notify.success(msg)` / `notify.warning(msg)` / `notify.info(msg)`。
- `ToastRegion` 在根组件挂载一次，订阅 notify 并渲染 `.toast` 容器，每条消息是一个 daisyUI `alert`（`alert-success/alert-warning/alert-error/alert-info`）。
- **业务代码与拦截器里没有 `message.error(...)` 之类的 UI 库调用，一律 `notify.error(msg)`**；提示文案经 i18n.t 生成，packages/utils 层不感知。

## 反面模式

- 新写一个 Axios 实例 / 在子应用或组件里自建拦截器 → 401 刷新、错误码映射、错误提示全部失效。
- 硬编码 `'/api/user/menus'` 之类路径到业务代码里。
- `http.post(...)` 后再 `as unknown as Promise<T>` 强转——RequestClient 已是强类型。
- 在 packages/utils 之外 import `qs`（paramsSerializer 能力仅共享层内部使用）。
- 在拦截器里直接操作 React/组件库弹窗（用 notify 帮助模块），或把刷新失败静默掉。
- 子应用业务层裸用 `props.http` / 散落 props 判空分支（props 消费收敛在 `src/utils/http.ts` 兼容层）。
- 手写裸 `fetch` 调 Supabase 端点不带 `apikey`（网关 401 MISSING_CREDENTIALS，请求到不了函数）；或把网关 401（`source:@supabase/server`，配置错误）当会话失效处理（触发登出）。
