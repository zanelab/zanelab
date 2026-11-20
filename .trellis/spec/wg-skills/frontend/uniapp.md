<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# UniApp / 小程序 开发规范（合并层）

> 本文档合并转写自 wg-skills 的 15 个 UniApp 技能：
> `uniapp-base`、`uniapp-standard`、`uniapp-style`、`uniapp-theme`、`uniapp-request`、
> `uniapp-auth`、`uniapp-page-components`、`uniapp-member-center`、`uniapp-diagnostic`、
> `uniapp-code-audit`、`uniapp-crossplatform-audit`、`uniapp-vue2-upgrade`、
> `uniapp-ui-replica`、`uniapp-ui-template-builder`、`uniapp-app-generate`。
> 规则实质保留原文（红线、清单、模板、判据、精确值），触发词 / frontmatter /
> 与规则无关的营销叙述 / 图片资产已剥离；`scripts/` 只保留一句用途说明。
>
> 技术栈：**uni-app + Vue 3 + TypeScript + Pinia + SCSS**（兼容 Vue 2 降级路径见 §9）。

---

## 目录

| 小节 | 主题 | 归并技能 |
|------|------|----------|
| §1 | 项目生成与目录骨架 | uniapp-app-generate |
| §2 | 通用规范红线（R01–R20） | uniapp-standard |
| §3 | 请求层与状态 / 路由 / 埋点 | uniapp-standard、uniapp-request |
| §4 | 鉴权与安全 | uniapp-auth |
| §5 | 主题系统（设计 token 唯一真源） | uniapp-theme |
| §6 | 样式系统与设计审计 | uniapp-style |
| §7 | 组件唯一真源与容器原则 | uniapp-base |
| §8 | 页面级组件与业务页面 | uniapp-page-components、uniapp-member-center |
| §9 | 跨端兼容与 Vue 2 升级 | uniapp-crossplatform-audit、uniapp-vue2-upgrade |
| §10 | 诊断、代码审计、跨端审计 | uniapp-diagnostic、uniapp-code-audit、uniapp-crossplatform-audit |
| §11 | UI 复刻与模板构建 | uniapp-ui-replica、uniapp-ui-template-builder |

---

## §1 项目生成与目录骨架

> 归并技能：`uniapp-app-generate`（三端项目初始化）。

### 1.1 红线 / 强制约定

| 编号 | 规则 |
|------|------|
| G01 | 不写死平台特定代码——一律用条件编译 |
| G02 | 不使用 H5 标签（`div` / `span` / `p` 等） |
| G03 | 不使用浏览器 API（`fetch` / `window` / `document`） |
| G04 | 不使用 off-scale 颜色 |
| G05 | 颜色必须走设计 token（源技能此处写「不使用 CSS 自定义属性 `var()`」，指业务侧不得自造变量名；运行时主题色仍经 `var(--token, 兜底)` 引用，见 §5） |

### 1.2 三端核心差异

| 维度 | 小程序 | H5 | App |
|------|--------|-----|-----|
| 渲染方式 | 微信 WebView | 浏览器 | 原生渲染 |
| API | `wx.xxx` | browser APIs | `plus.xxx` |
| 路由 | `wx.navigateTo` | history API | native navigation |
| 登录 | `wx.login` | OAuth | OAuth / 第三方 SDK |
| 支付 | `wx.requestPayment` | 微信 JSAPI | 第三方 SDK |
| 推送 | 订阅消息 | Web Push | 推送 SDK |
| 发布 | 微信后台 | CDN | 应用商店 |

### 1.3 条件编译

```vue
<!-- #ifdef MP-WEIXIN -->  ...  <!-- #endif -->
<!-- #ifdef H5 -->         ...  <!-- #endif -->
<!-- #ifdef APP-PLUS -->   ...  <!-- #endif -->
```

平台判断统一收口到 `src/utils/platform.ts`，导出 `isMpWeixin()` / `isH5()` / `isApp()`，
函数体用条件编译返回布尔，避免运行期探测。

### 1.4 打包命令

| 平台 | 开发命令 | 打包命令 |
|------|---------|---------|
| 微信小程序 | `npm run dev:mp-weixin` | `npm run build:mp-weixin` |
| H5 | `npm run dev:h5` | `npm run build:h5` |
| App (Android) | `npm run dev:app-plus` | `npm run build:app-plus` |
| App (iOS) | — | HBuilderX 打包 |

### 1.5 六阶段工作流

| Phase | 名称 | 内容 |
|-------|------|------|
| 1 | 需求确认 | 问 3–5 个关键问题：解决什么问题/目标用户；3–5 个核心页面；视觉风格（清新健康 / 极简工具 / 活泼社区 / 商务数据）；TabBar 入口数；是否需要登录 |
| 2 | 项目初始化 | 复制 boilerplate → 替换占位符（项目名、描述）→ 建标准目录结构 → 生成 `CLAUDE.md` / `AGENTS.md` |
| 3 | 主题系统 | 询问主色/成功/警告/错误色 → 生成 `theme.json` → `npm run theme:sync` → `npm run theme:check` |
| 4 | 开发 | 布局设计（TabBar + 页面）→ 核心页面（首页/列表/详情/我的）→ 公共组件（AppButton/AppCard/AppInput）→ Pinia 状态管理 |
| 5 | 三端适配 | 登录差异（`wx.login` / OAuth / 第三方）、分享差异（`onShareAppMessage` / Web Share API / `plus.share`）、支付差异、条件编译特殊逻辑 |
| 6 | 交付 | `npm run lint` → 各端打包验证 → 检查清单 |

### 1.6 交付物

- 可编译的三端 uni-app 工程（小程序 / H5 / App 一套代码）
- `theme.json` 与同步后的主题 CSS
- TabBar 图标 + 占位图静态资源
- `src/utils/platform.ts` 平台抽象层（登录/分享/图片统一封装）

---

## §2 通用开发规范红线（R01–R20）

> 归并技能：`uniapp-standard`。
> 引用红线编号时**必须带 `R` 前缀**（"R10"）——`R01` 在 `uniapp-page-components` 中也存在且含义不同（见 §8），裸编号会造成歧义。

| 编号 | 规则 | 说明 |
|------|------|------|
| R01 | 禁止嵌套 `v-for` | 单个页面 `v-for` 层数 ≤ 1 |
| R02 | `data` 只存视图数据 | 过滤接口原始数据 |
| R03 | 优先使用 `uni.xxx` | 禁止私有 API |
| R04 | DOM 节点数限制 | 单页 DOM ≤ 1000 |
| R05 | 长列表必须分页 | 懒加载 + 分页 |
| R06 | `setData` 数据量限制 | 单次 ≤ 100KB、≤ 20 次/秒 |
| R07 | 禁止 `eval` / `new Function` | 危险方法 |
| R08 | 禁止硬编码 | 配置项放 `config/`，业务常量放 `constants/` |
| R09 | 请求防抖节流 | 同一接口 1 秒内禁止重复 |
| R10 | 失败必须弹提示 | 所有失败场景必须向用户暴露错误 |
| R11 | AI 生成后必须 lint | `npm run lint` |
| R12 | 提交前必须 lint | 通过后才能提交 |
| R13 | commit 必须用中文 | 禁止纯英文 |
| R14 | commit 长度限制 | subject ≤ 50 字 |
| R15 | SCSS 必须用 Token | 见 §6 |
| R16 | Mock 放 `_mocks_/` | 禁止写在 API 文件或页面中 |
| R17 | 请求只传业务路径 | 传 `/user/info`，不传 `/api/v1/user/info`；prefix 从 `@/config` 导入 |
| R18 | 屏幕适配走规范 | 统一 rpx，见 §5.4 / §6 |
| R19 | 鸿蒙降级规范 | 见 §6 / §9 |
| R20 | 认证服务收口 | 登录态统一走 `auth.service.ts`，见 §4 |

### 2.1 目录结构（使用方项目，非技能仓库自身）

```
src/
├── api/           # 接口定义（不含具体业务模块）
│   ├── _mocks_/   # Mock 数据字典
│   ├── request.ts # 统一请求封装
│   └── index.ts
├── components/
│   ├── common/    # 通用组件（Button / Card / Loading）
│   ├── business/  # 业务组件
│   └── index.ts
├── pages/         # 业务页面
├── stores/        # Pinia（index.ts + 按域拆分）
├── services/      # 业务服务（auth.service.ts …）
├── utils/         # auth.ts / toast.ts / storage.ts / platform.ts
├── config/        # env.config.ts / api.config.ts
├── constants/     # storage.ts（存储 Key）/ enums.ts
├── types/         # .d.ts 全局类型
├── composables/   # 组合式函数
├── styles/        # SCSS 样式系统（见 §6）
├── App.vue / main.ts / pages.json
static/            # 静态资源
package.json / vite.config.ts / tsconfig.json
```

### 2.2 命名规范

- 目录：全部小写，多单词用连字符 `-`。
- **禁止**：大写、下划线 `_`、中文、模糊命名（如 `util`）。
- 组件目录即命名空间：`components/common/<PascalName>/index.vue`。
- 类型定义：以 `.d.ts` 结尾，或放 `types/`。

### 2.3 性能红线（R04 / R06 的量化值）

| 项 | 上限 |
|----|------|
| 页面总节点 | 1000 |
| 列表项节点 | 100 |
| 列表项数 | 50 |
| `setData` 单次数据量 | 100KB |
| `setData` 调用频率 | 20 次/秒 |
| 长列表每页条数 | ≤ 20 |
| 虚拟列表触发阈值 | 条数 > 1000 |

`setData` 优化：使用 diff 算法只更新变化部分。图片优化：懒加载组件、合理尺寸（避免原图）、CDN 缩略图。

### 2.4 常用命令

| 命令 | 用途 |
|------|------|
| `npm install` | 安装依赖（先删除 `node_modules`） |
| `npm run dev:mp-weixin` | 微信小程序开发调试 |
| `npm run build:mp-weixin` | 微信小程序打包 |
| `npm run lint` | ESLint 代码检查 |

### 2.5 项目模板文件

```
templates/
├── vite.config.ts        # Vite 配置模板
├── tsconfig.json         # TypeScript 配置模板
├── main.ts               # 应用入口模板（Pinia + SSR）
├── pages.json            # 页面路由模板（tabBar 需配套 static/tabbar/*.png 图标）
├── pages-sub.json        # 分包配置模板
├── package.json          # 依赖配置模板
├── .env.example          # 环境变量示例（复制为 .env 后修改）
└── env.d.ts              # 类型声明模板（放到 src/ 下使用）
```

### 2.6 交付物

`src/` 按 2.1 落地；`styles/` 清单与 §6 目录树逐项一致（历史上两边各漏了
`_components.scss` / `_typography.scss` / `_animations.scss` / `_page.scss`）。
`tokens/_semantic.scss` 是业务代码引用语义变量的**唯一入口**。

---

## §3 请求层规范

> 归并技能：`uniapp-request`（uniapp 场景）+ `uniapp-standard` §接口规范。
> 权威源规范为 `frontend-request-skill/references/uniapp-spec.md`（本层另有 `frontend/shared-request-layer.md` 覆盖通用部分）。

### 3.1 职责边界

接口**约定**（响应信封 `{code,message,data}`、错误码语义、Mock key 格式 `METHOD:相对路径`、API 前缀 `/api`）
归 §2 通用规范；本层只负责**实现与使用规范**，不得另立一套信封定义。

落位：

```
src/
├── api/            # 接口定义（函数签名 + 路径 + 参数类型）
├── services/       # 业务服务（数据编排）
└── utils/request/  # 请求封装实现（或 src/api/request.ts，以 uniapp-spec 为准）
```

业务页面**只调 `api/` 里的函数**，不直接调 `uni.request`。`api/` 只描述"调什么"，`services/` 负责"怎么组合数据"。

### 3.2 红线 / 强制约定

| 编号 | 规则 |
|------|------|
| Q01 | 响应信封固定 `{ code, message, data }`，本层不得自定义 |
| Q02 | API 前缀统一 `/api`；业务侧只传相对业务路径 |
| Q03 | 错误处理必须覆盖：网络异常、超时、业务错误码、鉴权失效（401）、服务端 5xx；每类都要有明确的**用户可见行为**（R10） |
| Q04 | 401 不得直接抛错到页面，必须走统一登录态刷新流程；并发 401 只触发一次刷新 |
| Q05 | 列表类请求必须内置分页参数与"加载更多/上拉刷新"配套的状态位 |
| Q06 | 提交类请求（POST/PUT/DELETE）必须防重复提交 |
| Q07 | 请求失败要写日志（可定位：接口、参数、错误码），不得静默吞异常 |
| Q08 | 组件内**禁止**发起请求（与 §8 P12 一致），数据由外部传入 |
| Q09 | 认证相关请求归 §4 收口（R20），本层不实现登录逻辑，只提供注入点 |

### 3.3 11 项核心要点

| # | 要点 | 适用层 |
|---|------|--------|
| 1 | 统一入口 `request.ts` | request |
| 2 | 响应信封 `{ code, message, data }` | response |
| 3 | 鉴权拦截 + Token 注入 | interceptor |
| 4 | 401 自动刷新 Token + 队列重试 | interceptor |
| 5 | 游客模式拦截 | interceptor |
| 6 | 请求防抖 / 重复拦截 | interceptor |
| 7 | Mock 数据机制 | dev |
| 8 | 错误码统一映射与通知 | interceptor |
| 9 | 文件上传独立封装 + 进度回调 | upload |
| 10 | SSE 流式请求 + 打字机效果 | stream |
| 11 | 网络异常 / 超时重试策略 | interceptor |

### 3.4 配套配置（`src/config/api.config.ts`）

```typescript
export const BASE_URL = import.meta.env.VITE_BASE_URL || '';
export const DEFAULT_PREFIX = '/api';
export const REQUEST_TIMEOUT = 30000;
export const UPLOAD_TIMEOUT = 120000;
export const REQUEST_RETRY_COUNT = 0;

// 业务成功码
export const SUCCESS_CODES: (string | number)[] = [0];

// 与 401 同等处理的业务失败码；-1 是 JWT 鉴权失效的强约定，必须包含
export const AUTH_FAILURE_CODES: (string | number)[] = [-1];

// Mock 全局开关：true 时所有请求强制走 Mock
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
```

