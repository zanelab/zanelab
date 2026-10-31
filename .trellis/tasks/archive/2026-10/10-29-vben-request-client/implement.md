# 执行计划：axios 封装重构为 vben request-client 模式

> 前置阅读顺序：`research/vben-request-client-notes.md` → `prd.md` → `design.md` → 本文件。
> 参考源码根：`/Users/zane/Downloads/vue-vben-admin-5.7.0/packages/effects/request/src/`

## 阶段 A：packages/utils 新原语（design §1、§2）

- [x] A1 建 `packages/utils/src/http/` 目录：`types.ts`（vben types.ts 一比一）、`helpers.ts`（bindMethods/merge/isString/isUndefined/isFunction，参考 vben `@core/base/shared/src/utils/`）
- [x] A2 `modules/interceptor.ts`：InterceptorManager（vben 一比一）
- [x] A3 `modules/uploader.ts` / `downloader.ts` / `sse.ts`：vben 一比一移植（isUndefined 用本地 helpers）
- [x] A4 `preset-interceptors.ts`：三个拦截器 + design §2.2 适配（tokenHeaderName 参数化、错误文案注入 resolveStatusMessage/resolveNetworkMessage、非 envelope 守卫放 defaultResponseInterceptor）
- [x] A5 `request-client.ts`：RequestClient 类（vben 一比一 + getParamsSerializer）
- [x] A6 `http/index.ts` 汇出；`packages/utils/src/http.ts` 改为 re-export 兼容层（保留 createHttpClient/BizCodeError/isSessionExpiredError 现有语义，见 design §4.1）
- [x] A7 `packages/utils/package.json` 增 `qs` 依赖（+ `@types/qs` devDep）
- [x] A8 新增 `packages/utils/src/http/request-client.test.ts` + `preset-interceptors.test.ts`（解包三态/非 envelope 守卫/401 单飞/tokenHeaderName 重写/文案注入；参考 vben 同名测试）
- [x] A9 验证：`pnpm --filter @zanelab/utils test && pnpm --filter @zanelab/utils build`（若 utils 无 build 脚本则 tsc -p）

## 阶段 B：portal-web 切换（design §2.3、§2.4）

- [x] B1 重写 `apps/portal-web/src/utils/http.ts` 为组装模式：createRequestClient + 拦截器链（顺序：解包 → portalBiz → authenticate → errorMessage），导出 `requestClient` / `baseRequestClient`；保留 SUCCESS_CODES/reLogin/bizErrorKeys/notify/handleLogout/refreshToken(fetch)/legacy headers 策略
- [x] B2 `window.__http` 改挂 RequestClient 实例，Proxy 挡 `interceptors` + `instance`（design §2.3 表末行）
- [x] B3 `api/auth.ts` / `api/menu.ts`：删 `as unknown as` 强转，直接用 `requestClient.get<T>/post<T>`（保留 logout 显式 TOKEN_HEADER 的特例逻辑）
- [x] B4 迁移测试：`http.integration.test.tsx` / `http.401.test.tsx` 改 import（断言不变）；如断言暴露行为差异，回查 A4 守卫
- [x] B5 验证：`pnpm --filter portal-web test`

## 阶段 C：微前端通道 + iam-web（design §2.5）

- [x] C1 共享通道类型：定义 RequestClient 子集接口（建议 `@zanelab/types`；若无合适落点则 iam-web 本地定义并注明），更新 iam-web `main.tsx` PltProps.http
- [x] C2 重写 `apps/iam-web/src/utils/http.ts`：集成态透传 props.http（结构化类型）、独立态 new RequestClient + 最小拦截器；业务层 `post`/`onLoginSuccess` 签名不变
- [x] C3 iam-web 页面/OTP 流回归：`pnpm --filter iam-web test`（如有）+ 手动 `pnpm --filter iam-web dev` 独立态登录冒烟
- [x] C4 portal 集成态冒烟：portal-web dev 起来后 iam-web 挂载内请求走宿主 requestClient（mock 环境）

## 阶段 D：清理 + 收尾

- [x] D1 删除兼容层残留：确认无消费方后删 `createHttpClient` 及旧实现体（grep `createHttpClient` 全仓）；若仍有消费方则保留 + `@deprecated` 并在任务 journal 记录
- [x] D2 全仓验证：`pnpm -w build`、各包 test；`git diff` 复查无意外文件
- [x] D3 更新 `.trellis/spec/frontend/http-api-guidelines.md`（组装模式、responseReturn 三态、预置拦截器清单、Proxy 双挡、api 层强类型）
- [ ] D4 检查 trellis-check 通过后提交（Phase 3.4），commit message 按仓库惯例 `refactor(@zanelab/utils): ...`

## 验证命令汇总

```bash
pnpm --filter @zanelab/utils test
pnpm --filter portal-web test
pnpm --filter iam-web test   # 若无测试脚本则跳过并在 journal 记录
pnpm -w build
grep -rn "createHttpClient" apps packages --include="*.ts" --include="*.tsx" | grep -v node_modules   # D1 应为空
grep -rn "as unknown as" apps/portal-web/src/api    # B3 应为空
grep -rn "from 'qs'" apps                            # D2 应为空（qs 仅 packages/utils 内部使用）
```

## 风险文件 / 回滚点

- 高风险：`packages/utils/src/http.ts`（唯一 axios 共享源）、`apps/portal-web/src/utils/http.ts`（业务策略密集）。
- 回滚：任务整体在一个分支的提交序列上；`git revert` 至 `c876f74` 后版本即可恢复单文件工厂形态（design §4.4）。
- 每阶段末尾跑对应验证命令后再进下一阶段；A 阶段结束是第一个稳定回滚点。

## task.py start 前检查

- [x] prd.md 收敛（无开放问题）
- [x] design.md / implement.md 就绪
- [ ] implement.jsonl / check.jsonl 含真实条目（下一步由主会话填写）
