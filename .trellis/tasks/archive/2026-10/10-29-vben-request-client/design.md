# 技术设计：axios 封装重构为 vben request-client 模式

> 依赖 [prd.md](./prd.md)（D1 完整对齐 vben、D2 共享通道传 RequestClient）与 [research/vben-request-client-notes.md](./research/vben-request-client-notes.md)。

## 1. 架构与边界

```
packages/utils/src/
├── http/                          # 新目录，替代现有单文件 http.ts
│   ├── index.ts                   # export * from './request-client' + preset-interceptors + types + 兼容导出
│   ├── request-client.ts          # RequestClient 类（vben 一比一 + 适配点）
│   ├── types.ts                   # RequestClientConfig/Options/Response/ContentType、SseRequestOptions、拦截器配置类型
│   ├── preset-interceptors.ts     # defaultResponseInterceptor / authenticateResponseInterceptor / errorMessageResponseInterceptor
│   ├── helpers.ts                 # bindMethods / merge / isString / isUndefined / isFunction（@vben/utils 等价小实现）
│   └── modules/
│       ├── interceptor.ts         # InterceptorManager
│       ├── uploader.ts            # FileUploader
│       ├── downloader.ts          # FileDownloader
│       └── sse.ts                 # SSE
└── http.ts                        # 兼容层（见 §4 迁移策略）
```

- `packages/utils/src/index.ts` 的 `export * from './http'` 不变（指向新目录的 index）。
- 包外消费者（portal-web、iam-web）从 `@zanelab/utils` 或本地 `utils/http` 导入，路径与现在一致，减少 churn。

## 2. 关键契约

### 2.1 RequestClient（与 vben 对齐）

- `readonly instance: AxiosInstance`；公开 `isRefreshing` / `refreshTokenQueue`（认证拦截器单飞状态挂实例上）。
- 方法：`get/post/put/delete/request<T>` 返回 `Promise<T>`（`request` 内 `throw error.response ? error.response.data : error`）。
- 构造合并默认配置：`Content-Type: application/json;charset=utf-8`、`responseReturn: 'raw'`、`timeout: 10_000`（vben 默认；portal 组装层覆盖为 60_000 以保持现状）。
- 代理成员：`addRequestInterceptor` / `addResponseInterceptor` / `upload` / `download` / `postSSE` / `requestSSE` / `getBaseUrl`。

### 2.2 预置拦截器（适配后签名）

```ts
defaultResponseInterceptor({ codeField='code', dataField='data', successCode=0 })
// 适配：非 envelope 守卫 —— responseData 非 object 或不含 codeField 时，
// responseReturn==='data' 亦按 'body' 语义返回 responseData（保持现行 createHttpClient 行为，防回归）。

authenticateResponseInterceptor({
  client, doReAuthenticate, doRefreshToken, enableRefreshToken,
  formatToken,
  tokenHeaderName?,   // ★ 新增：token 头名。设置后重试写 config.headers[tokenHeaderName] = formatToken(newToken)
})                    //   不设置时保持 vben 默认写 Authorization。

errorMessageResponseInterceptor(makeErrorMessage?)
// 适配：内部不再 import $t。构造参数不变，但错误文案由调用方在 makeErrorMessage 里生成？
// 否——保持 vben 形态：新增可选参数 resolveStatusMessage?: (status: number | undefined) => string
//   网络错误/超时同理：resolveNetworkMessage?: (kind: 'network' | 'timeout') => string
//   未提供时回落英文文案（简单映射表），portal 侧注入 i18n.t。
```

> 设计取向：优先**参数注入**而非让预置拦截器感知 i18n/notify，保持 packages/utils 与 UI 解耦（现行 createHttpClient 也是回调式）。

### 2.3 envelope 与错误语义（portal 行为保持）

现行 `createHttpClient` 的响应语义必须等价保留，映射到新链路：

| 现行行为 | 新链路落点 |
| --- | --- |
| 非 2xx 或 successCode 不符 → reject `BizCodeError{bizCode}` | defaultResponseInterceptor 的 throw（携带 response）→ portal 自定义 rejected 拦截器把 error 转成 `BizCodeError`（附 `.response`）后 reject |
| envelope 命中 reLogin 码 / msg 正则 → onSessionExpired | portal 自定义 rejected 拦截器（插在解包之后、认证之前）调用既有 isSessionExpired/onSessionExpired 逻辑 |
| HTTP 401 → 刷新单飞 | authenticateResponseInterceptor（tokenHeaderName=TOKEN_HEADER） |
| 403/5xx → notify | errorMessageResponseInterceptor（makeErrorMessage 里 notify.error(i18n)） |
| `window.__http` Proxy 挡 interceptors | Proxy 额外挡 `instance`（D2 后通道对象是 RequestClient，防止子应用绕过只读约束） |

### 2.4 portal 组装（apps/portal-web/src/utils/http.ts 重写）

```ts
function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({ baseURL, withCredentials: true, timeout: 60_000, ...options });

  // 请求拦截器：raw token 注入 TOKEN_HEADER、legacy headers、Accept-Language（复用现行函数）
  client.addRequestInterceptor({ fulfilled: ... });

  // 响应链（顺序即语义）：
  client.addResponseInterceptor(defaultResponseInterceptor({ successCode: isSuccessCode, dataField: 'data' }));
  client.addResponseInterceptor(portalBizInterceptor);          // BizCodeError 转换 + reLogin/onSessionExpired + biz 码 i18n 映射
  client.addResponseInterceptor(authenticateResponseInterceptor({
    client, doReAuthenticate: handleLogout, doRefreshToken: refreshToken,
    enableRefreshToken: true, formatToken: (t) => t, tokenHeaderName: TOKEN_HEADER,
  }));
  client.addResponseInterceptor(errorMessageResponseInterceptor({
    resolveStatusMessage, makeErrorMessage: (msg) => notify.error(msg),
  }));
  return client;
}

export const requestClient = createRequestClient(appConfig.api.baseURL, { responseReturn: 'data' });
export const baseRequestClient = createRequestClient(appConfig.api.baseURL); // raw
```