### 3.5 `RequestOptions` 契约

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | `string` | 必填 | 接口相对路径 |
| `method` | `HttpMethod` | `GET` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'OPTIONS' \| 'HEAD'` |
| `data` | `any` | — | 请求参数 |
| `header` | `Record<string,string>` | — | 附加请求头 |
| `timeout` | `number` | `REQUEST_TIMEOUT`（30000） | 超时 ms |
| `needAuth` | `boolean` | `true` | 是否需要 Token |
| `showError` | `boolean` | `false` | `false` = 请求层按 `ERROR_CODE_MAP` 自动弹 Toast；`true` = 调用方自行 `try/catch` |
| `skipDebounce` | `boolean` | `false` | 是否跳过防抖 |
| `skipAuthHandler` | `boolean` | `false` | 是否跳过 401/-1 处理 |
| `prefix` | `string` | `DEFAULT_PREFIX`（`/api`） | API 前缀 |
| `authMode` | `'bearer' \| 'customer-token'` | `customer-token` | Token 头格式 |
| `retry` | `number` | `REQUEST_RETRY_COUNT` | 失败重试次数 |

```typescript
export interface ApiResponse<T = any> { code: number; message: string; data: T; }
export interface RequestError { code: string | number; message: string; raw?: any; }
export interface RequestPromise<T> extends Promise<ApiResponse<T>> { __abort?: () => void; }
```

### 3.6 请求拦截器

按顺序处理（精确值照抄）：

1. **Content-Type**：仅当 `shouldSetJsonContentType(data)` 为真时设 `application/json;charset=UTF-8`；
   `FormData` / `ArrayBuffer` / `Blob` / `null` / `undefined` 不设。字符串与对象设，其余不设。
2. **Token 注入**：`needAuth !== false` 时取 `getToken()`；`authMode === 'bearer'` 用
   `Authorization: Bearer <token>`，否则用 `Customer-Token: <token>`。
3. **链路追踪**：无 `X-Request-ID` 时补 UUID v4（内联零依赖实现，不引 uuid 库）。
4. **i18n**：无 `Accept-Language` 时补 `uni.getSystemInfoSync().language`，兜底 `zh-CN`。

### 3.7 响应拦截器

| 条件 | 行为 |
|------|------|
| `statusCode === 401` 或 `AUTH_FAILURE_CODES.includes(data.code)` | 抛 `UNAUTHORIZED`，交由 401 刷新流程 |
| `statusCode === 403` | 抛 `FORBIDDEN` |
| `500 ≤ statusCode < 600` | 上报全局错误处理器（`type: 'HTTP_5XX'`），抛 `HTTP_5XX`；**永不再弹用户 Toast** |
| `statusCode < 200` 或 `≥ 300` | 抛 `HTTP_ERROR`，消息 `` 请求失败: ${statusCode} `` |
| `data.code !== undefined` 且不在 `SUCCESS_CODES` | 抛 `data.code`，消息取 `extractMessage(data)` |

`extractMessage(data)` 取值优先级：`data.message` → `data.msg` → `data.error` → `data.detail` → `data.errMsg` → `'请求失败'`。

### 3.8 防抖去重

- 请求键：`` `${method}:${url}:${stableStringify(data)}` ``；
- `stableStringify` **必须对对象键排序**，否则参数顺序不同会绕过去重；
- 序列化异常时退化为时间戳键（即不去重）；
- 命中 `pendingRequests` 缓存直接返回同一个 Promise；
- `skipDebounce: true` 或重试（`isRetry`）时跳过去重检查；
- 请求 `complete` 回调中删除该键；
- 全局防抖时间常量 `REQUEST_DEBOUNCE_MS = 1000`（同一接口 1 秒内禁止重复，对应 R09）。

### 3.9 重试与取消

- 可重试错误码只有 `TIMEOUT` 与 `NETWORK_ERROR`（由 `err.errMsg` 是否含 `timeout` 判定），
  且受 `maxRetry = options.retry ?? REQUEST_RETRY_COUNT` 限制；
- 401 重试路径独立：`UNAUTHORIZED` 且非重试且未 `skipAuthHandler` → `await refreshToken()` →
  重发一次；刷新失败则 `handleUnauthorized()` 并抛出；
- 取消：`RequestPromise.__abort` 暴露 `task.abort()`，页面 `onUnload` 中调用。

### 3.10 Mock 机制

```typescript
export interface MockEntry<T = any> { code: number; message: string; data: T; }
export const MOCK_MAP: Record<string, MockEntry> = {};
```

- key 格式：`METHOD:相对路径`（**不含 prefix**）；
- 匹配顺序：精确键优先；否则按 `:` 分段匹配，路径段以 `:` 开头视为通配（`matchRestPath`
  要求段数与字面段完全一致）；
- 未命中时 `console.warn('[mock] 未找到: <key>')` 并返回 `{ code: 200, message: 'mock', data: null }`；
- `USE_MOCK` 为真时**所有请求都走 Mock**，不发真实网络请求；
- Mock 文件落 `src/api/_mocks_/`（R16）。

### 3.11 跨端网络差异

| 端 | 网络 API | 注意点 |
|----|----------|--------|
| 微信小程序 | `uni.request` / `uni.uploadFile` | 需配置合法域名；不支持长连接需用 SSE 兼容方案 |
| H5 | `uni.request`（包装 `fetch`） | CORS 跨域处理 |
| App | `uni.request`（plus.net） | SSL 证书、离线缓存 |

通用前端规范 vs uniapp 规范的差异点：

| 项 | 通用前端规范 | uniapp 规范 |
|----|-------------|------------|
| 底层请求 | `fetch` / `axios` | `uni.request` |
| 上传 | `fetch` FormData / `axios` | `uni.uploadFile` |
| SSE | `EventSource` | `uni.request` `enableChunked: true` |
| Token 存储 | `localStorage` / `sessionStorage` | `uni.getStorageSync` |
| 取消请求 | `AbortController` | `task.abort()` |
| 网络错误字段 | `error.message` | `err.errMsg` |

响应信封、错误码、鉴权拦截、Mock、去重、重试逻辑两端**完全一致**。

### 3.12 使用示例（模式）

```typescript
// 业务 api 层只描述路径与类型
export function getUserInfo() { return get<UserInfo>('/user/info'); }

// 跳过防抖（提交类接口）
await post('/api/order', data, { skipDebounce: true });

// 无需鉴权（如发送验证码）
await post('/api/sms/send', { phone }, { needAuth: false });

// 失败重试（弱网场景）
await get('/api/order/list', null, { retry: 2 });

// 页面卸载时取消请求
const task = get('/api/big-data');
task.__abort?.();
```

### 3.13 改造工作流（对既有项目）

```
Phase 1 现状评估：读 src/utils/request.* / src/api/* / src/services/*，评估是否已封装、是否接入鉴权、是否处理 SSE
Phase 2 规范对照：按 11 项要点逐条对照，输出「差距清单」
Phase 3 用户确认：列出哪些项需补、哪些保持现状；确认后才实施
Phase 4 改造实施：新建或改造 request.ts，集成 auth / 错误处理 / Mock / 防抖 / SSE / 上传
Phase 5 验证：小程序 / H5 / App 三端联调；401 刷新流程、SSE 流式、上传进度回归
```

> 本层**不直接修改既有 `request.ts`**，用户确认差距清单后才实施改造。

### 3.14 交付物

- `src/utils/request.ts` — 请求层入口
- `src/utils/upload.ts` — 上传封装（`UPLOAD_TIMEOUT = 120000`，进度回调）
- `src/utils/sse.ts` — SSE 流式封装
- `src/api/auth.ts` — Token 刷新队列示例

---

## §4 鉴权与安全

> 归并技能：`uniapp-auth`。

### 4.1 红线 / 强制约定

| 编号 | 规则 | 说明 |
|------|------|------|
| A01 | **认证服务收口**（R20） | 所有登录态读写只能经 `auth.service.ts`，页面与组件禁止直接 `uni.getStorageSync('token')` |
| A02 | **Token 只存 Storage** | 禁止在内存变量、组件 `data`、Storage 之外持久化 Token |
| A03 | **禁止明文存敏感信息** | Storage 中禁止明文存储密码、身份证、银行卡 |
| A04 | **401 统一处理** | 所有请求统一通过响应拦截器处理，禁止各页面各自跳转 |
| A05 | **登出必清理** | 登出时必须清理所有登录态，保留回跳地址 |
| A06 | **日志脱敏** | 禁止在日志中输出密码、Token、完整手机号 |

补充（来自个体规范）：

| 编号 | 规则 |
|------|------|
| A07 | 令牌刷新必须**单例**：并发 401 只触发一次刷新，其余请求挂起等待结果，失败后统一跳登录 |
| A08 | 登录态判定统一用一个派生值（如 `isLoggedIn`），禁止多处重复判断 `token && userInfo` |
| A09 | 未登录访问受限页面必须走统一守卫 + 回跳参数，不允许各页面各写一套 |
| A10 | 本模块不实现 UI；登录页属 §8 的 `login-page`，本模块只提供状态与动作 |
| A11 | 令牌**不写在** localStorage 裸键，统一走 `utils/storage.ts` 封装；用户信息与 token **分键存储**，便于单独清除用户态 |

### 4.2 目录落位

```
src/
├── api/auth.ts        # 登录/登出/刷新/验证码 接口
├── services/auth.service.ts   # 认证服务（唯一收口）
├── stores/user.ts     # Pinia：用户状态
├── utils/auth.ts      # 鉴权工具（Token / 用户上下文）
└── constants/storage.ts       # 存储 Key
```

### 4.3 存储 Key（精确值）

```typescript
const PREFIX = 'app_';

export const STORAGE_KEYS = {
  USER_INFO: `${PREFIX}user_info`,
  USER_PROFILE: `${PREFIX}user_profile`,
  TOKEN: `${PREFIX}token`,
  LOGIN_REDIRECT: `${PREFIX}login_redirect`,
} as const;
```

### 4.4 bootstrap 启动引导

```typescript
export interface BootstrapResult {
  needLogin: boolean;
  isGuest: boolean;
  profileComplete?: boolean;
}

export async function bootstrap(): Promise<BootstrapResult> {
  const store = useUserStore();
  store.initUser();
  if (!store.isLoggedIn) return { needLogin: true, isGuest: true };

  const results = await Promise.allSettled([
    store.fetchUserProfile({ skipAuthHandler: true }),  // 跳过 401 处理，避免 bootstrap 期间跳登录
    loadAllDictionaries(),
  ]);

  if (results[0].status === 'rejected') {
    const err = results[0].reason;
    if (err?.message?.includes('登录已过期')) {
      store.logout();
      return { needLogin: true, isGuest: true };
    }
  }
  return { needLogin: false, isGuest: false, profileComplete: isProfileComplete() };
}
```

登录态判断：`export function isLoggedIn(): boolean { return useUserStore().isLoggedIn; }`

需要登录的场景统一走 `requireLogin(loginRedirect?)`：未登录 → `uni.showToast({ title: '请先登录', icon: 'none' })`
→ `uni.reLaunch({ url: '/pages/login/index' })`，并先保存回跳地址。

### 4.5 Token 与用户上下文

```typescript
export function getToken(): string | null {
  try { return uni.getStorageSync(STORAGE_KEYS.TOKEN) || null; } catch { return null; }
}
```

用户上下文 `getCustomerContext()`：读 `STORAGE_KEYS.USER_INFO`，取 `userId || accountId`，
序列化为 `{"userId": <Number>}` 后 **base64 编码**（内联 `base64Encode` 实现，零依赖，支持中文
多字节与代理对），作为 `X-Customer-Context` 头发送（见 §2 请求拦截器）。

### 4.6 401 处理（含并发去重）

```typescript
const UNAUTHORIZED_LOCK_MS = 3000;   // 精确值：3 秒窗口
let unauthorizedLockUntil = 0;

export function handleUnauthorized(): void {
  const now = Date.now();
  if (now < unauthorizedLockUntil) return;   // 窗口内直接返回 → 并发去重
  unauthorizedLockUntil = now + UNAUTHORIZED_LOCK_MS;

  // 1. 保存回跳地址（必须先于清理）
  const redirectUrl = resolveLoginRedirect();
  if (redirectUrl) saveLoginRedirect(redirectUrl);

  // 2. 清理登录态（保留 LOGIN_REDIRECT）
  const store = useUserStore();
  store.logout();
  [STORAGE_KEYS.USER_INFO, STORAGE_KEYS.USER_PROFILE, STORAGE_KEYS.TOKEN]
    .forEach(key => uni.removeStorageSync(key));

  // 3. 跳转登录页
  uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
  uni.redirectTo({ url: '/pages/login/index' });
}
```

**顺序不可颠倒**：保存回跳 → 清登录态 → 提示 → 跳转。

### 4.7 403 处理

```typescript
export function handleForbidden(): void {
  console.warn('[Auth] 权限不足，操作被拒绝');
}
```

### 4.8 登出流程

```typescript
export function logout(options: LogoutOptions = {}): void {
  const store = useUserStore();
  store.logout();

  // 清理所有 Key，但保留 LOGIN_REDIRECT，避免回跳丢失
  const keysToClear = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.LOGIN_REDIRECT);
  keysToClear.forEach(key => { try { uni.removeStorageSync(key); } catch {} });

  if (options.loginRedirect) saveLoginRedirect(options.loginRedirect);
  uni.reLaunch({ url: '/pages/index/index' });
}
```

### 4.9 登录回跳

```typescript
// 保存：只接受以 /pages/ 开头的合法站内路径
export function saveLoginRedirect(url: string): void {
  if (!url || !url.startsWith('/pages/')) return;
  uni.setStorageSync(STORAGE_KEYS.LOGIN_REDIRECT, url);
}

// 消费：取出即删除（一次性）
export function consumeLoginRedirect(): string {
  const redirectUrl = uni.getStorageSync(STORAGE_KEYS.LOGIN_REDIRECT);
  uni.removeStorageSync(STORAGE_KEYS.LOGIN_REDIRECT);
  return typeof redirectUrl === 'string' ? redirectUrl : '';
}

// 登录成功后
const redirectUrl = consumeLoginRedirect();
if (redirectUrl) uni.redirectTo({ url: redirectUrl });
else uni.switchTab({ url: '/pages/index/index' });
```

### 4.10 用户状态（Pinia）

```typescript
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const isLoggedIn = computed(() => !!userInfo.value);

  function initUser() {
    const stored = uni.getStorageSync(STORAGE_KEYS.USER_INFO);
    if (stored) userInfo.value = JSON.parse(stored);
  }
  function logout() { userInfo.value = null; }

  return { userInfo, isLoggedIn, initUser, logout };
});
```

### 4.11 安全规范

**接口安全**：Token 存储在 Storage（不存敏感信息）；敏感接口添加签名验证；防止 XSS——用户输入必须转义。

**数据安全**：禁止在 Storage 中明文存储密码；敏感数据加密传输；日志脱敏处理。

**代码安全**：禁止 `eval('...')` / `new Function('...')`；必须用 `JSON.parse('...')` / `uni.setStorageSync(...)`。

**安全检查清单**：

| 检查项 | 要求 |
|--------|------|
| Token 存储 | 只存 Storage，不存敏感信息 |
| 日志输出 | 脱敏处理 |
| 用户输入 | 转义处理 |
| URL 参数 | 校验协议 |
| 路由跳转 | 鉴权检查 |
| 敏感操作 | 二次确认 |
| 错误上报 | 脱敏用户信息 |
| 清理数据 | 登出时清理 |

### 4.12 交付物

`src/services/auth.service.ts`（唯一收口）、`src/stores/user.ts`、`src/utils/auth.ts`、
`src/constants/storage.ts`、`src/api/auth.ts`。

---

## §5 主题系统（变量唯一真源）

> 归并技能：`uniapp-theme`。本层是整个 UniApp 技能群**唯一**的运行时 CSS 变量定义处；
> 所有其他层只能 `var(--xxx)` 引用，不得重定义同名变量、不得自造命名。

### 5.1 红线 / 强制约定

| 编号 | 规则 |
|------|------|
| T01 | `base.css` 是唯一定义处。新增变量必须先加进 `base.css` 再被引用；`base.css` 之外不得出现第二份同名变量定义文件 |
| T02 | 长度单位统一 **rpx**。仅 `1px` 细线、`env(safe-area-inset-*)`、必须物理像素的场景允许 `px` |
| T03 | 每套主题（`[data-theme="xxx"]`）必须覆盖**同一组**变量名，不得出现某主题独有、某主题缺失的变量（避免换肤 fallback 到裸值） |
| T04 | 所有引用方写 `var(--xxx, #兜底)`，保证 `base.css` 未加载时组件仍可渲染；兜底值必须等于真源值，不得裸引用 `var(--token)` |
| T05 | 内置主题固定 8 套：`cute` / `business` / `fresh` / `cyber` / `retro` / `glass` / `minimal` / `warm`；新增主题必须同步 `theme-demo.html` |
| T06 | 主色必须来自主题变量。组件与业务代码禁止写死主色（`#007AFF` 这类历史值一律视为违规） |
| T07 | 变体（`-alpha`、`-400`、`-600` 等）用 `color-mix(in srgb, ...)` 派生，不手写新色值 |
| T08 | 深色模式通过新增 `[data-theme]` 覆盖实现，不引入第二套变量名 |

模块侧附加约束（源技能「约束红线」）：

- 不修改业务逻辑（props、data、methods、生命周期）；
- 不初始化项目、不生成新页面骨架；
- 默认使用 `data-theme` 属性切换主题；
- **所有 rpx 值为静态，禁止 `calc()`**；
- 被替换的原样式文件必须备份为 `*.bak`。

### 5.2 三大核心能力

| 维度 | 内容 | 示例变量 |
|------|------|----------|
| 主题色 | 多主题完整色阶 50–950 | `--primary-500`、`--secondary-500`、`--tertiary-500` |
| 全局尺寸 | 字号/间距/高度/圆角/图标（静态 rpx，无 calc） | `--font-2xs`、`--space-4`、`--height-btn-md`、`--radius-sm`、`--icon-md` |
| 全局硬编码替换 | 颜色 + 尺寸，按 CSS 属性上下文分类（A/B/C/D/E） | `#fff` → `var(--text-inverse)`，`16rpx` → `var(--space-4)` |

**明确不做**（避免越界）：Dark Mode 暗色模式、Z-Index 层级系统、Motion / Transition Token、
JS Bridge `useTheme()`、CLI 工具、TypeScript 类型定义、Figma / Style Dictionary 对接、A11y 对比度校验。

### 5.3 变量命名空间

`base.css` 的 `:root, page` 选择器下按语义前缀分组：

| 前缀 | 语义 | 示例 |
|------|------|------|
| `--color-*` | 语义色 | `--color-primary`、`--color-error` |
| `--primary-*` `--secondary-*` `--tertiary-*` `--gray-*` | 色阶 | `--primary-500`、`--gray-900` |
| `--text-*` | 文字层级 | `--text-primary`、`--text-tertiary`、`--text-inverse` |
| `--bg-*` | 背景层级 | `--bg-page`、`--bg-card`、`--bg-light`、`--bg-overlay` |
| `--border` / `--border-*` | 线条 | `--border`、`--border-light` |
| `--space-N` | 间距阶梯 | `--space-4` |
| `--radius-*` | 圆角阶梯 | `--radius-md`、`--radius-card`、`--radius-full` |
| `--font-*` | 字号阶梯 | `--font-md`、`--font-lg` |
| `--height-*` / `--icon-*` / `--width-*` | 尺寸 | `--height-btn-md`、`--icon-sm` |
| `--shadow-*` | 阴影 | `--shadow-sm` |
| `--transition-*` / `--ease-*` | 动效 | `--transition-fast` |
| `--z-index-*` | 层级 | `--z-index-modal` |

统一命名格式（全项目对齐）：

| 维度 | 变量格式 | 示例 |
|------|----------|------|
| 间距 | `--space-{n}` | `--space-1` (4rpx)、`--space-4` (16rpx) |
| 字号 | `--font-{size}` | `--font-2xs` (20rpx)、`--font-md` (28rpx) |
| 高度 | `--height-{comp}-{size}` | `--height-btn-md` (72rpx) |
| 圆角 | `--radius-{size}` | `--radius-sm` (8rpx)、`--radius-full` (9999rpx) |
| 图标 | `--icon-{size}` | `--icon-xs` (24rpx)、`--icon-md` (48rpx) |
| 颜色 | `--{color}-{step}` | `--primary-500`、`--gray-900` |
| 语义颜色 | `--color-{semantic}` | `--color-primary`、`--bg-page` |
| 文字颜色 | `--text-{level}` | `--text-primary`、`--text-secondary` |
| 背景颜色 | `--bg-{level}` | `--bg-page`、`--bg-card` |
| 边框颜色 | `--border-{level}` | `--border`、`--border-light` |

### 5.4 尺寸阶梯（精确值）

```css
/* 字号 */
--font-2xs: 20rpx;  --font-xs: 24rpx;  --font-sm: 26rpx;  --font-md: 28rpx;
--font-lg: 30rpx;   --font-xl: 32rpx;  --font-2xl: 40rpx; --font-3xl: 48rpx;

