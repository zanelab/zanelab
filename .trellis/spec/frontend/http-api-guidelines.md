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
