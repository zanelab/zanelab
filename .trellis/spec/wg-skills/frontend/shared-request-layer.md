<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 前端统一请求层规范

> 合并转写自 wg-skills 的 1 个技能：`frontend-request-skill`（两层规范：通用前端 + uniapp 适配，
> 含 api-contract / auth-patterns / error-handling / frontend-spec / mock-guide / request-impl /
> sse-guide / uniapp-spec 等 references）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。
> 响应信封与错误码的**唯一定义处在 [../backend/conventions.md](../backend/conventions.md)**，
> 本文件写前端请求层如何消费/处理契约。

## 一、定位与两层规范

只聚焦**前端请求层设计**：从 `request.ts` 出发，建立统一、健壮、可维护的请求体系。

| 规范 | 适用场景 | 底层 API |
|------|----------|----------|
| 通用前端规范 | Web / H5 / React / Vue | `fetch` / `axios` |
| uniapp 适配规范 | 微信小程序 / App / H5 | `uni.request` / `uni.uploadFile` |

二者核心思想完全一致（统一入口、响应信封、鉴权拦截、错误码映射、Token 刷新队列、SSE、上传），仅底层网络 API 与 Token 存储方式不同。

解决的问题：页面各自调原生请求（鉴权/错误处理重复）、Token 过期无感知、重复点击重复请求、后端未 ready（Mock）、游客误触敏感接口、错误提示不统一、SSE 接入无封装、并发 401 全部失败（刷新队列 + 自动重试）。

## 二、前后端契约（强约定）

- 后端新生成业务 → 必须更新后端 `api-contract.md`；前端新加接口 → 必须读契约，按契约定义路径/字段/code；契约变更必须前后端同步。
- 错误码契约：`code < 0` 异常，`>= 0` 成功，**`-1` 特殊 = JWT 鉴权失效**。
- `showError` 参数语义：默认 `false` 请求层自动弹错误 Toast；`true` 时不弹，调用方自己处理（只用于轮询/静默重试/自定义提示场景）。
- **HTTP 500 兜底**：请求层强制 swallow 用户 Toast，交给全局错误处理。

## 三、核心文件结构（强约定）

所有前端项目（vue / uniapp / react）接口**统一存放在 `src/api/`**：

```
src/
├── api/                       # 前后端桥接层
│   ├── request.ts             # 统一请求封装（核心）
│   ├── upload.ts              # 文件上传封装
│   ├── sse.ts                 # SSE 流式请求封装
│   ├── modules/               # 业务模块 API（auth / user / role / menu / ...）
│   ├── _mocks_/               # Mock 数据字典（index.ts: MOCK_MAP + MockEntry；*.mock.ts）
│   └── types/                 # 接口请求/响应类型
├── services/
│   └── auth.service.ts        # 鉴权服务：login / logout / handleUnauthorized
└── config/                    # error.config.ts（ERROR_CODE_MAP，对齐 conventions.md）
```

禁止把接口散落到 `pages/api/`、`views/api/`、`service/`——跨项目无法复用、Mock 难统一。

## 四、统一入口（request.ts）

```typescript
export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD';
  data?: any;
  header?: Record<string, string>;
  timeout?: number;
  needAuth?: boolean;        // 是否需要 Token，默认 true
  showError?: boolean;       // 默认 false（自动弹）。true 时不弹，调用方自行处理
  skipDebounce?: boolean;    // 是否跳过防抖，默认 false
  skipAuthHandler?: boolean; // 是否跳过 401 处理，默认 false
  prefix?: string;           // API 前缀，默认 DEFAULT_PREFIX
  authMode?: 'bearer' | 'customer-token';
  retry?: number;            // 失败重试次数，默认 REQUEST_RETRY_COUNT
}

export interface RequestPromise<T> extends Promise<ApiResponse<T>> {
  __abort?: () => void;      // 可中断（页面 onUnload 时调用）
}

export interface ApiResponse<T = any> { code: number; message: string; data: T; }
```

配套入口：`upload<T>(options)` 文件上传、`sse<T>(options, onMessage)` SSE 流式。请求头规范：`Authorization` / `Content-Type` / `X-Request-ID`。

## 五、鉴权与 Token 刷新（auth-patterns）