/* 间距 */
--space-0: 0rpx;  --space-1: 4rpx;   --space-2: 8rpx;   --space-3: 12rpx;
--space-4: 16rpx; --space-5: 20rpx;  --space-6: 24rpx;  --space-8: 32rpx;
--space-10: 40rpx; --space-12: 48rpx; --space-16: 64rpx; --space-20: 80rpx; --space-24: 96rpx;

/* 圆角 */
--radius-none: 0rpx; --radius-sm: 8rpx; --radius-md: 16rpx;
--radius-lg: 24rpx;  --radius-xl: 32rpx; --radius-full: 9999rpx;

/* 按钮高度 */
--height-btn-sm: 56rpx; --height-btn-md: 72rpx; --height-btn-lg: 88rpx;

/* 图标尺寸 */
--icon-xs: 24rpx; --icon-sm: 36rpx; --icon-md: 48rpx; --icon-lg: 72rpx; --icon-xl: 96rpx;
```

### 5.5 预设主题（8 套，精确值）

| 主题 | 主色 | 圆角风格 | 适用场景 |
|------|------|----------|----------|
| cute | `#FF8FB1` | 胶囊 | 女性向、宠物 |
| business | `#2563EB` | 小圆角 | 金融、企业 |
| fresh | `#34D399` | 中圆角 | 健康、生活 |
| cyber | `#00F0FF` | 直角 | 科技、游戏 |
| retro | `#D97706` | 小圆角 | 文创、手账 |
| glass | `#8B5CF6` | 中圆角 | 音乐、社交 |
| minimal | `#333333` | 小圆角 | 工具、效率 |
| warm | `#F97316` | 中圆角 | 美食、户外 |

多主题子系统支持 `primary` / `secondary` / `tertiary` / `quaternary` / `quinary` 五级色阶，逻辑一致、命名统一。

### 5.6 硬编码替换规则（按 CSS 属性上下文分类）

**核心原则**：所有硬编码必须替换为 CSS 变量，不允许任何裸值。替换时**按 CSS 属性上下文分类匹配**，
确保语义正确（同一个 `20rpx` 在 `font-size` 下是 `--font-2xs`，在 `padding` 下是 `--space-5`）。

**A 类（font-size / line-height）**

| 原始值 | 替换为 | | 原始值 | 替换为 |
|--------|--------|---|--------|--------|
| `20rpx` | `var(--font-2xs, 20rpx)` | | `30rpx` | `var(--font-lg, 30rpx)` |
| `22rpx` | `var(--font-2xs, 20rpx)` | | `32rpx` | `var(--font-xl, 32rpx)` |
| `24rpx` | `var(--font-xs, 24rpx)` | | `34rpx` | `var(--font-xl, 32rpx)` |
| `26rpx` | `var(--font-sm, 26rpx)` | | `36rpx` | `var(--font-xl, 32rpx)` |
| `28rpx` | `var(--font-md, 28rpx)` | | | |

**B 类（padding / margin / gap）**

| 原始值 | 替换为 | | 原始值 | 替换为 |
|--------|--------|---|--------|--------|
| `0rpx` / `0` | `var(--space-0, 0rpx)` | | `20rpx` | `var(--space-5, 20rpx)` |
| `2rpx` | `var(--space-1, 4rpx)` | | `22rpx` | `var(--space-6, 24rpx)` |
| `4rpx` | `var(--space-1, 4rpx)` | | `24rpx` | `var(--space-6, 24rpx)` |
| `6rpx` | `var(--space-2, 8rpx)` | | `28rpx` | `var(--space-7, 28rpx)` |
| `8rpx` | `var(--space-2, 8rpx)` | | `32rpx` | `var(--space-8, 32rpx)` |
| `10rpx` | `var(--space-3, 12rpx)` | | `40rpx` | `var(--space-10, 40rpx)` |
| `12rpx` | `var(--space-3, 12rpx)` | | `48rpx` | `var(--space-12, 48rpx)` |
| `14rpx` | `var(--space-4, 16rpx)` | | `56rpx` | `var(--space-14, 56rpx)` |
| `16rpx` | `var(--space-4, 16rpx)` | | `64rpx` | `var(--space-16, 64rpx)` |
| `18rpx` | `var(--space-5, 20rpx)` | | | |

**C 类（width / height）**

| 原始值 | 替换为 | 说明 |
|--------|--------|------|
| `44rpx` / `56rpx` | `var(--height-btn-sm, 56rpx)` | 按钮小 |
| `60rpx` / `72rpx` | `var(--height-btn-md, 72rpx)` | 按钮中 |
| `80rpx` / `88rpx` | `var(--height-btn-lg, 88rpx)` | 按钮大 |
| `40rpx` | `var(--icon-xs, 24rpx)` | 图标 |
| `48rpx` | `var(--icon-md, 48rpx)` | 图标 |
| `56rpx` / `64rpx` / `72rpx` | `var(--icon-lg, 72rpx)` | 图标 |
| `96rpx` | `var(--icon-xl, 96rpx)` | 图标 |

**D 类（border-radius）**

| 原始值 | 替换为 | | 原始值 | 替换为 |
|--------|--------|---|--------|--------|
| `0` / `0rpx` | `var(--radius-none, 0rpx)` | | `20rpx` / `24rpx` | `var(--radius-lg, 24rpx)` |
| `4rpx` / `6rpx` / `8rpx` | `var(--radius-sm, 8rpx)` | | `28rpx` / `32rpx` | `var(--radius-xl, 32rpx)` |
| `10rpx`–`16rpx` | `var(--radius-md, 16rpx)` | | `999rpx` / `9999rpx` | `var(--radius-full, 9999rpx)` |

**E 类（px 单位遗留兼容）**

| 原始值 | 替换为 |
|--------|--------|
| `8px` | `var(--space-2, 8rpx)` |
| `12px` | `var(--space-3, 12rpx)` |
| `16px` | `var(--space-4, 16rpx)` |

### 5.7 架构落位

**完整架构（推荐 SCSS 项目）**

```
src/styles/
├── config/_theme-config.scss    # 唯一人工配置（用户只改这里）
├── tokens/_primitive.scss       # 自动生成的基础变量
├── tokens/_semantic.scss        # 语义化变量（业务代码引用）
├── functions/_generators.scss   # 色阶/尺寸生成函数
└── variables.scss               # 统一入口
```

**轻量架构（Less / 纯 CSS 项目）**：`src/static/css/base.css`（手动维护），
或用 `scripts/generate-tokens.js`（`node generate-tokens.js #6366F1`）动态生成。

> `templates/src/styles/` 只放页面布局/工具类样式，**不得**定义颜色、圆角、间距变量。

### 5.8 主题切换机制

**方式 1：`data-theme` 属性（推荐）**

```vue
<!-- App.vue -->
<template><view :data-theme="currentTheme"><router-view /></view></template>
<script>export default { data() { return { currentTheme: 'cute' } } }</script>
<style>
[data-theme="cute"]     { --primary-500: #FF8FB1; --radius-btn: 9999rpx; }
[data-theme="business"] { --primary-500: #2563EB; --radius-btn: 8rpx; }
</style>
```

**方式 2：class 切换**（`<view class="theme-cute">` + `.theme-cute { --primary-500: #FF8FB1; }`）

组件无需为换肤做任何改动——只要模板里用的是 `var(--token, 兜底)`。

### 5.9 输出物与回滚

**必需输出**：`src/styles/theme/tokens/_colors.css`（色阶 50–950）、`_sizes.css`、`_radius.css`、
`src/styles/theme/themes.css`（预设 + 自定义主题）、`src/styles/theme/index.css`（统一入口）、
`App.vue`（引入全局主题样式 + 加 `data-theme`）。

**可选输出**：`components/ThemeSwitcher/`；**备份**：被替换的原样式文件 → `*.bak`；
**报告**：`docs/theme-system-report.md`（含替换统计）。

**回滚**：把 `*.bak` 移回原位；或 `rm -rf src/styles/theme/` 并 `mv App.vue.bak App.vue`。

### 5.10 改造工作流（三种场景）

| 场景 | 触发 | 步骤要点 |
|------|------|----------|
| 无主题系统（创建） | 「给项目添加主题系统，主色 #6366F1」 | 检测现状 → 生成 primary 色阶（50–950，HSL 算法）→ 生成 gray 灰阶与语义色（success/warning/error/info）→ 生成 secondary/tertiary 色阶 → 生成尺寸阶梯 → 建 tokens 与 themes 文件 → `App.vue` 引入 → 输出报告 |
| 使用预设主题 | 「给项目添加 cute 主题」 | 用预设配置生成完整变量系统，其余同上 |
| 有主题系统但不合规（`--force`） | 「添加主题系统 --force」 | 备份 `*.bak` → 强制替换为规范变量系统 → 报告注明强制改造 |
| 统一硬编码 | 「统一所有硬编码」 | 生成主题系统 → 扫描全部 `.vue`/`.scss`/`.less`/`.css` → 按 A–E 类替换 → 备份 → 报告含替换统计 |
| 切换主题 | 「切换到可爱风」 | 检查主题系统存在 → 改根元素 `data-theme`，或生成 `theme-switcher` 组件 |

