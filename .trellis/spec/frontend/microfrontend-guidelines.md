# 微前端与子应用

> zaneLab 是 qiankun 主应用基座（`apps/portal-web`）。**菜单驱动注册**是本节核心不变式。monorepo 布局下 iam 子应用是 workspace 成员：位于 `apps/iam-web/`（package 名 `@zanelab/iam-web`，独立构建、独立端口 :8081），依赖由根 lockfile 统一管理；后续接入的新子应用同样放 `apps/<appName>/` 并入 workspace，接入契约不变。

## 角色分工（§1.1、§4.1）

- 菜单数据只含业务信息（路由/权限/图标），不含部署细节；子应用注册信息只含技术部署细节（entry/container…）。两者用 `appName` 关联。
- 主应用**按需注册**：只注册当前菜单里实际出现、且用户有权访问的 `appName`，避免加载无权子应用，也不在多处重复维护注册配置。

## 注册信息唯一来源：config.js

子应用注册信息只存在于 `apps/portal-web/public/config.js` 的 `microApps`（键 = `appName`）：

```js
microApps: {
  iam: {
    name: 'iam',
    entry: '//localhost:8081',
    container: '#subapp-container',
    activeRule: '/system',      // 通常与菜单路径前缀一致
    props: {},                  // 静态 props，注册时与动态 props 合并
    prefetch: true,             // 是否预加载
  },
}
```

字段语义见 §4.2。注册前会拼入动态 props：`token`、`permissions`、`http`（共享实例）、`config`（appConfig）、`basename`（默认 `activeRule` 或 `/${name}`）——见 §4.4。

> **Warning**：config.js 里还保留着两个**外部约定的历史注册名**：`npa-plt-system`（旧 plt 系统，真实后端菜单数据按此 `appName` 下发）与 `pa_new`（`apps/iam-web/vite.config.ts` 的 `qiankun('pa_new')` 注册名，legacy 后端契约）。目录/包名改名（plt→iam）时这两个标识符**不得跟随重命名**，否则与真实菜单数据断链；仓内演示/mock 数据的 `appName` 用 `'iam'` 即可。相关 fixture：menu.test、generateRoutes.test 中的 `npa-plt-system`，`index.css` 的 `[data-subapp='npa-plt-system']` 选择器。

## 注册流程：src/micro/register.ts

`setupMicroApps()`（§4.4），由 `apps/portal-web/src/main.tsx` 在会话恢复/登录链路后调用一次（幂等）：

1. 遍历 `appConfig.microApps` 构造 `RegistrableApp[]`（MVP 简化：注册全部配置项；**按菜单过滤只注册有权 appName 是 §4.4 目标行为，属后置项**——菜单数据里无权子应用本就不会出现在路由中，容器 div 不渲染即不激活）。
2. 容器 id 取 `container`（去 `#`），缺省 `subapp-<appName>`；`activeRule`/`entry` 直接来自 config。
3. 动态 props：`{ token, permissions, http: window.__http, basename: activeRule }` 合并静态 props（`basename` 显式传递，子应用 `BrowserRouter` 直接消费）。
4. `apps.length > 0` 才 `registerMicroApps(apps)` + `start({ prefetch: true })`；config 里没有的 appName 不注册、不造默认 entry。

## 容器常驻层（SubAppLayer，09-08）

子应用容器 div **不由路由渲染**，而是由 `apps/portal-web/src/micro/subapp-layer.tsx` 的 `SubAppLayer` 常驻渲染（App.tsx 经 `BasicLayout` 的 `contentLayer` slot 注入，挂在 LayoutContent 顶层、keyed/过渡包装之外），路由侧只渲染 null 占位（`generateRoutes.tsx` 的 `SubAppPlaceholder`）：

```tsx
// subapp-layer.tsx：div 永远在 DOM，仅 hidden 切换
<div id={containerId(appName, cfg.container)} data-subapp={appName}
     className="absolute inset-0 overflow-auto"
     hidden={!pathname.startsWith(cfg.activeRule)} />
```

