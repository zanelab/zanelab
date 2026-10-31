# axios 封装重构为 vben request-client 模式

## Goal

将本项目 axios 封装从「单一巨型工厂函数（`createHttpClient`）」重构为 vue-vben-admin 5.7.0 的 request-client 架构（RequestClient 类 + 模块化拦截器管理 + 预置拦截器工厂 + 消费方组装模式），行为不回退，并让业务层拿到强类型 `Promise<T>`。

- 参考实现：`/Users/zane/Downloads/vue-vben-admin-5.7.0/packages/effects/request/src/`（详见 [research/vben-request-client-notes.md](./research/vben-request-client-notes.md)）
- 参考消费方式：`/Users/zane/Downloads/vue-vben-admin-5.7.0/playground/src/api/request.ts`

## Background（仓库证据）

- 共享封装在 `packages/utils/src/http.ts`：`createHttpClient(options): AxiosInstance` 单函数完成 token 注入（Bearer/raw）、额外 headers、Accept-Language、envelope 解包、业务错误回调、登录态失效、401 单飞刷新队列、`window.__http` 只读代理。消费方 `apps/portal-web/src/utils/http.ts` 传入 portal 业务策略（SUCCESS_CODES `[0,'0',10000]`、reLogin 码 `213004/40100/213005`、msg 正则、i18n + notify、`exposeAsGlobal:'__http'`）。
- `apps/portal-web/src/api/auth.ts:11-15` 因 axios 类型与运行时解包不符，被迫 `as unknown as Promise<T>` 强转——vben 的 `responseReturn` 三态 + 强类型方法是其正解。
- 微前端通道：宿主 `exposeAsGlobal:'__http'`（Proxy 挡 interceptors）→ `micro/register.ts:158` 把 `window.__http` 传子应用 props.http；`apps/iam-web/src/utils/http.ts` 集成态透传、独立态自建。
- spec `.trellis/spec/frontend/http-api-guidelines.md` 约束统一实例、notify 模式、401 单飞、只读共享、api 层用 `appConfig.api.<endpoint>`；重构后需同步改写。
- 现有测试：`http.integration.test.tsx`（解包/notify/MSW 契约）、`http.401.test.tsx`（并发 401 单飞重放）。
- 本仓库无上传/下载/SSE/paramsSerializer 使用场景（详见 prd 之 Out of Scope 的说明与用户决策）。

## Key Decisions（用户已确认）

- D1（范围）：**完整对齐 vben**——除 RequestClient 类、InterceptorManager、三个预置拦截器外，一并移植 FileUploader、FileDownloader、SSE 模块与 qs paramsSerializer（brackets/comma/indices/repeat），即使当前无使用场景。vben 的 `@vben/utils` 辅助（bindMethods/merge/isString/isUndefined/isFunction）在 packages/utils 内自带等价小实现。
- D2（微前端通道）：**共享通道传 RequestClient 实例**——`window.__http` / `props.http` 改为 RequestClient，子应用直接享受 responseReturn 与强类型方法；同步更新 PltProps 契约与 iam-web 兼容层。

## Requirements

- R1: 在 `packages/utils` 中按 vben 结构实现 `RequestClient` 类、`InterceptorManager`、`defaultResponseInterceptor`、`authenticateResponseInterceptor`、`errorMessageResponseInterceptor`、`FileUploader`、`FileDownloader`、`SSE`，types 与 vben 对齐（`RequestClientConfig`/`RequestClientOptions`/`responseReturn`/`paramsSerializer`），并补 `qs` 依赖与辅助函数。
- R2: vben 移植时的必要适配（详见 research 笔记「本仓库适配点」表）：
  - 认证拦截器的 token 重写必须参数化（portal 用自定义 `TOKEN_HEADER` raw token，vben 原版硬编码 Authorization）；
  - `errorMessageResponseInterceptor` 的 `$t` 改为注入式消息解析；
  - `defaultResponseInterceptor` 增加非 envelope body 兼容守卫（无 code 字段按 vben 'body' 语义放行，保持现有行为不回退）；
  - `window.__http` Proxy 需同时挡 `interceptors` 与 `instance`。
- R3: portal-web 消费方改为 vben 组装模式（`createRequestClient` + 链式注册拦截器），导出 `requestClient`（responseReturn:'data'）与 `baseRequestClient`（raw）；保留现有 portal 业务策略（biz 码表、reLogin 判定、notify、handleLogout、refreshToken、legacy headers）。
- R4: iam-web 兼容层与 micro 通道随 D2 更新：`PltProps.http` 契约改为 RequestClient 形态，iam-web 独立态用新封装自建，业务层 `post`/`onLoginSuccess` 接口不变。
- R5: 请求函数强类型化：`api/auth.ts`、`api/menu.ts` 消除 `as unknown as` 强转，直接得到 `Promise<T>`。
- R6: 测试迁移/新增：现有 http 集成与 401 单飞测试保持通过（或等价迁移）；为 RequestClient 核心（解包三态、认证重试、错误消息）与 uploader/downloader/SSE 增加单元测试（可参考移植 vben 自带测试）。
- R7: 更新 `.trellis/spec/frontend/http-api-guidelines.md` 以反映新架构（组装模式、responseReturn、预置拦截器清单）。

## Acceptance Criteria

- [ ] AC1: `packages/utils` 导出 `RequestClient`、`InterceptorManager`、`defaultResponseInterceptor`、`authenticateResponseInterceptor`、`errorMessageResponseInterceptor`、`FileUploader`、`FileDownloader`、`SSE` 及 vben 对齐类型；`pnpm --filter @zanelab/utils test` 通过。
- [ ] AC2: portal-web `utils/http.ts` 呈现 vben 组装模式（new RequestClient → 请求拦截器 → 解包 → 认证 → 错误提示），并导出 `requestClient` / `baseRequestClient`；`api/auth.ts`、`api/menu.ts` 无 `as unknown as` 强转且类型正确。
- [ ] AC3: 行为不回退——`http.integration.test.tsx` 与 `http.401.test.tsx`（或等价迁移后）全部通过：envelope 解包、biz 码 i18n 提示、服务器错误提示、并发 401 只刷新一次并以新 token 重放。
- [ ] AC4: 微前端通道不破坏——`window.__http` 为 RequestClient 且 Proxy 挡住 `interceptors` 与 `instance` 写入路径；iam-web 集成态透传工作、独立态自建工作；`PltProps.http` 类型与新通道一致。
- [ ] AC5: `pnpm -w build`（或各包 tsc/vite build）通过，无新增类型错误。
- 依赖 qs 的新增仅用于 paramsSerializer；不在业务代码中直接 import qs。

## Out of Scope

- 后端接口契约、token 刷新端点行为（fetch 实现）不变。
- 不引入 vben 的 locales/$t 体系（本项目 i18n.ts + notify 不动）。
- 不新增上传/下载/SSE/数组参数的业务用法（模块仅作为能力移植，无调用方）。
- iam-web OTP 登录流程本身不变（仅其 http 依赖层更新）。

## Open Questions

（无——两项关键决策已由用户确认：D1 完整对齐 vben、D2 共享通道传 RequestClient。）