### 5.11 源仓库配套脚本

源技能带色阶/尺寸/圆角生成脚本与 `templates/scripts/`，此处不吸收实现，见源仓库
`vibeCoding/frontend/uniapp/uniapp-theme-skill/templates/scripts/`。
细化的色阶/尺寸/圆角生成算法见源仓库 `references/color-scale.md`、`size-scale.md`、`radius-scale.md`。

---

## §6 样式系统与设计审计

> 归并技能：`uniapp-style`。本层产出**规范与范式**，不产出组件实现；与 §7 冲突时以 §7 为准。
> 引用红线编号必须带前缀（"D01"），与 §2 的 R 系列并列。

### 6.1 红线 D01–D34

| 编号 | 规则 | 说明 |
|------|------|------|
| D01 | SCSS 必须用 Token | 禁止硬编码颜色/字号/间距/圆角/shadow/z-index |
| D02 | 组件样式用 `scoped` | 穿透子组件用 `:deep()` |
| D03 | props 用 TS 接口 | 接口 + `withDefaults` |
| D04 | 屏幕适配走规范 | `useNavBarHeight()` + `safe-area-bottom` mixin |
| D05 | 鸿蒙降级处理 | 不支持的 API 必须按 SOP 降级 |
| D06 | 字号禁止硬编码 | 用 `$font-size-*`，不写 `font-size: 32rpx` |
| D07 | SCSS 嵌套 ≤ 3 层 | 防止过深选择器 |
| D08 | 动画限用 `transform`/`opacity` | 避免 layout/paint 重排 |
| D09 | z-index 禁止硬编码 | 引用 `$z-*` |
| D10 | 深色模式可切换 | 兼容 `prefers-color-scheme: dark` 或 `data-theme="dark"` |
| D11 | 全页滚动禁止 `scroll-view` | 走 page 原生流；局部滚动才用，且 padding 加在直系子元素上 |
| D12 | 自定义导航栏必须对齐胶囊 | 与胶囊按钮同一行水平居中，右侧不侵入 |
| D13 | Popup 必须有进出场动画 | 滑入滑出，禁止突然出现；内边距统一用 `.popup-content` |
| D14 | 页面外边距必须统一 | 用 `.page-container` 或 `$page-gutter` |
| D15 | 底部菜单必须全局统一 | 自定义 TabBar 则所有 tab 页都用，禁止混用 |
| D16 | 自定义头部必须全局统一 + 对齐胶囊 | 启用后所有页面去掉默认头部，新增页面禁止用默认头 |
| D17 | 模块间距必须一致 | 同页所有模块的内边距彼此相同、外间距彼此相同 |
| D18 | 圆角必须全局统一 | 一律 `$radius-*` |
| D19 | 底部悬浮按钮走全局样式 | 用 `.btn-fixed-bottom`，页面内容区必须加 `padding-bottom` |
| D20 | 分割线必须统一 | `.divider` 或 `$divider-color` / `$divider-width` |
| D21 | 徽标标签必须统一 | `.badge` / `.tag-*` |
| D22 | 列表项必须统一 | 公共结构（图标+标题+副标题+右箭头） |
| D23 | 文本层级必须统一 | `.text-h1`~`.text-h4` `.text-body` `.text-caption`，禁止裸写 `font-size` |
| D24 | 可点击区域 ≥ 44pt | ≈ 88rpx，低于即违规 |
| D25 | 头像必须统一 | 尺寸/圆角/默认占位图统一 |
| D26 | 表单控件必须统一 | Checkbox/Radio/Switch 颜色/尺寸/间距从 Token 取 |
| D27 | 宫格必须统一 | `.grid-*`，列数/间距/图标尺寸统一 |
| D28 | 图片必须有占位和兜底 | `<image>` 必须 `mode` + 占位图 + `@error` |
| D29 | 禁止第三方组件库 | uView / Vant Weapp / ColorUI / iView 一律禁止 |
| D30 | Utility 类必须统一 | `.flex` `.flex-between` `.gap-*` `.text-center` 等，禁止重复内联样式 |
| D31 | 文字颜色必须从基色派生 | 次级/三级/禁用文字色由 `$color-text-primary` `tint()` 派生 |
| D32 | 空列表必须用 `<Empty>` | 禁止各页面自写"暂无数据" |
| D33 | 组件尺寸必须从组件级 Token 取 | 高度/宽度/内边距/圆角引用 `$btn-*` `$card-*` `$modal-*` 等 |
| D34 | 文字背景对比度 ≥ 4.5:1 | WCAG AA；大号文字（≥24rpx 加粗）可放宽至 3:1 |

### 6.2 Design Tokens 四层架构

```
styles/
├── config/_theme-config.scss     # 唯一人工配置
├── tokens/_primitive.scss        # 基础色板/尺寸阶梯（自动生成）
├── tokens/_semantic.scss         # 语义变量（业务代码唯一引用入口）
├── tokens/_components.scss       # 组件级 Token
├── _functions.scss / _mixins.scss
├── _typography.scss / _animations.scss / _page.scss / _utilities.scss / _layout.scss
└── variables.scss                # 统一出口
```

自动注入（`vite.config.ts`）：

```typescript
css: { preprocessorOptions: { scss: { api: 'modern',
  additionalData: `@use "@/styles/variables.scss" as *;` } } }
```

**SCSS 变量 vs CSS 变量是两层不是两套**：编译期 SCSS 变量做静态计算（色阶派生、mixin、函数），
运行时 CSS 变量做主题切换（`[data-theme]`）。SCSS 变量不允许直接产出运行时主题色。

`_theme-config.scss`（唯一人工配置，精确值）：

```scss
$theme-primary: #1CC8C4;          // 品牌主色（theme-skill 可覆盖）
$color-primary: $theme-primary;   // 语义映射
$theme-success: #22c55e;  $theme-warning: #f59e0b;
$theme-error: #ef4444;    $theme-info: #3b82f6;
$theme-spacing-base: 4rpx;        // 间距基数
$theme-radius-base: 8rpx;         // 圆角基数
$theme-font-size-base: 2rpx;      // 字号基数
$theme-dark-enabled: true;
```

### 6.3 排版阶梯

```scss
$font-size-xs: 20rpx;   $font-size-sm: 24rpx;   $font-size-md: 28rpx;   // 正文/列表
$font-size-lg: 32rpx;   $font-size-xl: 36rpx;   $font-size-xxl: 40rpx;  // 页面主标题
$font-size-xxxl: 48rpx;                                                  // 营销数字
$line-height-tight: 1.2;  $line-height-normal: 1.5;  $line-height-relaxed: 1.8;
$font-weight-normal: 400; $font-weight-medium: 500; $font-weight-semibold: 600; $font-weight-bold: 700;
```

字体家族：`-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif`；
数字字体：`"DIN Alternate", "Helvetica Neue", Arial, sans-serif`。

文本层级类（禁止裸写 font-size）：`.text-h1`（`$font-size-xxl` + bold + tight，每页只有一个）、
`.text-h2`（lg + semibold）、`.text-h3`（md + semibold）、`.text-h4`（md + medium）、
`.text-body`（md + normal + relaxed + `$color-text-secondary`）、`.text-caption`（sm + `$color-text-tertiary`）、`.text-price`（number 字体 + xl + bold + `$color-error`）。

### 6.4 间距与页面外边距

```scss
$spacing-0: 0;     $spacing-1: 4rpx;   $spacing-2: 8rpx;   $spacing-3: 12rpx;  // 元素内边距
$spacing-4: 16rpx; $spacing-5: 20rpx;  $spacing-6: 24rpx;  // 6 = 卡片内边距
$spacing-8: 32rpx; // 页面水平边距
$spacing-10: 40rpx; $spacing-12: 48rpx; $spacing-16: 64rpx; // 16 = 页面上下留白
$page-gutter: $spacing-8;   // 页面左右外边距，全局唯一
```

使用约定：页面左右边距 `$spacing-8`、卡片内边距 `$spacing-6`、列表项间距 `$spacing-4`、元素内边距 `$spacing-3`。

公共页面容器（`_page.scss`）：`.page-container { padding: 0 $page-gutter; }`、
`.page-section { margin: $spacing-6 $page-gutter; }`、`.page-section-first { margin: 0 $page-gutter; }`、
`.page-section-last { margin: $spacing-6 $page-gutter; padding-bottom: $spacing-16; }`、
`.page-fullwidth { margin-left: -$page-gutter; margin-right: -$page-gutter; padding: $spacing-6 $page-gutter; }`。

**模块间距硬规则**：同一页面内所有模块（section/卡片/列表/标签/组件）的内边距彼此相同、外间距彼此相同。

### 6.5 中性色阶（不依赖主题色）

| 变量 | 值 | 用途 |
|------|-----|------|
| `$color-text-primary` | `#2b2e31` | 正文标题（基色） |
| `$color-text-secondary` | `tint(base, 30%)` → `#5b6167` | 副标题说明 |
| `$color-text-tertiary` | `tint(base, 50%)` → `#737a82` | 时间戳、辅助信息 |
| `$color-text-disabled` / `-placeholder` | `tint(base, 70%)` → `#b5b9bf` | 禁用、占位符 |
| `$color-text-inverse` | `#ffffff` | 深色底反白（不参与派生） |
| `$color-text-link` | `#3498db` | 链接色（不参与派生） |
| `$color-bg-primary` | `#ffffff` | 卡片/弹窗/列表项 |
| `$color-bg-secondary` | `#fafafa` | 页面底色 |
| `$color-bg-tertiary` | `#f5f5f5` | 输入框/skeleton/未激活 |
| `$color-bg-warm` / `-error-light` / `-success-light` / `-mask` | `#fff8e1` / `#ffebee` / `#e8f5f0` / `rgba(0,0,0,0.6)` | — |
| `$color-border` / `$color-border-light` | `#e5e7eb` / `#f0f0f0` | 可见分割 / 弱分割 |
| `$border-width-base` | `2rpx` | — |

**理念**：改 `$color-text-primary` 一处 hex，secondary/tertiary/disabled 自动联动；
主题色阶由 `uniapp-theme` 的 `color-mix()` 运行时生成，两套体系各司其职。

### 6.6 圆角 / 阴影 / 层级

```scss
$radius-none: 0;  $radius-small: 8rpx;   // 标签、小按钮、输入框
$radius-medium: 16rpx;                    // 卡片、弹窗
$radius-large: 24rpx;                     // 大卡片
$radius-round: 999rpx;  $radius-circle: 50%;

$shadow-sm: 0 2rpx 4rpx rgba(0,0,0,0.06);
$shadow-md: 0 4rpx 12rpx rgba(0,0,0,0.08);
$shadow-lg: 0 8rpx 24rpx rgba(0,0,0,0.12);
$shadow-none: none;

$z-base: 0; $z-dropdown: 100; $z-sticky: 200; $z-overlay: 300;
$z-modal: 400; $z-toast: 500; $z-tooltip: 600; $z-max: 999;
```

禁止任何元素使用列表外的圆角值（如 `border-radius: 12rpx`）。

### 6.7 组件级 Token（`tokens/_components.scss`）

| 组 | Token（精确值） |
|----|-----------------|
| Button | `$btn-height-normal: 96rpx`、`$btn-height-small: 64rpx`、`$btn-radius-normal: 48rpx`、`$btn-radius-small: 32rpx`、`$btn-font-size-normal: $font-size-lg`、`$btn-font-size-small: $font-size-md`、`$btn-padding-normal: 0 $spacing-8`、`$btn-padding-small: 0 $spacing-6` |
| Card | `$card-padding: $spacing-6`、`$card-radius: $radius-medium`、`$card-header-padding: $spacing-6 $spacing-6 0`、`$card-footer-padding: 0 $spacing-6 $spacing-6` |
| Modal | `$modal-radius: $radius-medium`、`$modal-width-ratio: 0.8`、`$modal-max-height: 70%`、`$modal-header-padding: $spacing-6 $spacing-8 0`、`$modal-body-padding: $spacing-6 $spacing-8`、`$modal-footer-padding: 0 $spacing-8 $spacing-6`、`$modal-close-size: 48rpx` |
| Input | `$input-height: 96rpx`、`$input-padding: 0 $spacing-6`、`$input-font-size: $font-size-md`、`$input-icon-size: 40rpx`、`$input-clear-size: 36rpx` |
| NavBar | `$navbar-back-icon-size: 48rpx`、`$navbar-back-hit-area: 60rpx`、`$navbar-title-font-size: $font-size-lg`、`$navbar-title-font-weight: $font-weight-semibold` |
| Popup | `$popup-content-padding: $spacing-6 $spacing-8`、`$popup-header-padding: $spacing-6 $spacing-8`、`$popup-footer-padding: $spacing-4 $spacing-8`、`$popup-right-width: 80%`、`$popup-close-size: 48rpx` |
| Fixed Bottom Btn | `$btn-fixed-height: 96rpx`、`$btn-fixed-bottom-offset: $spacing-8`、`$btn-fixed-radius: $radius-round`、`$btn-fixed-font-size: $font-size-lg` |
| Avatar | `$avatar-size-sm: 64rpx`、`-md: 96rpx`、`-lg: 128rpx` |
| Empty / ErrorState | `$empty-icon-size: 240rpx`、`$empty-text-margin-top: $spacing-6` |
| Loading | `$loading-spinner-size: 64rpx`、`$loading-spinner-border: 4rpx`、`$loading-content-padding: $spacing-8 $spacing-10` |
| Skeleton | `$skeleton-row-height: 32rpx`、`$skeleton-row-radius: $radius-small`、`$skeleton-row-gap: $spacing-4`、`$skeleton-padding: $spacing-6`、`$skeleton-shimmer-duration: 1.5s`、`$skeleton-avatar-size-sm: 64rpx`、`-md: 96rpx` |
| Checkbox/Radio/Switch | `$control-size: 40rpx`、`$control-hit-min: 88rpx`、`$control-gap: $spacing-4` |
| Divider | `$divider-color: $color-border-light`、`$divider-height: 1px`、`$divider-margin: $section-margin 0` |
| Badge / Tag | `$badge-dot-size: 16rpx`、`$badge-number-min-width: 32rpx`、`$tag-padding: 2rpx $spacing-2`、`$tag-font-size: $font-size-xs` |
| ListItem | `$list-item-min-height: 96rpx`、`$list-item-padding: $spacing-5 $page-gutter`、`$list-item-icon-size: 48rpx` |

开发新组件必须**先定义 Token 再引用**，新增 Token 统一写入 `tokens/_components.scss`。

### 6.8 SCSS 函数与混入