- `refreshToken` 仍走原生 fetch（Out of Scope）；其内部 `isSuccessCode` 复用。
- `isSessionExpiredError` / `BizCodeError` 导出位置与语义不变（`micro/register.ts:74` 不改）。

### 2.5 微前端通道（D2）

- portal：`exposeAsGlobal` 逻辑改为把 **RequestClient** 实例挂 `window.__http`（Proxy 挡 `interceptors` + `instance`）。
- `PltProps.http`（iam-web `main.tsx:71`）：从 `{ post; [key:string]: unknown }` 改为结构化 RequestClient 子集类型（`get/post/put/delete/upload/download` 签名 + `[key:string]: unknown` 保留扩展）。共享类型建议放 `@zanelab/types`（若已有通道类型文件）或 iam-web 本地 types，避免 iam-web 依赖 packages/utils 全量。
- iam-web `utils/http.ts`：集成态把 `props.http` 断言为共享 RequestClient 子集直接透传；独立态用 `new RequestClient({...})` + 最小拦截器（语言头 + 解包 + 401 跳 `/login`）。业务层 `post`/`onLoginSuccess` 签名不变。

## 3. 数据流（成功 / 各失败分支）

```
业务调用 requestClient.get<T>('/x')
  → RequestClient.request → instance(config)（请求拦截器已注 token/legacy/语言）
  → defaultResponseInterceptor.fulfilled
      ├─ responseReturn raw → 原样 AxiosResponse
      ├─ 'body' 或非 envelope → responseData
      └─ 'data' + successCode ✓ → responseData[dataField]  ← Promise<T> 强类型达成（R5）
  → portalBizInterceptor.fulfilled（envelope 成功时已是 data，透传）
  → resolve T

失败：defaultResponseInterceptor throw {response} → portalBizInterceptor.rejected
  ├─ reLogin 码/正则命中 → onSessionExpired() → reject BizCodeError
  ├─ 其它 envelope code → biz 码 i18n 映射 → notify.error → reject BizCodeError
  └─ HTTP 层错误（axios rejected 入口）→ authenticate（401 单飞重放/兜底 doReAuthenticate）
       → errorMessage（403/5xx/网络/超时 → notify）→ reject
```

## 4. 兼容与迁移策略

1. **渐进替换而非双轨长存**：`packages/utils/src/http.ts` 重写为兼容层——从 `./http` 目录 re-export 新符号；`createHttpClient` 保留但内部改为基于新原语的薄封装（或标记 `@deprecated` 直接返回新组装），迁移完成后（portal/iam-web 均切换）再删除。删除动作在实现阶段末尾执行，若检查发现仍有消费方则回退为保留 + deprecated。
2. **api 层强类型化**：`http.post(...)` 返回 `Promise<T>` 后，`api/auth.ts` 的局部 `post<T>` 包装直接瘦身（`http.post<T>(url, body)`），删除 `as unknown as`。
3. **测试迁移**：
   - `http.integration.test.tsx` / `http.401.test.tsx` 改 import `requestClient`（断言与 MSW 契约不变，行为回归即失败）。
   - 新增 `packages/utils/src/http/request-client.test.ts`（解包三态、成功码函数、非 envelope 守卫）与 preset-interceptors 单测（401 单飞重放、tokenHeaderName 重写、错误文案注入）——参考移植 vben 同名测试。
4. **回滚点**：整任务单分支提交序列；出问题时 revert 到 `c876f74` 后的 `packages/utils/src/http.ts` 单文件即可恢复（旧行为完全自洽于该文件 + portal 消费端旧版）。

## 5. 权衡记录

- **不引 @vben/utils**：三个小函数（bindMethods/merge/inference）自带实现约 40 行，避免引入整包依赖链；与 vben 行为对齐以移植其单测为准。
- **Portal 自定义 rejected 拦截器而非改 defaultResponseInterceptor 语义**：reLogin 码/msg 正则是 portal 私有策略，放 packages/utils 会污染共享层；vben 的 `codeField/successCode/dataField` 已足够参数化解包。
- **Proxy 挡 `instance`**：比现行只挡 interceptors 更严格（instance.interceptors 可达）。子应用合法需求（读 baseURL、发请求）走 RequestClient 公开方法，不受影响。
- **保留 fetch 刷新**：authenticate 拦截器只要求 `doRefreshToken(): Promise<string>`，实现无关——现行为零风险保留，符合 Out of Scope。

## 6. 风险

| 风险 | 缓解 |
| --- | --- |
| 非 envelope 守卫遗漏 → 原生返回（如 blob/字符串 body）被误判业务码失败 | 单测覆盖：JSON、blob、纯文本、无 code 对象四种 body；对照现行 createHttpClient 行为断言等价 |
| 401 重放时 token 头重写用错头名 | authenticate 的 tokenHeaderName 单测 + http.401.test.tsx 回归（断言重放请求头为 TOKEN_HEADER） |
| RequestClient 挂 window 后子应用拿到 instance 绕过只读 | Proxy 挡 instance；microfrontend-guidelines 复查 + iam-web 透传只用公开方法 |
| qs 新依赖引入 tree-shaking/体积噪声 | 仅 packages/utils 依赖；portal/iam-web 不直接 import（AC 约束） |