- 请求层只识别 401/403，**统一交给 `auth.service.ts`**（`handleUnauthorized`），不在请求层写死鉴权跳转逻辑。
- 401 → `POST /auth/refresh { refreshToken }` → 重试队列中的请求；**`isRefreshing` + Promise 队列**，多个并发 401 只触发一次刷新；禁止先重试不刷新（死循环）。
- `skipAuthHandler: true` 跳过统一 401 处理；`authMode` 支持 bearer / customer-token 两种 Token 头格式。
- SSE 受保护接口可经 URL 参数 `?token=` 传递（SSE 不支持自定义 Header）。

## 六、防抖去重（request-impl）

- 用 Map 缓存同一 key 的 pending Promise 做去重；`skipDebounce: true` 跳过（上传、轮询等场景）。
- 请求 key 的生成：**递归排序 key 后再序列化**——直接 `JSON.stringify` 会因属性顺序不同导致 key 不同、去重失效。
- **文件上传单独封装 `upload<T>`，不走 request 防抖**（大文件/多次选择文件会被错误去重）。

## 七、错误处理（error-handling）

- 成功判定：`200 <= statusCode < 300`；`statusCode !== 200` 会误判 201/204。
- 业务错误按 `ERROR_CODE_MAP`（对齐 conventions.md 错误码表）统一提示；未列出的错误码按「系统繁忙」兜底。
- **HTTP 500 类错误请求层 swallow**，交给全局错误处理，不给用户弹「服务器繁忙」Toast。
- 业务异常不要用 `showError: true` 隐藏——用户不知道发生了什么。

## 八、Mock（mock-guide）

- Mock 仅由 `VITE_USE_MOCK` 控制，**生产环境必须为 `false`**——Mock 数据写进生产包会数据泄露、行为异常。
- Mock 字典在 `src/api/_mocks_/`（`MOCK_MAP` + `MockEntry`），按模块拆 `*.mock.ts`。

## 九、SSE 跨端（sse-guide）

- Web 端：EventSource / fetch stream。
- **小程序端无原生 EventSource**——使用 `enableChunked` + 手动解析 chunk。
- 返回可中断的 requestTask，页面 `onUnload` 时调用，防止内存泄漏与重复回调。

## 十、uniapp 适配要点（uniapp-spec）

底层 `uni.request` / `uni.uploadFile`；Token 存储用 `uni.setStorageSync`；其余逻辑（信封解析、错误码映射、刷新队列、去重、Mock、SSE 解析）与通用规范完全一致。详细规范见源仓库 `references/uniapp-spec.md`（473 行）。

## 十一、Common Mistakes（错误对照表）

| 错误 | 后果 | 正确做法 |
|------|------|---------|
| 请求层写死鉴权跳转 | 与 auth 重复、难维护 | 只识别 401/403，统一交 auth.service.ts |
| 每个 API 单独实现 401 重试/刷新 | 重复、并发多次登录 | 队列式刷新，收口 auth.service.ts |
| 并发请求未去重 | 重复提交 | Map 缓存 pending Promise |
| `JSON.stringify` 直接生成 key | 去重失效 | 递归排序 key 后序列化 |
| `statusCode !== 200` 判成功 | 201/204 误判 | `200 <= statusCode < 300` |
| Mock 写进生产包 | 泄露、异常 | 仅 `VITE_USE_MOCK` 控制，生产 false |
| 上传复用 request 防抖 | 大文件被错误去重 | 上传单独封装 |
| 小程序用 H5 EventSource | 直接报错 | `enableChunked` + 手动解析 |
| SSE 不处理中断/卸载 | 内存泄漏 | 返回可中断 task，onUnload 调用 |
| 401 不刷新 Token 直接重试 | 死循环 | 先刷新再重试队列 |
| 刷新不排队 | 并发多次登录 | `isRefreshing` + Promise 队列 |
| 接口散落多处 | 无法复用 | 统一 `src/api/` |
| 凭直觉写接口路径 | 联调失败 | 读/更新 api-contract.md |
| 500 弹「服务器繁忙」Toast | 无意义提示 | 请求层 swallow，交全局处理 |
| 业务异常 `showError: true` 隐藏 | 用户不知情 | 默认 false 自动弹 |