```scss
@function tint($color, $weight)  { @return mix(white, $color, $weight); }
@function shade($color, $weight) { @return mix(black, $color, $weight); }

// 主色色板（编译期派生）
$color-primary-50: tint($theme-primary, 95%);  $color-primary-100: tint(..., 90%);
$color-primary-200: tint(..., 70%);  $color-primary-300: tint(..., 50%);
$color-primary-400: tint(..., 30%);  $color-primary-500: $theme-primary;
$color-primary-600: shade(..., 10%); $color-primary-700: shade(..., 20%);
$color-primary-800: shade(..., 40%); $color-primary-900: shade(..., 60%);
```

混入：`flex-center` / `flex-row-center` / `flex-col-center` / `flex-between`；
`text-ellipsis` / `text-ellipsis-multi($lines: 2)`；
`card-container`（margin `$spacing-4 $spacing-8` + bg-primary + radius-medium + padding `$spacing-6` + shadow-sm）；
`safe-area-bottom` / `safe-area-top`（同时写 `constant()` 与 `env()`）；
`hairline($color, $direction)` —— `::after` + `1px` + `transform: scale(0.5)`（all 方向用 `width/height: 200%` + `transform-origin: 0 0`）。

### 6.9 动效

```scss
$transition-duration-fast: 150ms;    // 微交互（hover/active）
$transition-duration-normal: 250ms;  // 常规过渡（展开/收起）
$transition-duration-slow: 400ms;    // 弹窗出入、页面切换

$ease-in: cubic-bezier(0.4, 0, 1, 1);
$ease-out: cubic-bezier(0, 0, 0.2, 1);
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
$ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

动画预设类（`_animations.scss` 全局引入一次，**禁止项目内新定义 `@keyframes`**，Popup 组件级动画除外）：

| 类名 | 场景 | 技巧 |
|------|------|------|
| `.animate-fade-in` / `.animate-fade-out` | 页面首次内容加载 | 最轻量，无位移 |
| `.animate-slide-up` | 列表项依次出现 | 逐项加 `animation-delay`，每项递增 50–80ms |
| `.animate-slide-down` | 下拉选项 / 通知条展开 | 从上方落下 |
| `.animate-scale-in` | 弹窗内容区二次动画 | 配合 Popup 主动画，`animation-delay: 100ms` |
| `.animate-shimmer` | 骨架屏 | `background-position` 200% → -200%，1.5s infinite |
| `.animate-spin` | loading 指示器 | 800ms linear infinite |

触发方式：`v-if` 控制创建/销毁 → 元素挂载时 `animation` 自动从头播放，无需 JS 操作 DOM。

### 6.10 交互状态与触摸区域

组件必须覆盖：`default` / `hover`（轻微变亮变暗）/ `active`（`scale(0.97-0.98)` + 阴影减弱）/
`focus`（边框高亮为主色）/ `disabled`（`opacity: 0.5` + `pointer-events: none`）/
`loading`（`opacity: 0.5` + spinner + 禁止点击）/ `error`（红边框 + 错误文字）/ `success`（绿色反馈）。

小程序注意：uni-app 的 `hover-class` 不支持 `:active`，统一用 `hover-class="xxx-hover"` 实现按下态，
同时保留 `:active` 作为 H5 端补充。

最小触摸区域 ≥ 88rpx：图标按钮撑到 `88rpx × 88rpx`；小文本链接用 `padding: $spacing-3; margin: -$spacing-3` 撑大；
Checkbox/Radio 项 `min-height: 88rpx`。

### 6.11 屏幕适配

- 设计稿基准 **750px 宽**，`1rpx = 屏幕宽度 / 750`；`rpxToPx = rpx * screenWidth / 750`，`pxToRpx = px * 750 / screenWidth`；
- 顶部：`useNavBarHeight()` 返回 `{ statusBarHeight, navBarContentHeight: 44, totalNavBarHeight }`；
- 底部：`safe-area-bottom` mixin（`constant()` + `env()`）；
- 横屏：`uni.onWindowResize` 判断 `windowWidth > windowHeight`；
- 鸿蒙降级：`isHarmonyOS()` 判 `sys.platform === 'harmonyos'`；`checkCapability(fn, fallback)` 包裹不支持的 API；
- **胶囊对齐（D12/D16）**：核心 API `uni.getMenuButtonBoundingClientRect()` 返回 `top / bottom / height / left`。
  `useCapsuleLayout()` 计算：

  ```
  capsuleGap         = windowWidth - menu.right
  navBarContentHeight= (menu.bottom - statusBarHeight) + (menu.top - statusBarHeight)
  totalNavBarHeight  = menu.bottom + (menu.top - statusBarHeight)
  capsuleCenterY     = menu.top + menu.height / 2
  contentMaxWidth    = menu.left - capsuleGap * 2
  ```

  自定义头部内容第一行必须与胶囊水平居中对齐，**绝对不允许遮挡或跑到胶囊上方**。
  TabBar 的 `list`（`pages.json`）与组件内 `tabList` 必须同步，建议抽 `src/constants/tabList.ts` 两端共用。

### 6.12 深色模式

方案：SCSS 变量映射 + CSS 变量桥接 + 媒体查询，兼容微信小程序 `prefers-color-scheme`。

```scss
page {
  --bg-page: #{$color-bg-primary};      --bg-light: #{$color-bg-secondary};
  --text-primary: #{$color-text-primary}; --text-secondary: #{$color-text-secondary};
}
@media (prefers-color-scheme: dark) {
  page { --bg-page: #1a1a2e; --bg-light: #16213e;
         --text-primary: #e4e6eb; --text-secondary: #b0b3b8; }
}
```

| Token | 亮色 | 深色 |
|-------|------|------|
| `$color-bg-primary` | `#ffffff` | `#1a1a2e` |
| `$color-bg-secondary` | `#fafafa` | `#16213e` |
| `$color-bg-tertiary` | `#f5f5f5` | `#0f3460` |
| `$color-text-primary` | `#2b2e31` | `#e4e6eb` |
| `$color-text-secondary` | `#5b6167` | `#b0b3b8` |
| `$color-border` | `#e5e7eb` | `#2a2a3e` |
| `$shadow-sm` | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.3)` |

组件内写法：`background: var(--bg-page, #fafafa); color: var(--text-primary, #171717);`。

### 6.13 无障碍对比度（D34）

| 文字类型 | 最低对比度 |
|----------|-----------|
| 正文（≤ 28rpx 非粗体） | ≥ 4.5:1 |
| 大号文字（≥ 24rpx 且粗体，或 ≥ 28rpx） | ≥ 3:1 |
| 禁用态 / 占位符 | 无要求 |
| 纯装饰元素（图标、分割线） | 无要求 |

已验证组合：`text-primary`/`bg-primary` 12.3:1；`text-primary`/`bg-secondary` 11.5:1；
`text-secondary`/`bg-primary` 5.6:1；`text-secondary`/`bg-secondary` 5.2:1；
`color-error`/`bg-primary` 4.5:1；`text-inverse`/`color-error` 4.5:1。

**仅大字可用**：`$color-primary`(#1CC8C4) 上白字 ≈ 2.7:1；`$color-text-inverse` on `$color-primary` ≈ 2.7:1。
`$color-text-tertiary`(#737a82) on 白 ≈ 3.7:1 **不通过**——三级文字仅建议大字号场景，正文必须用 `$color-text-secondary`。
深色模式 Token 必须逐一重算对比度。

### 6.14 设计合规审计流程

```
1. 确认扫描范围（全量 / 指定目录 / 指定页面）
2. 逐条执行 D01–D34 扫描
3. 输出报告，按 P0（必须修复）/ P1（建议修复）/ P2（优化建议）分级
4. 用户确认：全部修复 / 逐条确认 / 仅出报告
5. 执行修复（自动项自动修，人工项给建议）
6. 验证 npm run lint
```

自动化程度图例：可扫描 + 可自动修（D01/D02/D06/D09/D10/D18/D31/D33）；
可扫描 + 需人工确认（D19/D20/D21/D22/D23/D25/D26/D27/D28/D30/D32）；
可扫描 + 无法自动修（D03/D04/D07/D08/D11/D13/D24/D29）；
仅人工审查（D05/D12/D14/D15/D16/D17）。

代表扫描命令（可复制执行）：

```bash
rg "#[0-9a-fA-F]{3,8}\b|rgba?\s*\(" --glob "*.{vue,scss,css}" -n            # D01 颜色
rg "font-size:\s*\d+rpx" --glob "*.{vue,scss,css}" -n                        # D01/D06 字号
rg "(padding|margin|gap):\s*[^;]*\d+rpx" --glob "*.{vue,scss,css}" -n        # D01 间距
rg "border-radius:\s*\d+rpx" --glob "*.{vue,scss,css}" -n                    # D01/D18 圆角
rg "z-index:\s*\d+" --glob "*.{vue,scss,css}" -n                             # D09
rg "defineProps\(\[" --glob "components/**/*.vue" -n                         # D03
rg "transition(?:-property)?:\s*[^;]*\b(width|height|left|top|margin|padding|background-color)\b" --glob "*.{vue,scss,css}" -n  # D08
rg "<scroll-view\s+scroll-y" --glob "pages/**/*.vue" -n                      # D11
rg "animation:\s*none\b|transition:\s*none\b" --glob "**/Popup/**" -n        # D13
rg "position:\s*fixed.*\bbottom\b" --glob "pages/**/*.vue" -n                # D19
rg "uview-ui|vant|colorui|iview" --glob "package.json" -n                    # D29
rg "style=.*(display:\s*flex|justify-content|align-items)" --glob "*.vue" -n # D30
rg "暂无数据|无数据|无记录|没有数据|暂无内容" --glob "pages/**/*.vue" -n     # D32
rg "color:\s*#[0-9a-fA-F]{6}" --glob "*.{vue,scss}" -n                       # D31
```

**审计排除项**：`_theme-config.scss`（配置源）、`tokens/_semantic.scss`（Token 定义源）、
`_functions.scss`（函数/混入定义）、`vite.config.ts`、`pages.json` / `manifest.json`、
`*.ts` 颜色常量导出、`node_modules/`、`uni_modules/`、CSS `@keyframes` 中间色、CSS 注释中的颜色、`content: "#"`。

### 6.15 Utility 类与页面布局模式

**Utility（`_utilities.scss`，类似精简 Tailwind）**：

- Flex：`.flex` `.flex-col` `.flex-wrap` `.flex-1` `.flex-center` `.flex-between` `.flex-start` `.flex-end` `.flex-col-center` `.flex-col-start` `.items-center` `.items-start` `.items-end` `.justify-center` `.justify-between`
- Gap：`.gap-1` `.gap-2` `.gap-3` `.gap-4` `.gap-6` `.gap-8`
- 文字：`.text-center` `.text-left` `.text-right` `.text-ellipsis` `.text-ellipsis-2` `.text-ellipsis-3`
- 另有 `.text-{color}`、字号类、字重类、`.bg-*` / `.radius-*` / `.shadow-*`、`.p-*` / `.m-*`、显示与溢出类

**页面布局模式（`_layout.scss`，纯 CSS class，不依赖具体组件）**：页面由 10 个 zone 类组合：
`.lyt-page`（`flex column` + `min-height: 100vh` + `bg-secondary`）、
`.lyt-header`（`flex-shrink: 0` + `padding: $spacing-4 $page-gutter` + `bg-primary` + `z-sticky`）、
`.lyt-hero`（满屏 Banner/轮播，文字缩进由内部子元素自行处理）、
`.lyt-body`（`flex: 1` + `overflow-y: auto` + `padding: 0 $page-gutter`）、
`.lyt-section`（`margin: $section-margin 0` + `padding: $section-padding`）等；
典型组合见 §18.2 列表页、§18.3 详情页。

### 6.16 交付物

`styles/` 全套（见 6.2 目录树）、`demo.html`（Token 速查盘，自包含可直接打开）、
`docs/` 设计合规审计报告（P0→P2 分级，每条含路径/行号/依据/建议）。

---

## §7 组件唯一真源与容器原则

> 归并技能：`uniapp-base`。本层是 UniApp 侧**组件实现的唯一真源**，同时提供组件索引
> （中文需求 → 组件）。其它专项层**一律不重复实现组件**，需要组件时从本层取。

### 7.1 分层关系

```
专项层  style / standard / page-components / app-generate / ui-template-builder …
              ↓ 依赖
容器层  uniapp-base-skill/containers/    ← 根容器实现（本层）
              ↓ 依赖
变量层  uniapp-theme-skill/base.css      ← 变量唯一真源（§5）
```

**反向依赖禁止**：`uniapp-theme` 不得引用本层组件。

### 7.2 红线 实现层 B01–B15

| 编号 | 规则 |
|------|------|
| B01 | 容器是唯一实现。历史实现在 `uniapp-page-components/components/base-*`，必须迁入本层后删除原件，不允许两处并存 |
| B02 | 容器**不感知业务**：不出现接口调用、store 访问、业务文案、业务字段 |
| B03 | 内容型组件必须基于根容器（见 7.4） |
| B04 | 容器可嵌容器（`base-popup` 内部就是 `base-card`，这是设计而非违规） |
| B05 | 组件一律 Vue 3 `<script setup lang="ts">`，`props` 用 TS 接口 + `withDefaults`，每个 prop 带注释 |
| B06 | 每个组件目录必须有 `index.vue` + `props.json` + `usage.md` 三件套；`props.json` 必须**严格合法 JSON**（禁 `//` 注释、禁尾逗号） |
| B07 | `props.json` 字段固定 7 类：`name` / `title` / `category` / `aliases` / `props` / `events` / `slots`；`props` 每项四元组 `{name, type, default, desc}`；`aliases` 必填 |
| B08 | `props.json` 的 `props` 与实现**逐条对应**（名称、类型、默认值三者一致），`events` / `slots` 与 `defineEmits` / `<slot>` 一致 |
| B09 | 样式全部 `scoped`，颜色与尺寸走 `var(--xxx, 兜底)`，禁止裸值 |
| B10 | 容器对外不暴露内部实现类名（`.bc-header` / `.bc-body` 属私有），扩展走 props 与 slot |
| B11 | 弹窗类组件（`modal` / `action-sheet` / `picker` / `date-picker`）必须用 `base-popup` 承载，**禁止**自写 `position: fixed` + 遮罩 |
| B12 | 卡片类组件（`product-card` / `article-card` / `list-item` / `chat-bubble`）必须用 `base-card` 承载，**禁止**自写圆角/边框/内边距 |
| B13 | 演示优先：每个组件至少有一个可直接 `file://` 打开的自包含 HTML demo，落在 `demo-components/<场景>/html/` |
| B14 | Demo 交互状态默认触发到底（弹窗类默认打开），避免"打开页面什么都没发生" |
| B15 | 场景 demo 一律放 `demo-components/<场景>/`，只放**场景化组合与参考图**，不放组件实现 |

### 7.3 红线 索引层 C01–C10

| 编号 | 规则 |
|------|------|
| C01 | 索引与实现**同源**：注册表 `path` 必须落在本层内，禁止指向仓库外或空路径 |
| C02 | 每个组件在注册表有且仅有一条记录：`name` / `title` / `kind` / `category` / `aliases` / `path`。`kind` ∈ `container` / `component` / `style` |
| C03 | `category` 枚举固定：`container` / `form` / `feedback` / `business` / `list` / `navigation` / `style`；`kind=container` 的记录 `category` 一律为 `container` |
| C04 | `aliases` 至少 3 个，覆盖中文口语名、英文名、常见同义词，且**跨组件不得重复** |
| C05 | 匹配优先级：**用户点名组件名 > 点名别名 > 语义描述**；同名冲突按 `matching-rules.md` 第四章裁决表 |
| C06 | 需求里出现"卡片/弹窗/面板/列表项"等**内容型**词汇时，必须先匹配到根容器，再匹配具体组件 |
| C07 | `commands/*.md` 与 `_registry.json` 必须同步，不一致视为违规；`commands/*.md` 是**生成物，禁止手改**，改完实现必须重跑 `node scripts/gen-commands.js` |
| C08 | 固化流程（新增组件）固定 6 步（见 7.6） |
| C09 | 组件迁出或废弃时，注册表与 `commands/*.md` 必须同步清理，禁止留下指向空路径的记录 |
| C10 | 本层**不定义**任何 CSS 变量，也不重复定义 `@keyframes`；变量真源是 §5 `base.css`，关键帧真源是 `styles/animation.scss` |

### 7.4 容器原则

> **所有内容型组件的外壳必须来自根容器，禁止各自手写外壳。**

**内容型组件** = 承载"一段内容"的组件：卡片、弹窗、表单行、列表项、气泡、面板、页签内容区。

| 场景 | 必须使用 |
|------|---------|
| 卡片 / 面板 / 列表项 | `BaseCard` |
| 弹窗 / 抽屉 / 底部面板 | `BasePopup`（内置 `BaseCard`） |
| 带标签与错误提示的表单行 | `BaseFormItem` |
| 头像 | `BaseAvatar` |
| 顶部导航 | `BaseNavbar` |
| 底部菜单 | `BaseTabbar` |

**不强制套容器**：表单控件（switch / radio / checkbox / input）与纯展示件（empty-state / loading / price-tag / progress-bar / count-down）。

**子类不要重复设置**容器已提供的属性（圆角、背景、边框、阴影、安全区），避免双层边框与双层圆角。

| | 容器 `containers/` | 零件 `components/` |
|---|---|---|
| 职责 | 提供外壳（背景/圆角/边框/阴影/遮罩/安全区/动画） | 提供内容（选项、标签、数据、交互逻辑） |
| 数量 | 少而稳定 | 可持续扩充 |
| 依赖 | 只依赖主题变量 | 依赖容器 + 主题变量 |
| 例子 | `base-card` `base-popup` `base-form-item` | `picker` `radio-group` `toast` `product-card` |

### 7.5 组件总清单

**根容器（6 个）**

| 容器 | 职责 | 关键 prop 约定 |
|------|------|----------------|
| `base-card` | 卡片外壳：圆角/背景/边框/阴影/header/footer/按压反馈 | `title`、`radius`（默认 `var(--radius-card, 24rpx)`）、`padding`（`var(--space-4, 16rpx)`）、`background`（`var(--bg-card, #ffffff)`）、`margin`、`width`（`100%`）、`height`（`auto`）、`minHeight`、`border`（`false` 或穿 CSS 边框值）、`shadow`（`false` 或穿 CSS 阴影值）、`clickable`、`gap`（`var(--space-3, 12rpx)`）、`image` / `imageSize`（`var(--height-avatar-md, 80rpx)`）/ `imageRadius`（`var(--radius-image, 16rpx)`）；事件 `click` |
| `base-popup` | 5 方向弹窗/抽屉（top/bottom/left/right/center）+ 遮罩 + 安全区，内容内置 `base-card` | `show`（配合 `update:show` 做 v-model）、`direction`（默认 `bottom`）、`radius`（`var(--radius-lg, 24rpx)`）、`height`（`auto`，仅上下方向）、`width`（`560rpx`，左右/居中方向）、`padding`（`default` / `sm` / `none`）、`title`、`mask`（`true`）、`maskClosable`（`true`）、`duration`（`300` ms）、`safeArea`（`true`）；事件 `update:show` / `close`；插槽 `default` / `header-right` / `footer` |
| `base-form-item` | 表单项行外壳：标签/必填星号/错误文案/控件位 | `label`、`required`、`error`、`labelWidth`（`160rpx`）、`adjustPosition`（`true`）、`cursorSpacing`（`0`）；插槽 `default`（插槽参数 `inputProps` 含 `adjustPosition` / `cursorSpacing`）/ `label` / `error` |
| `base-avatar` | 头像外壳：图片/文字兜底/4 档尺寸/圆形或圆角 | `src`、`name`（优先取末两字）、`size`（`sm`/`md`/`lg`/`xl`，默认 `md`）、`round`（`true`）、`mode`（`aspectFill`/`aspectFit`/`widthFix`/`scaleToFill`，默认 `aspectFill`）、`fallback`；事件 `click` |
| `base-navbar` | 顶部导航：状态栏占位/返回/标题/右侧插槽/胶囊 | `title`、`showBack`（`true`）、`transparent`、`fixed`、`placeholder`（`true`）、`statusBarHeight`、`showStatusBar`（`true`）、`rightText`、`capsuleRight`、`avoidCapsule`（`true`）、`capsuleGap`（`8` px）；事件 `back` / `rightClick` / `capsuleClick`；插槽 `status-bar` / `left` / `title` / `right` |
| `base-tabbar` | 底部菜单：2~5 项/角标/安全区/固定，激活项主题色高亮 | 菜单项列表（图标 + 文字 + 角标） |

**内置组件（26 个）**

| 分类 | 数量 | 组件（用途） |
|------|------|--------------|
| `form` | 8 | `base-button`（primary/ghost/text/danger × sm/md/lg，支持 loading/disabled/block/round）、`search-bar`（输入/清除/确认搜索/取消）、`input-field`（基于 BaseFormItem，标签/清除/错误提示）、`picker`（基于 BasePopup 的多列滚轮选择器）、`date-picker`（基于 BasePopup 的年/月/日三列滑轮）、`switch`（主题色与自定义轨道色）、`checkbox-group`（options 驱动多值选择）、`radio-group`（options 驱动单值选择） |
| `feedback` | 5 | `toast`（短暂显示自动消失的轻提示）、`modal`（基于 BasePopup 的居中模态对话框）、`action-sheet`（基于 BasePopup 的底部操作菜单）、`loading`（加载中指示器）、`empty-state`（无数据占位展示） |
| `list` | 5 | `list-item`（基于 BaseCard，图标/标题/描述/值/箭头）、`product-card`（基于 BaseCard，图片/标题/描述/价格/原价/销量/标签）、`article-card`（基于 BaseCard，封面图/标题/描述/作者/日期/阅读量）、`chat-bubble`（左/右位置，文本/图片/语音，头像由 BaseAvatar 渲染）、`timeline`（整条由 BaseCard 承载，时间节点与事件） |
| `navigation` | 3 | `top-tab`（顶部横向页签，指示条用 transform 动画）、`side-menu`（抽屉式侧边栏，支持二级子项展开收起）、`breadcrumb`（路径面包屑，最后一级不可点击） |
| `business` | 5 | `price-tag`（货币符号/划线原价/三档字号）、`count-down`（结束时间戳/相对秒数/格式模板/自定义分段）、`progress-bar`（按状态取主题填充色）、`stepper`（范围限制/步长/直接输入）、`coupon`（外壳基于 BaseCard） |

**样式类（5 类，纯 CSS，路径在 `styles/`）**

| 目录 | 类名 |
|------|------|
| `styles/button/` | `btn-primary` `btn-secondary` `btn-ghost` `btn-icon` `btn--small` `btn--large` `btn--block` |
| `styles/card/` | `card-basic` `card-elevated` `card-glass` |
| `styles/combo/` | `icon-tag` `badge` |
| `styles/line/` | `solid-line` `dashed-line` `gradient-line` `space-line` `v-solid-line` |
| `styles/shape/` | `semi-circle` `circle` `dot` |

### 7.6 组件实现要求与检索/固化

**实现要求**：

1. Vue 3 `<script setup lang="ts">`：禁止 `export default {}`、`data()`、`methods`、`this.$emit`；
2. props 用 `interface` + `withDefaults`；事件用 `defineEmits<{ ... }>()` 泛型元组；
3. 颜色/尺寸/间距/圆角/字号一律 `var(--token, 兜底)`，兜底值与 `base.css` 真值一致；
4. 只用 rpx（`env(safe-area-inset-*)` 除外），不出现 `px`；
5. 组件内不写 `@keyframes`：用 `.ui-spin` / `.ui-fade-in` / `.ui-slide-up` 等类；
6. 不使用 HTML5 标签：只用 `view` / `text` / `image` / `input` / `textarea` / `scroll-view` / `picker` / `picker-view` / `switch` / `radio` / `checkbox`；
7. 不使用 Emoji，占位用中文文字；8. 不引入三方依赖；
9. `<style scoped>`，不定义新 `--xxx:` 变量；
10. 图片用 `image` + `mode="aspectFill"` + 占位背景 + `@error` 兜底；
11. 点击区不小于 `88rpx`；12. 动画只改 `transform` / `opacity`。

**检索流程**：

```
用户需求
  → ① 清洗：去空格、统一大小写
  → ② 点名命中：组件名 / 别名 → 直接命中
  → ③ 容器优先：命中"卡片/弹窗/表单行/头像/导航"等外壳词 → 先给根容器
  → ④ 分类匹配：查 references/matching-rules.md 的分类表
  → ⑤ 冲突裁决：按 matching-rules.md 第四章裁决表
  → ⑥ 未命中 → 走固化流程
```

命中后**按顺序输出**（缺一不可）：① 组件名 + 一句话说明；② 组件路径（相对仓库根，取自 `_registry.json` 的 `path`）；
③ 属性/事件/插槽表；④ 用法示例（组件目录 `usage.md`）；⑤ 依赖提醒（基于哪个容器、是否需先引入容器）。

**固化流程（新组件）6 步**：

1. 判定分类：`form` / `feedback` / `list` / `navigation` / `business`（样式类归 `style`）；
2. 落位 `components/<category>/<name>/`，写 `index.vue` + `props.json` + `usage.md`；内容型组件必须基于根容器实现；
3. 在 `components/_registry.json` 追加一条（`name`/`title`/`kind`/`category`/`aliases`/`path`）；
4. 跑 `node scripts/gen-commands.js` 重新生成 `commands/*.md`（**不手写**）；
5. 在 `references/matching-rules.md` 对应分类表加关键词行；
6. 在 `demo-components/` 下补一个可直接打开的 HTML。

### 7.7 easycom 全局注册（必做）

本层按三层规范分目录（`containers/`、`components/<category>/`），**两种目录都不满足** uni-app easycom
默认规则 `components/组件名/组件名.vue`。不显式注册时页面写 `<base-card>` / `<base-button>` 会**扫不到组件**，
表现为「标签不报错、页面却空白」。

因此复制本层进项目后，必须把 `easycom.json` 内容合并进 `src/pages.json`：

```json
{ "easycom": { "autoscan": true, "custom": {
  "^base-card$": "@/containers/base-card/index.vue",
  "^base-button$": "@/components/form/base-button/index.vue" } } }
```

`easycom.json` 由 `node scripts/gen-easycom.js` 从 `_registry.json` 生成，**组件新增、移动、改名后必须重跑**，禁止手写维护。

### 7.8 源仓库配套脚本

源技能带索引/注册生成与自检脚本（`gen-commands.js`、`gen-easycom.js`、`check-imports.js`、`check-tables.js`），
此处不吸收实现；脚本与 demo 见源仓库 `vibeCoding/frontend/uniapp/uniapp-base-skill/scripts/` 与 `demo-components/`。
匹配规则细则见源仓库 `references/matching-rules.md`、`references/component-checklist.md`。

---

## §8 页面级组件与业务页面

> 归并技能：`uniapp-page-components`（22 个整页/业务组件）、`uniapp-member-center`（会员中心业务场景包）。

### 8.1 页面级组件红线 P01–P15

| 编号 | 规则 |
|------|------|
| P01 | 整页组件自带页面级背景与骨架，**不**再外层套 `base-card`；局部内容型组件**必须**套 `base-card` |
| P02 | 卡片类布局一律基于 `<base-card>` 或透传 `cardProps`，不重复造圆角/内边距 |
| P03 | 禁写死颜色/间距/圆角/字号，一律 `var(--xxx)` + 兜底值 |
| P04 | 例外白名单（必须加注释）：阴影模糊半径、图片固定高度、`1rpx` 细边框、小徽标/指示条尺寸 |
| P05 | 样式 `scoped`；props 用 TS 接口 + `withDefaults`；事件用 `defineEmits` 泛型 |
| P06 | 图片必须 `mode` + 占位 + `@error` 兜底 |
| P07 | 可点击区 ≥ `88rpx`（44pt） |
| P08 | 动画只改 `transform` / `opacity` |
| P09 | 禁第三方 UI 库（uView / Vant Weapp / ColorUI / iView） |
| P10 | 长度用 `rpx` |
| P11 | 组件必须留扩展口：props / slot / emit，外部不改源码即可定制 |
| P12 | 组件内只做展示，**禁止** `uni.request`、store 写入 |
| P13 | 结构性嵌套 `v-for` 属必要例外（允许，如九宫格/分组）；数据型嵌套 `v-for` 禁止 |
| P14 | 迁移后 `components/base-*/` 必须删除，改为依赖 §7；两处并存即违规 |
| P15 | `references/theme-integration.md` 的主题变量清单必须与 §5 的 `base.css` 一致 |

### 8.2 组件清单（22 个 = 6 基础 + 6 业务 + 10 页面）

**基础组件（6）**：`base-card`（空卡片托底）、`base-button`（4 类型 × 3 尺寸 + loading/disabled/block/round）、
`base-navbar`（标题 + 返回 + 右侧 slot，状态栏适配 + 吸顶占位）、`base-tabbar`（2~5 项，图标/角标，激活主题色，安全区）、
`base-form-item`（label + 必填星号 + 控件 slot + 错误提示）、`base-avatar`（图片/兜底首字，sm/md/lg，多处共用）。

> 这 6 个与 §7 的根容器重复，**必须迁出**改为依赖 §7，本层不保留第二份实现。

**业务组件（6）—— 组合空壳实现，不改空壳**：

| 组件 | 用途 | 基于 |
|------|------|------|
| `user-card` | 头像/昵称/签名/右侧按钮 | `base-card` + `base-button` |
| `comment-item` | 头像/昵称/时间/内容/点赞/回复 | `base-card` |
| `notice-bar` | icon/文案/可关闭/跑马灯 | 轻量（不依赖空壳） |
| `setting-item` | 图标/label/描述/箭头/角标/开关 | 独立（可放 `base-card` 内） |
| `empty` | 空状态：图/文案/操作按钮 | 轻量 + `base-button` |
| `result-page` | 结果页：成功/失败/警告/信息 + 操作按钮 | `base-button` |

**页面组件（10）**：

| 组件 | 用途 | 对应真实页面 |
|------|------|--------------|
| `tab-list-page` | Tab 吸顶 + 卡片列表 | 我的订单、消息中心、商品列表 |
| `chat-page` | 微信风格聊天：底部输入栏 + 左右气泡 | 聊天会话页 |
| `moments-page` | 微信风格朋友圈：封面头图 + 动态列表 + 点赞评论 | 朋友圈 |
| `product-detail-page` | 导航 + 头图 + 信息卡 + 多卡片 sections + 底部操作栏 | 商品详情 |
| `profile-page` | 用户信息头 + 分组列表（右侧箭头/角标/左图） | 我的、设置、通知、购物车 |
| `image-card` | 图片卡片：顶部图 + 标题 + 描述 + 标签 | 商品卡、内容卡 |
| `search-page` | 搜索框 + 历史/热门标签 + 结果列表 + 防抖 | 搜索页 |
| `form-page` | 导航 + 表单区 slot + 底部提交按钮 | 资料填写、发布、反馈 |
| `login-page` | logo + 表单 + 微信登录 + 协议 + 提交 | 登录页、注册页 |
| `home-page` | 导航 + 区块 slots + 下拉刷新/加载更多 + 底部菜单 | 首页、商城首页 |

**内部依赖（复制时必须连带）**：`form-page` → `base-navbar`+`base-button`；`home-page` → `base-navbar`+`base-tabbar`；
`login-page` → `base-button`；`tab-list-page`/`profile-page`/`image-card` → `base-card`；`user-card` → `base-card`+`base-button`；
`comment-item` → `base-card`；`empty`/`result-page` → `base-button`；`user-card`/`comment-item`/`chat-page`/`moments-page`/`profile-page` → `base-avatar`。

**使用前提**：① `chat-page`/`product-detail-page`/`form-page`/`home-page` 内置的是**简化版导航栏**（未做状态栏适配与胶囊对齐），
使用含导航栏的组件时页面需设 `"navigationStyle": "custom"`，正式项目建议用项目导航栏替换或经 slot 传入；
② `App.vue` 需定义 `--status-bar-height`，APP 端必须运行时取 `uni.getSystemInfoSync().statusBarHeight`；
③ `tab-list-page`/`chat-page`/`product-detail-page`/`search-page`/`form-page`/`home-page` 根容器为 `height: 100%`，使用页面需给确定高度（如根 `view` 设 `height: 100vh`）；
④ 各页面组件自带页面级背景（`--bg-page`），外层无需再包容器。

### 8.3 主题变量绑定（禁止写死）

| 用途 | 变量 |
|------|------|
| 主色（按钮/高亮/自己气泡/菜单激活/链接） | `var(--color-primary)` |
| 页面背景 / 卡片输入气泡导航底 / 浅色强调底 | `var(--bg-page)` / `var(--bg-card)` / `var(--bg-light)` |
| 文字主/次/弱 / 反白 | `var(--text-primary)` / `--text-secondary` / `--text-tertiary` / `var(--text-inverse)` |
| 边框 | `var(--border)` / `--border-light` |
| 错误/必填星号/角标/价格 | `var(--color-error)` |
| 圆角 | `--radius-card` / `--radius-btn` / `--radius-tag` / `--radius-avatar` / `--radius-image` / `--radius-full` |
| 间距 / 字号 | `var(--space-2/sm/md/lg/xl/2xl/3xl)` / `var(--font-xs/sm/md/lg/xl/2xl)` |
| 控件高 / 图标尺寸 | `var(--height-btn-sm/md/lg/xl)`、`var(--height-avatar-sm/md/lg)` / `var(--icon-xs/sm/md/lg)` |
| 状态栏高度 | `var(--status-bar-height, 0)`（`App.vue` 定义） |

**主题自动对齐**（生成组件前必做）：扫描 `App.vue` 的 `<style>`、`src/styles/`、`static/css/`、`uni.scss`
定位主题变量；识别命名风格（CSS `--color-primary` / SCSS `$primary` / LESS `@primary`）与尺寸单位（rpx/px/rem）；
三场景处理：命名一致 → 原样复制零改动；命名不同 → 生成**桥接文件**（项目变量 → 组件语义变量），**不改组件内部**；
无主题系统 → 提取高频品牌色生成变量组（或先跑 §5 初始化，推荐）。

### 8.4 自动替换现有导航栏 / TabBar

**底部菜单**：读 `pages.json` 的 `tabBar.list` → 转 `base-tabbar` 的 `items`：
`pagePath`→`key`、`text`→`text`、`iconPath`→`icon`、`selectedIconPath`→`activeIcon`、（业务注入）`badge`。
步骤：① 新建 `src/custom-tab-bar/index.vue` 渲染 `base-tabbar`，`onChange` 里 `uni.switchTab({ url: '/' + item.key })`；
② `pages.json` 的 `tabBar` 加 `"custom": true`（保留 `list` 作占位）；③ 每个 tab 页 `onShow` 同步激活项。
不依赖微信官方方案也可：把 `base-tabbar` 直接放进各 tab 页底部（页面根 `height: 100vh`，内容区留 `padding-bottom`），推荐前者（一处维护）。

**头部菜单**：仅对 tabBar 页面生效，`pages.json` 设 `"navigationStyle": "custom"`（详情页等非 tab 页不改）；
tab 页模板顶部加 `base-navbar`：`title` 取 `navigationBarTitleText`、`:show-back="false"`、`:fixed="true"`、`:placeholder="true"`、
`status-bar-height="var(--status-bar-height)"`；`App.vue` 定义 `--status-bar-height`，否则导航栏贴顶。

**迁移注意**：原生 tabBar 与自定义 tabBar 二选一；图标资源沿用现有 `iconPath`/`selectedIconPath`，零新增素材；
替换后必须验证 tab 高亮、首页无返回键、非 tab 页返回键正常、safe-area 底部间距正确；改完用 §10 复检跨端表现一致。

### 8.5 会员中心业务场景包（`uniapp-member-center`）

**输出范围**：① 会员头（身份、等级、积分、权益入口）；② 权益区（3~4 个可配置权益，业务文案不写死进组件）；
③ 每日任务（进度、任务列表、领取状态）；④ 积分商城（两列商品卡，支持加载、空态、图片错误兜底）；
⑤ 页面状态（加载骨架、空态、请求失败、未登录跳转）；⑥ 数据契约（会员、任务、商品三个 DTO）。

**约束 M01–M08**：

| 编号 | 规则 |
|------|------|
| M01 | 会员卡等内容型组件必须基于 `base-card`；弹层（权益说明、兑换确认）必须基于 `base-popup` |
| M02 | 会员等级、积分等**展示口径统一由数据字段决定**，组件内不做等级换算；换算逻辑归业务层 |
| M03 | 样式引用 Token，禁止写死；会员卡的品牌感通过主题变量实现，不硬编码金色/黑色 |
| M04 | 演示与效果图用示例数据，集中在模板顶部 `mock` 常量区，方便替换 |
| M05 | 会员数据请求由外部传入或经 `api/` 调用，组件内不直接发请求 |
| M06 | `demo/screenshots/` 的图必须与当前模板实现一致；模板改了必须重出图 |
| M07 | 模板中的可交互区域必须留扩展口（props / slot / emit），不写死业务文案 |
| M08 | 不得重复实现 §7 已有组件；确需定制时用 props 透传或包装，不复制源码 |

**禁止项**：引入 uView/Vant/ColorUI；把积分、等级、商品、任务名称写死为生产数据；组件内部直接 `uni.request`；
脱离主题变量复制视觉稿中的固定绿色/金色/圆角/阴影；只做默认态（必须提供加载、空、失败、未登录处理）。

**实施顺序**：读主题变量与现有基础组件（缺则先补依赖）→ 页面容器经请求层取数并传 `member`/`tasks`/`products` 给展示组件
→ 以 `templates/member-center.vue` 为结构基线替换 mock → 点击只发 `benefit`/`task`/`product` 事件，导航与接口副作用留在页面容器
→ 按 `references/acceptance.md` 验收四种数据状态和小程序安全区。

---

## §9 跨端兼容与 Vue 2 升级

> 归并技能：`uniapp-crossplatform-audit`、`uniapp-vue2-upgrade`。

### 9.1 跨端审计红线 X01–X09

| 编号 | 规则 |
|------|------|
| X01 | 只读审计，输出报告，不改代码 |
| X02 | 每条问题必须写明：**影响平台**（可多选）、路径行号、平台差异事实、修复方案 |
| X03 | 条件编译块必须**成对且可读**：`#ifdef` 与 `#endif` 配对，跨端分支不得只有单端实现而无兜底 |
| X04 | 平台专属 API 必须标注替代方案或降级路径，禁止只写"该 API 在 XX 端不支持"就结束 |
| X05 | 单位统一 `rpx`；`px` 只在必须物理像素处使用 |
| X06 | 安全区必须用 `env(safe-area-inset-*)`，不得写死数值 |
| X07 | 涉及 `scroll-view` / `swiper` / `video` / `map` 等组件的差异，必须给出实际平台结论，不写"可能存在差异" |
| X08 | 风险分级与 §10 代码审计的 P0–P3 一致，跨端问题最高可判 P1 |
| X09 | 报告中的"规范依据"引用必须带前缀（"R19"、"D11"） |

**6 个审计维度**：模板标签（`div`/`span`/`p`/`h1~h6`/`img`/`ul` 在小程序端失效）、
样式兼容（`background-image`、CSS 变量跨端差异、`px`/`rpx` 混用、`vw`/`vh` 适配）、
API 调用（`fetch`/`window`/`document`/`localStorage`/`alert` 在小程序端不可用）、
条件编译（`#ifdef MP-WEIXIN` / `APP-PLUS` / `H5` 是否完整）、
平台配置（`manifest.json` 的 `mp-weixin`/`h5`/`app-plus` 差异化字段）、
端间表现差异（键盘、滚动、安全区、支付回调）。

**端间差异专项扫描**：胶囊避让（自定义导航是否读了 `uni.getMenuButtonBoundingClientRect()`）；
键盘顶起（输入框是否声明 `adjust-position`、固定底栏是否处理键盘高度）；
安全区（四边是否都处理，只出现 `bottom` 视为 P2）。

**输出**：`uniapp-crossplatform-audit-report.md`，按风险等级分组，每条含维度 / 风险等级 / 位置 / 风险描述 / 判定依据 / 参考标准。

### 9.2 Vue 2 → Vue 3 升级红线 V01–V09

| 编号 | 规则 |
|------|------|
| V01 | 默认只输出方案。执行升级**必须**先获得用户明确确认 |
| V02 | Vue2 项目**可以继续被 §10 代码审计**，Vue3 专属检查项标注"不适用"。不得以"必须先升级"为由拒绝审计 |
| V03 | 升级目标必须落在 §2 的现行规范上（目录、命名、TS、Pinia），不产出"半 Vue3" |
| V04 | 迁移分批，每批**可独立验证、可回滚**。禁止一次性全量替换 |
| V05 | 差异清单必须覆盖：响应式（`Vue.observable` / `Vue.set`）、生命周期命名、`v-model` 语义、`filters`、`$listeners`、`$children`、插槽语法、事件总线、Vuex → Pinia、Vue Router 差异、自定义指令钩子 |
| V06 | 组件层升级后优先复用 §7 的容器与零件，禁止把旧组件原样搬过来形成第二份实现 |
| V07 | 样式层升级统一落到 §5 的 CSS 变量；升级中不得引入第三套变量名 |
| V08 | 方案输出必须包含**风险点**与**回滚方式**，不能只列改动清单 |
| V09 | 方案中每条改动都要给**落点文件**与**改动原因**，便于逐条评审 |

**升级范围对照**：

| 维度 | Vue2 写法 | Vue3 写法 | 难度 |
|------|-----------|-----------|------|
| API 风格 | Options API（`data`/`methods`/`computed`/`watch`） | Composition API（`ref`/`reactive`/`computed`/`watch`） | 中 |
| 组件定义 | `export default { name, props, data, ... }` | `<script setup>` + `defineProps`/`defineEmits`/`defineExpose` | 中 |
| 生命周期 | `created`/`mounted`/`beforeDestroy` | `onMounted`/`onUnmounted`（无 `beforeDestroy`） | 低 |
| 状态管理 | Vuex（`state`/`mutations`/`actions`/`getters`） | Pinia（`defineStore` setup 风格） | 中 |
| 类型系统 | 可选 TypeScript | 默认 TypeScript 严格模式 | 中 |
| 混入 | `mixins: [...]` | 自定义 composables + `useXxx()` | 中 |
| 过滤器 | `{{ value \| filter }}` | 计算属性或方法 | 低 |
| 插槽语法 | `slot="foo"` `slot-scope="scope"` | `#foo` `v-slot:foo="scope"` | 低 |
| 路由 | uni-app 自带路由 | 不变 | — |
| 构建 | HBuilderX / vue-cli | Vite + `@dcloudio/vite-plugin-uni` | 中 |

**升级阻塞点（常见）**：第三方 UI 库 / 组件库未发布 Vue3 版本；Vuex 模块（Vuex 4 可用但迁 Pinia 收益更高）；
uni-app 插件市场部分插件只支持 Vue2；`sync` 修饰符（移除，需 `v-model:xxx` 或事件替代）；
`$listeners`（移除，需 `$attrs` + `emits`）；过滤器 / `filter` 关键字（移除）；
`keyCode` 修饰符（移除，需按键名）；`v-if` / `v-for` 优先级（Vue3 中 `v-if` 高于 `v-for`）。

**升级策略（Phase 2 三选一）**：A 全量升级（一键全替换）；B 渐进式升级（先 Vue2.7 过渡，再升 Vue3）；
C 双轨并行（新功能 Vue3，老代码逐步迁移）。

**输出文件**：`vue2-to-vue3-readiness-report.md`（就绪度报告）、`vue2-to-vue3-migration-plan.md`（迁移方案）、
`vue2-to-vue3-diff-checklist.md`（按文件的差异清单）。Phase 1–3 仅输出报告，Phase 4 才执行迁移。

---

## §10 诊断与审计

> 归并技能：`uniapp-diagnostic`（问题诊断）、`uniapp-code-audit`（只读合规审计）、`uniapp-crossplatform-audit`（§9.1）。

### 10.1 诊断红线 D01–D09

| 编号 | 规则 |
|------|------|
| D01 | 先复现后下结论。不复现就改代码属于赌博 |
| D02 | 按层定位：渲染层 → 数据层 → 样式层 → 网络层 → 环境/平台层。禁止一上来就改样式 |
| D03 | 一次只改一个变量。多个猜测同时落地会掩盖真因 |
| D04 | 修复要**最小**：在根因处改一次，不在每个调用点打补丁 |
| D05 | 诊断产物：问题现象 → 复现步骤 → 根因 → 修复方案 → 验证方式 |
| D06 | 涉及组件实现规范的判定以 `references/component-spec.md` 为准；但**容器原则**以 §7 为准 |
| D07 | `references/component-spec.md` 的命名规范采用 PascalCase + `App` 前缀，属**业务项目命名空间**；描述时必须写明作用域 |
| D08 | 诊断过程中的临时打点必须清理，不得留在提交里 |
| D09 | 改不动的问题要明说边界，不做无根据的猜测性修改 |

> **与代码审计的分工**：诊断是"运行时排障"，**可读可写**但改动范围限于诊断本身，不顺手重构业务代码；
> 代码审计是"静态合规"，**只读**。

**项目规范化诊断流程（4 Phase）**：① 项目结构扫描（对比标准骨架 `api`/`stores`/`components`/`pages`/`styles`，识别缺失目录与文件）；
② 代码规范检测（API 层是否统一封装、状态管理是否用 Pinia/Vuex、组件是否统一、样式是否集中）；
③ 生成诊断报告（结构缺失清单 + 规范违背项及优先级 + 按优先级排序的调整清单）；
④ 执行规范化（可选，每次调整后更新 `CLAUDE.md`）。输出 `standardization-report.md`。

### 10.2 代码审计红线 U01–U10

| 编号 | 规则 |
|------|------|
| U01 | **只读**。报告之外不产出任何文件修改 |
| U02 | 报告输出 `uniapp-audit-report.md`，结构固定：结论摘要 → 风险分布 → 明细（按 P0→P3）→ 修复建议 → 附录（检测命令） |
| U03 | 风险等级定义固定：P0（阻断发布/安全问题）、P1（功能缺陷/规范硬违规）、P2（体验与一致性问题）、P3（优化建议） |
| U04 | 每条问题必须给出：文件路径、行号、判定依据（引用具体红线编号）、修复建议。**禁止**只写"建议优化" |
| U05 | 引用规范必须带前缀（"D01"、"R10"、"B03"） |
| U06 | UI 一致性维度的"参考标准"必须指向 §6 的 D 系列 + §5 的 `base.css`，**不得**指向 §1 工程脚手架 |
| U07 | 变量检查以 §5 的 `base.css` 变量清单为准，引用了清单外的变量即判为**悬空变量** |
| U08 | 容器原则检查以 §7 的根容器清单为准，识别出手写卡片/弹窗外壳的组件 |
| U09 | 检测命令必须可复制执行（grep / rg 形式），不写"人工检查"了事 |
| U10 | 扫描只读命令在 Windows 下的替代写法必须给出（PowerShell 等），不允许因环境问题跳过维度 |

**10 个审计维度与来源**：安全合规（§4 红线）；性能（§2 性能规范）；代码质量（§2 R 系列 + TS/Vue3 通用规范）；
架构与规范（§1 项目骨架 + §2 R01–R20）；UI/主题一致性（§6 D 系列 + §5）；跨平台兼容（§9.1）；
小程序专项（微信官方限制 + §2 性能规范）；App 端专项（uni-app 官方文档 + `manifest.json` 的 `app-plus` 配置）；
冗余与死代码（通用工程规范 + 静态资源规范）；API 契约（§3 + §2 接口规范）。

**审计流程**：① 范围确认（全量 or 指定模块；目标平台；重点维度；可选增量审计/抽样审计）；
② 10 维度扫描（记录位置、风险等级、判定依据、参考标准）；③ 按 P0/P1/P2/P3 归类并统计各维度问题数；
④ 输出报告，**不包含任何修复代码或修复指令**。

**风险等级（两个技能共用）**：P0 / Critical（违反强制红线或上线合规要求，可能审核被拒、安全漏洞或严重性能问题）；
P1 / High（影响功能、性能或稳定性）；P2 / Medium（影响可维护性或规范符合性）；P3 / Low（优化建议）。
风险等级仅用于报告分类，**不代表修复指令**。

**代表扫描命令**：

```bash
rg "<(div|span|p|h[1-6]|img|ul)\b" --glob "pages/**/*.vue" -n     # H5 标签（跨端维度）
rg "fetch\(|window\.|document\.|localStorage|alert\(" --glob "*.{vue,ts}" -n   # 小程序不可用 API
rg "#ifdef|#ifndef|#endif" --glob "*.{vue,ts,js}" -n              # 条件编译使用与配对
rg "uni\.request\(" --glob "src/**/*.vue" -n                      # 组件内直发请求（违反 P12）
rg "v-for" --glob "pages/**/*.vue" -n                             # 嵌套 v-for（R01）
rg "eval\(|new Function\(" --glob "*.{vue,ts,js}" -n              # 危险方法（R07）
rg "password|secret|token\s*[:=]\s*['\"]" --glob "*.{vue,ts,js}" -n  # 敏感信息（A03/A06）
node scripts/check-miniprogram.js <项目根目录>                      # 小程序专项（见下）
```

> 小程序专项脚本覆盖 M1（scoped `:root` 变量静默失效）、M2（自定义导航未读胶囊）、K1（输入框未声明 `adjust-position`）、
> M7（模板残留 HTML 标签）、M8（DOM 式图片兜底）、M9（登录/注册页缺四态）；输出 P0/P1/P2 分级，
> 存在 P0/P1 时退出码为 1，可直接接入 CI。脚本见源仓库 `uniapp-code-audit-skill/scripts/`。

---

## §11 UI 复刻与模板构建

> 归并技能：`uniapp-ui-replica`（按图复刻）、`uniapp-ui-template-builder`（页面模板库）。

### 11.1 复刻红线 R01–R09

| 编号 | 规则 |
|------|------|
| R01 | 复刻前先查 §7 的注册表。**已有组件禁止重写**，只做 props 配置 |
| R02 | 复刻出的页面级内容块必须用容器承载（`base-card` / `base-popup`），不手写外壳 |
| R03 | 颜色、间距、圆角、字号一律落成 `var(--xxx)`；"图上有某个特定颜色"时先归入主题变量（必要时新增语义色），不写死 |
| R04 | 视觉校准必须做**并排对比**，容差：颜色 ±2/255，间距 ±2px，字号必须完全一致 |
| R05 | 复刻产出的 demo 必须自包含可直接打开，交互状态默认触发到底 |
| R06 | 沉淀公共组件时固定三件套 `index.vue` + `props.json` + `usage.md`，并同步注册表、`commands/*.md`、`matching-rules.md` |
| R07 | 沉淀的组件落在 §7 的 `components/<category>/`，不在本层留实现 |
| R08 | 图片资源必须用占位图替换方案处理缺失（`@error` 兜底），不硬引用不存在的路径 |
| R09 | 复刻**不还原**交互逻辑，只还原视觉与布局；交互按项目既有模式接 |

**两种执行模式**（默认走快速模式）：快速模式（用户只发图，未指定框架）→ 直接输出单文件 HTML + 一句话结构说明；
完整模式（用户指定技术栈 / 要求接入项目 / 多图）→ 走完整 0–6 阶段流程，输出结构分析 + Token 表 + 代码。

**核心流程**：

```
0.0 读图准备：读本地路径或 URL（失败时要求重供）；评估清晰度/完整性/是否长图多图；质量不足先告知用户再估算
1.   结构化读图：识别页面类型（中后台/营销/官网/移动端/文档）→ 拆结构（页面→区块→卡片→元素）
                 → 标记颜色/字号/间距/圆角/阴影/图标 → 识别特殊元素（二维码、图表、头像、地图）
2.   收敛 Token：提取主色/中性色/文字色/背景色，收敛间距/圆角/阴影/字号阶梯
3.   代码生成：先搭骨架（layout）再填血肉（components）；默认单文件 HTML + Tailwind CDN
4.   验证交付：检查关键状态（hover/active/disabled）；说明未在浏览器实测；给出还原度自评与待确认项
```

**复杂元素策略**（能模拟就模拟，不能模拟再占位）：通用图标 → Iconify / 内联 SVG（降级：语义文字标签）；
二维码 → QRCode.js 真实生成；图表 → ECharts / Recharts 渲染 mock 数据；地图 → CSS 色块 + 标注点模拟；
Banner/头像 → 图片 URL（降级 CSS gradient）；日历 → 原生 `<input type="date">` 或 DatePicker；文件上传 → 拖拽上传 UI。
**禁止直接使用 Emoji 作为正式图标。**

**长页面（高 > 宽 × 2）**：按视觉断点拆成若干屏（首屏/列表区/表单区/底部区），先复刻可见区域，再询问是否继续或合并为滚动区块。

**增量精调**：只改被指出的元素不重写整页；记录已确认的视觉参数；输出局部 diff 或修改后完整文件；不重复输出整份 Token 表。

**还原度目标**：第一稿整体布局、主色、关键组件形态与原图一致，**≥ 80% 还原度即可交付**；
精调阶段修复用户指出的差异点；**不追求** 100% 像素级还原、全部交互状态、完整响应式。

**常见错误**：不先拆结构就直接"复刻这张图"；每个元素各写一套颜色/间距/圆角；只还原静态图，漏掉 hover/focus 等关键状态。

### 11.2 模板构建红线 F01–F10

| 编号 | 规则 |
|------|------|
| F01 | 模板的**结构**只有一份，风格差异只体现在样式层。禁止为每种风格复制一份模板结构 |
| F02 | 模板内的颜色/间距/圆角/字号全部走 CSS 变量；风格切换 = 换变量集，不是换 class |
| F03 | 变量名与 §5 的命名空间一致；模板内自带的变量集必须由 `theme-generator.ts` 生成，**不得**手写变量清单 |
| F04 | 模板生成的主题变量集要写进 `base.css` 的 `[data-theme]` 机制（可作为新主题变体），保证与全局换肤一致 |
| F05 | 页面级内容块必须基于 `base-card` / `base-popup`；模板不得自带一套卡片实现 |
| F06 | mock 数据集中在 `mock.json` / `mock.ts`，模板内不得散落硬编码业务数据 |
| F07 | mock 数据字段名与真实接口契约对齐（可用假值，但结构必须是最终结构），避免接入时全量返工 |
| F08 | 模板必须可直接运行，且交互状态默认触发到底（弹层默认打开、tab 默认选中第一项） |
| F09 | PC React 模板与 uniapp 模板**分目录隔离**，不共享代码文件；跨端一致性通过**设计语言**保证，不通过代码复用保证 |
| F10 | 新增模板 → 同步 `SKILL.md` 页面类型清单、`README.md` 示例、`references/scenarios/` |

**四个必须确认的配置（均有默认值）**：① 技术栈（默认 `uniapp (Vue3)`；可选 uniapp Vue2 / React+Vite / Vue3+Vite / Taro(React) / Taro(Vue3) / 移动端 H5 / PC H5）；
② 页面类型（移动端：个人中心、商品详情、购物车、商品列表、分类、首页、聊天列表、订单列表、表单、设置、活动、搜索结果；
PC 端：登录、注册、数据大屏、管理后台首页、表格列表、表单填写、文章详情、门户首页、企业官网、文档页）；
③ 风格（每种页面 3–5 套：简约现代 / 活力炫彩 / 高端商务 / 清新自然 / 暗黑科技，默认简约现代）；
④ 是否生成 mock（默认是）。

**目录约定**：模板目录名统一 `kebab-case`，代表**页面类型**（`home` / `product` / `login` / `profile` / `list` / `detail` / `table-list` / `dashboard`）；
每套风格以样式文件区分（`style-1-default` / `style-2-…`），不复制模板结构；mock 数据独立成 `mock.json` / `mock.ts` 与视图分离；
PC React 模板在 `components/pc-react/`，uniapp 模板在 `components/uniapp-vue3/`。

**Mock 数据规范**：位置 `mock/{index.js, user.json, product.json, order.json, common.json}`；
格式兼容 JSON Server / Mock.js；字段命名符合业务语义；**每份 mock 必须包含四种状态**——正常态（5–20 条典型数据）、
空状态（空数组）、加载态（延迟响应）、错误态（模拟网络错误）；每个页面模板目录下另提供配套 `mock.json`。

**风格系统**：颜色与组件映射由 `references/theme-generator.ts` 的 `generateTokens` / `generateCSSVariables` 生成，
支持一键换肤与换尺寸；主题色阶生成命令见源仓库 `references/` 与 `scripts/`（本层不吸收脚本实现）。

---

## 未收录引用

源仓库 `MISSING_SKILLS.md` 登记的 4 个**私有仓库**技能，在 UniApp 技能群中被引用，本层不假装其存在：

| 私有技能 | 被引用处 | 说明 |
|----------|----------|------|
| `vue-admin-skill` | 本板块未直接引用（主要在 §7 的 `COMPONENT_SPEC.md` 与 Go/Java 后端技能中引用） | Vue3 + Element Plus 后台脚手架（**源仓库私有技能，未收录**） |
| `sse-agent-skill` | 未直接引用 | SSE 流式 AI 对话编排器（**源仓库私有技能，未收录**） |
| `universal-identity-bridge-skill` | 未直接引用 | 统一身份接入编排（**源仓库私有技能，未收录**） |
| `universal-login-bridge-skill` | 未直接引用 | 通用登录前端桥接（**源仓库私有技能，未收录**） |

> UniApp 板块正文中无对上述私有技能的实质引用；`uniapp-ui-replica` 提到的
> `frontend-ui-foundry` / `frontend-style-harmonizer-skill` / `ui-ux-pro-max` 均在本仓库其它板块，
> 见 `frontend/code-quality.md` 与 `frontend/assets-and-icons.md`。

## 与本项目规范的关系

本项目现有技术栈为 **React + qiankun**（见 `.trellis/spec/frontend/`），与 UniApp / 小程序**无技术栈交集**，
因此本层不给出与 `frontend/` 层的交叉注记；仅两处概念可对照：

- **请求信封与拦截器语义**：本层 §3 与 `frontend/shared-request-layer.md` 属同一族（uniapp 为其跨端适配），
  响应信封、错误码、鉴权拦截、去重、Mock、重试逻辑两端一致，差异仅在底层网络 API 与 Token 存储方式；
- **工程红线编号体系**：本层的 `R`/`D`/`B`/`C`/`P`/`Q`/`A`/`T`/`S`/`V`/`X`/`U`/`M`/`F` 系列前缀是
  wg-skills 内部的编号空间，**与 `.trellis/spec/frontend/` 层无编号关联**，引用时必须带前缀。
