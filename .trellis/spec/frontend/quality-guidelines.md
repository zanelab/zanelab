# 质量规范

> 质量要求来自 §11（安全）、§13（监控）、§14（测试）。纯函数优先测逻辑，组件测权限语义，流程走集成测试。

## 单元测试（vitest + React Testing Library，§14）

优先覆盖**纯函数**，它们是本项目核心逻辑且无 DOM 依赖：

- `loadConfig`（`apps/portal-web/src/config/index.ts`）——含配置合并 + zod 校验失败回退的边界。
- `flattenPermissions`（`apps/portal-web/src/stores/menu-store.ts` 内）——递归提取权限码。
- `generateRoutes`（`apps/portal-web/src/router/generateRoutes.tsx`）——菜单 → 路由表（本地页 / 子应用容器 / 兜底路由 / 重定向）。

关键组件重点测权限语义：

- `Permission`——`hide` 无权限渲染 fallback、`disabled` 无权限给子元素设 `disabled`（`btn` 元素按 daisyUI 禁用语义）、空 permission 放行。
- `RouteGuard`——无 token 跳登录、无权限跳 403、放行 children。

## 集成测试（MSW，§14）

用 Mock Service Worker 模拟后端，覆盖业务链路：

- 登录 → 拉菜单 → 动态路由 + `setupMicroApps` 注册 → 菜单渲染。
- 401 单飞刷新：并发请求只触发一次 `/refresh`，排队请求用新 token 重放。
- 登出清状态、`global-logout` 事件跳转。
- 错误提示：接口 `code !== 0` / 403 / 5xx 时 `notify.error` 被调用，ToastRegion 渲染 `alert alert-error`（daisyUI）。

## E2E 与微前端（§14）

- E2E（Cypress / Playwright）：登录 → 菜单展示 → 子应用加载 → 页面跳转。
- 微前端：子应用**独立运行**与**qiankun 环境**下的挂载/卸载都要测，确认生命周期与容器复用正确。

## 安全红线（§11）

- 后端必须对每个 API 做权限校验；前端按钮/页面控制只是体验优化，不能替代。
- 默认不用 `dangerouslySetInnerHTML`；确需时先净化内容（XSS 防护）。
- 不在日志/上报里带 token、refreshToken 等敏感信息；令牌存 localStorage 有 XSS 面，配合 CSP 与输入过滤（§11）。
- 子应用不得绕过沙箱访问主应用全局变量（约定的共享对象 `__http`/props 除外）。

## 性能约定（§12）

- 预加载跟随菜单层级与用户行为，避免加载用户看不到的子应用。
- `store.subscribe` 推送全局状态按需进行，避免子应用无谓重渲染。
- 大型菜单可先加载一级、展开再取子级（按需实现）。

## 监控（§13）

- JS 异常、接口错误、qiankun 运行时错误进错误上报（Sentry 可选）。
- 埋点：首屏、路由切换、子应用加载耗时。
- `addGlobalUncaughtErrorHandler`（§4.4）里 `console.error` 后应接上报，不只打日志。

## 代码评审清单

- **有没有 apps 下的应用相互引用**（import 另一 app 的源码，或 package.json 依赖另一 app 的包名）？跨 app 共享必须下沉 `packages/*`。
- **子应用改动是否保持独立运行性**（`pnpm dev:<appName>` 单独跑仍通）：props 消费是否收敛在 `src/http/compat.ts`、业务层无 props 判空分支、样式/mock 自持？
- JSX 是否只用 daisyUI 类名 + Tailwind 工具类、颜色用语义色（无自定义 CSS / 无 `dark:` / 无 antd 或第三方 UI 库）？
- 请求是否走统一 http 实例、路径是否来自 `appConfig.api.*`、错误处理是否走拦截器？
- 权限（页面/按钮）是否读 `state.menu.permissions`，而不是本地硬编码？
- 新增子应用相关逻辑是否改在 `config.js microApps` + 菜单 `appName`，有没有第二处注册配置？
- 有没有 `any` 从边界传导进业务层？配置类型是否 zod 推导、单处定义？
- 全局事件 / qiankun 状态监听有没有在 effect cleanup 里移除？
- 有没有碰 `dangerouslySetInnerHTML`、明文密钥、把 token 打进日志？

## 禁用模式（汇总）

- **apps 下的应用相互 import 或互相依赖**（见 [目录结构](./directory-structure.md) import 与包边界约定）。
- 业务代码自建 Axios 实例或重复拦截器。
- 硬编码接口路径 / 登录页路径 / 子应用 entry。
- 双份维护配置类型（手写 interface + zod）。
- 在组件里私自再触发 `registerMicroApps` / `setupMicroApps`。
- 引入 antd 或另一套 UI 库——本仓库 UI 只允许 daisyUI + Tailwind。
- 子应用业务层裸用 `props.http` / 散落 props 判空分支——独立运行即抛错（props 消费收敛在 `src/http/compat.ts`）。