> **Warning（竞态根因）**：曾用「子应用路由渲染容器 div」的方案（§4.5 旧文），会在重挂载时触发 `QiankunError: Target container with #xxx not existed while <app> mounting!`。链路：single-spa patch 了 history → 切 tab 触发的 mount 近乎同步执行；已缓存的子应用（首次 loadApp 有 entry 拉取+执行的数百 ms 掩蔽）重挂载时，mount 先于 React Router 条件渲染出容器执行 → `container.querySelector` 落空。容器常驻后 mount 任何时刻都能找到目标，`hidden` 翻转只是视觉切换，不参与挂载。

> **Warning（空包装 div 遮挡，09-08 修复）**：`LayoutContent` 的 keyed/过渡包装 div（`route-transition-*`）与 SubAppLayer 容器同为 `relative` 叠放——子应用路由（占位 null）下包装是空 div，若可命中会拦截子应用的鼠标事件（`elementFromPoint` 命中空 div 而非子应用内容）。修复方式：`content.tsx` 按 `location.pathname.startsWith(cfg.activeRule)` 判定子应用路由，给包装 div 加 `pointer-events: none`（**过渡元素保留**，动画照常，只是空 div 不再拦鼠标）；host 本地路由（含 iframe）保持 `auto`。

**新增子应用接入要求**：除 config.js 注册 + 生命周期导出外，无需改路由——`SubAppLayer` 从 `appConfig.microApps` 自动展开容器；菜单里的子应用根路由自动渲染占位 + `*` 兜底（子应用内部路由接管）。注意容器 id 必须与 config 的 `container` 一致（SubAppLayer 与 register.ts 都以 config 为准，勿在路由里另造容器）。

## props / 全局状态契约（§4.4、§9.4）

- 动态 props：`{ token, permissions, http, config, basename }`（+ 合并静态 props）。子应用在 `mount` 里接收。
- 主应用用 `initGlobalState` + `store.subscribe` 推送全局状态（token/user/permissions），见 [状态管理](./state-management.md)；子应用 `mount` 里 `props.onGlobalStateChange?.(cb)` 订阅。

## 子应用接入规范（§9）

子应用入口须导出生命周期并支持独立运行（iam 参考实现：`apps/iam-web/src/main.tsx`，基于 vite-plugin-qiankun `useDevMode: true`，dev server 可直接作为 qiankun entry，无需 build+preview）：

- 用 `renderWithQiankun({ bootstrap, mount, update, unmount })`（vite-plugin-qiankun helper）注册生命周期。
- `mount(props)` 里：`props.container ? props.container.querySelector('#root') : document.getElementById('root')`，用 `ReactDOM.createRoot` 渲染；并把 `props` 暂存到模块级变量，供内部取 `basename/token/http/permissions`。
- 独立运行（`!qiankunWindow.__POWERED_BY_QIANKUN__`）时 `render({ basename: '/' })`，方便单独开发（根目录 `pnpm dev:iam`，即 `pnpm --filter @zanelab/iam-web dev`，:8081）。
- 路由用 `BrowserRouter basename={props.basename ?? '/system'}`（history 模式，与 activeRule 一致），子页面挂在 basename 之下。
- 内部请求直接用主应用传入的 `http`（或 `window.__http`），**不重复建 Axios 实例**（§9.3）。

## dev 直载已知噪音（判别清单）

qiankun 直接加载 vite dev server entry（useDevMode）时，控制台会出现以下已知项，**无害、不需修**：

| 日志 | 原因 | 判别 |
|---|---|---|
| `single-spa minified message #31`（bootstrap 未在 4000ms resolve） | 首挂需 vite 按需冷编译整个模块图，超过 single-spa 默认超时；promise 最终 resolve，`mount` 照常执行。qiankun 未暴露超时配置（`FrameworkConfiguration` 无 `timeouts` 透传） | 仅首挂出现；二次进入（vite 缓存热）不现 |
| `[qiankun] globalState tools will be removed in 3.0` | qiankun 2.x `initGlobalState`（§9.4 机制本身）的弃用提示 | 升级 qiankun 3.0 时一并处理 |

