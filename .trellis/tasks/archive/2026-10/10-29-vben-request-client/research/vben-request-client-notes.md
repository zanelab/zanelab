# vben request-client 机制研究笔记

> 源：`/Users/zane/Downloads/vue-vben-admin-5.7.0/packages/effects/request/src/`、`playground/src/api/request.ts`。供 implement/check 子代理快速对齐。

## 分层结构

```
request-client/
├── request-client.ts        # RequestClient 类：包装 AxiosInstance，暴露 get/post/put/delete/request（Promise<T>），
│                            #   公开字段：instance(readonly AxiosInstance)、isRefreshing、refreshTokenQueue，
│                            #   方法代理自模块：addRequestInterceptor/addResponseInterceptor/upload/download/postSSE/requestSSE/getBaseUrl
├── types.ts                 # ExtendOptions: paramsSerializer('brackets'|'comma'|'indices'|'repeat'|fn) + responseReturn('raw'|'body'|'data')
│                            #   RequestClientConfig = AxiosRequestConfig & ExtendOptions；RequestClientOptions = CreateAxiosDefaults & ExtendOptions
├── preset-interceptors.ts   # 三个预置拦截器工厂（见下）
├── index.ts                 # export * from preset-interceptors + request-client + type * types
└── modules/
    ├── interceptor.ts       # InterceptorManager：addRequestInterceptor({fulfilled,rejected}) / addResponseInterceptor({...}) 对象式注册
    ├── uploader.ts          # FileUploader.upload(url, data&{file:Blob|File}, config)：组 FormData + multipart 头 → client.post
    ├── downloader.ts        # FileDownloader.download(url, config)：默认 responseReturn:'body' + responseType:'blob'，GET/POST/PUT 分发
    └── sse.ts               # SSE.requestSSE：手动重放 client.instance.interceptors.request 的 fulfilled 链拿 headers → fetch 流式读
```

## 关键机制

1. **解包拦截器 `defaultResponseInterceptor({ codeField='code', dataField='data', successCode=0 })`**
   - `config.responseReturn === 'raw'` → 原样返回 response；`status 2xx-3xx` 且 `'body'` → 返回 body；`'data'` → 校验 `successCode`（支持函数形式）后返回 `dataField`（支持函数）。
   - 失败：`throw Object.assign({}, response, { response })` —— 下游 rejected 拿到的 error 有 `.response` 可查 `data.code`。
2. **认证拦截器 `authenticateResponseInterceptor({ client, doReAuthenticate, doRefreshToken, enableRefreshToken, formatToken })`**
   - 仅处理 `response.status === 401`；`client.isRefreshing`/`client.refreshTokenQueue` 挂在 RequestClient 实例上实现单飞；重放用 `client.request(config.url, {...config})`。
   - ⚠️ 原版硬编码 `config.headers.Authorization = formatToken(newToken)`——本项目 portal 用自定义 `TOKEN_HEADER`（raw token），**移植时必须把写入头抽象化**（如传 `tokenHeaderName` 或 `setTokenHeader(config, token)` 回调）。
3. **错误消息拦截器 `errorMessageResponseInterceptor(makeErrorMessage)`**：axios.isCancel 放行；Network Error/timeout/400/401/403/404/408/default 用 `$t('ui.fallback.http.*')` 生成消息后回调 makeErrorMessage。移植时把 `$t` 换成可注入的消息解析器（本项目无 @vben/locales）。
4. **消费方组装模式**（playground/src/api/request.ts）：`createRequestClient(baseURL, options)` 内 new RequestClient → 注册请求拦截器（token/Accept-Language）→ 依次 addResponseInterceptor（解包 → 认证 → 错误提示）→ 导出 `requestClient`（responseReturn:'data'）+ `baseRequestClient`（raw，裸 AxiosResponse，供 refresh 等场景）。
5. **辅助函数**（来自 `packages/@core/base/shared/src/utils/`）：`bindMethods`（原型方法批量 bind，util.ts:1）、`merge`（merge.ts）、`isString/isUndefined/isFunction`（inference.ts）——需在 packages/utils 内自带等价小实现，不引 @vben/utils。

## 本仓库适配点（与 vben 的差异）

| 差异 | 决策 |
| --- | --- |
| 无 @vben/locales `$t` | errorMessage 拦截器改为注入式 `resolveErrorMessage(status, error)`，portal 侧用 i18n.t + notify |
| portal 认证头是自定义 `TOKEN_HEADER`（raw，无 Bearer） | authenticate 拦截器参数化 token 头写入（见上 ⚠️） |
| portal 成功码 `[0,'0',10000]` + reLogin 码 `213004/40100/213005`（envelope 与 HTTP 分支都有）+ msg 正则 | successCode 用函数形式；session-expired / biz-code 映射做成 portal 侧自定义 rejected 拦截器，插在解包之后 |
| 旧 createHttpClient 对**非 envelope body**（无 code 字段）原样放行 response | 移植的 defaultResponseInterceptor 加兼容守卫：body 非对象或无 codeField → 返回 body（避免 vben 原版直接 throw 导致回归） |
| `window.__http` Proxy 原本只挡 `interceptors` | RequestClient 新增公开 `instance` 字段 → Proxy 必须同时挡 `interceptors` 与 `instance` |
| refresh 走原生 fetch（保持不动） | 可保留 fetch；或后续换 baseRequestClient（本任务不改） |
| 旧导出 `BizCodeError` + `isSessionExpiredError`（register.ts:74 消费） | 保留：portal 的 session-expired rejected 拦截器以 BizCodeError（附 .response）reject，isSessionExpiredError 语义不变 |

## 现状文件锚点

- `packages/utils/src/http.ts`：现行工厂（createHttpClient + BizCodeError + isSessionExpiredError），唯一 axios 依赖包（^1.20.0，无 qs）。
- `apps/portal-web/src/utils/http.ts`：业务策略 + 组装 + `exposeAsGlobal:'__http'`；`api/auth.ts`、`api/menu.ts` 消费（带 `as unknown as` 强转）；`micro/register.ts:74` 用 isSessionExpiredError。
- `apps/iam-web/src/utils/http.ts`：集成态透传 props.http / 独立态 createHttpClient 兜底；`main.tsx:71` PltProps.http 仅声明 post。
- 测试：`apps/portal-web/src/utils/http.integration.test.tsx`（解包+notify+MSW 契约）、`http.401.test.tsx`（并发 401 单飞刷新重放）。vben 自带 request-client.test.ts 等可参考移植。
- 本仓库无上传/下载/SSE/paramsSerializer 使用场景（用户已决策仍完整移植）。