> **Warning**：`@vitejs/plugin-react` 注入 head 的 react-refresh preamble 是内联 `<script type="module">`，vite-plugin-qiankun 的 `transformIndexHtml` 只改写 **body** 的 module script，会漏掉它 → import-html-entry 按经典脚本 eval → `Cannot use import statement outside a module`（非致命噪音）。`apps/iam-web/vite.config.ts` 的 `inlineModuleScriptsToDynamicImport` 插件负责补改写；**新增子应用接入时必须带上此插件**，否则每行报错都吓人（应用仍可挂载）。

## 新子应用接入清单（monorepo）

1. 在 `apps/<appName>/` 建子应用（workspace 成员，package 名 `@zanelab/<appName>`，private），依赖在根 lockfile 统一管理（根 `pnpm install` 一次装全仓）。
2. `vite.config.ts` 带上 vite-plugin-qiankun（`useDevMode: true`）与 `inlineModuleScriptsToDynamicImport` 插件（见上）。
3. 基座 `apps/portal-web/public/config.js` 的 `microApps` 注册 entry/container/activeRule——唯一注册来源。
4. 菜单数据加对应 `appName` 的路由项，其余（占位路由、SubAppLayer 容器）自动生效。

## public 子应用路由（10-23）

`MicroAppConfig.public` 声明该子应用的**免鉴权路径**（未登录即可激活）：`true` = 整个 `activeRule` 前缀公开（如 iam-web 承载登录页，`auth.loginPath: '/iam/login'`）；`string[]` = 仅列出的 `activeRule` 子路径公开（如 home 的 `['/home']`——其余子路径仍受鉴权保护）。机制分四块：

- **类型/配置**：`packages/types` `MicroAppConfigSchema.public`（`boolean | string[]`，默认 false）；`config.js` 里按形态配置 + `auth.loginPath` 指向其子路由。
- **渲染分支**：裸渲染（`BareSubAppHost`，仅 `SubAppLayer`，无 RouteGuard/壳）**只给「免鉴权 ∩ 认证页」**（`isPublicAuthPath`，如 iam 登录页）。免鉴权**内容页**（如 home）**带壳渲染**：App.tsx 未登录访问 `/` 且 homePath 免鉴权时 Navigate 过去，`RouteGuard` 对未登录 + 免鉴权路径放行——登录前后 `/home` 容器都在壳内同一位置，无容器换位竞态。已登录回退（POP）落到登录页转 `AuthRedirect`，不重复登录。
- **注册时机**：`main.tsx` bootstrap 里 `setupHostState()` 后即调 `setupMicroApps()`（幂等，`registered` 短路）——公开子应用提前注册，未登录时 token getter 返回 null，登录后自动取最新值；`restoreSession` 尾部的调用直接短路。
- **登录闭环**：props 契约新增 `onLoginSuccess({ token, refreshToken, user })`（`register.ts`，复用幂等 `bootstrapSession`：入库 + 拉菜单 + 注册其余子应用，随后 pushState+popstate 跳 `?from=` 或 homePath）。子应用登录页（iam-web `src/pages/LoginPage.tsx`）用 `props.http`（共享 axios 实例，勿自建）调登录接口，成功后调 `onLoginSuccess` 并停止自身跳转。

## 反面模式

- 在组件/路由里写死子应用 `entry`，或把注册信息散落多处。
- 在路由/页面组件里条件渲染子应用容器 div（React Router 卸载时机与 qiankun mount 竞态 → `Target container not existed`；容器必须走 `SubAppLayer` 常驻方案）。
- 主应用无条件注册所有 `microApps`（含无权子应用），而不是按菜单按需注册。
- 子应用绕过只读共享实例去改拦截器（见 [HTTP 与数据请求](./http-api-guidelines.md)），或绕过沙箱改主应用全局变量。
- 子应用用自己的 basename 之外的绝对路径路由，导致与主应用 URL 层级冲突。
