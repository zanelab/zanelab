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

### qiankun wrapper 填满容器（10-25）

qiankun mount 时在容器（`[data-subapp]`）内**运行时自动插入**一层 `<div id="__qiankun_microapp_wrapper_for_<snakeName>__">`（本仓 qiankun@2.x 源码 `es/loader.js`：wrapper 经 `rawAppendChild` **直接 append 到配置容器**），子应用渲染在 wrapper 内。该层无法在 JSX 声明 class，只能基座 `index.css` 集中约束：

```css
/* 集中约束、零硬编码完整 id —— 新增子应用无需改这里 */
[data-subapp] > div[id^='__qiankun_microapp_wrapper'] {
  width: 100%;
  height: 100%;
}
```

> **Warning（jsdom 无法验证真实 CSS）**：测试只能做契约断言——wrapper 必是 `[data-subapp]` 直接子 div（DOM 结构）+ `index.css` 规则文本含 width/height 100%（CSS 契约），二者缺一即回归。真实高度需浏览器 DOM 检查（wrapper `getBoundingClientRect` 高度 = 容器高度）。子应用自身 `height:100%` 布局依赖此层有高度，缺失则 0 高/塌陷，滚动与弹层定位异常。

## props / 全局状态契约（§4.4、§9.4）

- 动态 props：`{ token, permissions, http, config, basename, preferences, onLoginSuccess, getHostState, onHostStateChange }`（+ 合并静态 props）。子应用在 `mount` 里接收。
- 动态 props 一律 **getter 语义**：single-spa 每次 mount 经 `getProps` 展开执行 getter，子应用每次挂载读 store 最新值——值快照会冻结在注册瞬间（首次注册可能未登录，拿到空 token/permissions）。
- 主应用用 host-state 快照 + 订阅推送全局状态（token/user/permissions/locale/**preferences 外观子集**），见 [状态管理](./state-management.md)；子应用 `mount` 里 `props.onHostStateChange?.(cb)` 订阅。

### 偏好设置下发契约（10-25）

外观子集 `SubAppPreferences`（`register.ts` 导出，props 与快照**共用同一投影函数 `subAppPreferences()`**，字段清单不得两处复刻）：

```ts
interface SubAppPreferences {
  mode: 'light' | 'dark' | 'auto';   // theme.mode，子应用派生自身 data-theme
  colorPrimary: string;              // hsl 字符串（theme.colorPrimary）
  colorDestructive: string;
  colorSuccess: string;
  colorWarning: string;
  radius: string;                    // rem 数值字符串，如 '0.5'
  fontSize: number;                  // px（theme.fontSize）
  colorGrayMode: boolean;            // app.colorGrayMode
  colorWeakMode: boolean;            // app.colorWeakMode
  locale: string;                    // 与快照顶层 locale 同值
}
```

- 快照顶层保持既有跨应用字段 `{ token, user, permissions, locale, preferences }`——外观只经 `preferences` 键下发（§9.4：不灌整个 store）。
- **`pushIfChanged` 必须逐字段比对**（Wrong vs Correct 见下）。
- 子应用消费方式自行决定（如写自身根节点 CSS 变量派生 data-theme）；`experimentalStyleIsolation` 隔离选择器作用域、不隔离变量值，两者不冲突。

## 子应用接入规范（§9）

子应用入口须导出生命周期并支持独立运行（iam 参考实现：`apps/iam-web/src/main.tsx`，基于 vite-plugin-qiankun `useDevMode: true`，dev server 可直接作为 qiankun entry，无需 build+preview）：

- 用 `renderWithQiankun({ bootstrap, mount, update, unmount })`（vite-plugin-qiankun helper）注册生命周期。
- `mount(props)` 里：`props.container ? props.container.querySelector('#root') : document.getElementById('root')`，用 `ReactDOM.createRoot` 渲染；并把 `props` 暂存到模块级变量，供内部取 `basename/token/http/permissions`。
- 独立运行（`!qiankunWindow.__POWERED_BY_QIANKUN__`）时 `render({ basename: '/' })`，方便单独开发（根目录 `pnpm dev:iam`，即 `pnpm --filter @zanelab/iam-web dev`，:8081）。
- 路由用 `BrowserRouter basename={props.basename ?? '/system'}`（history 模式，与 activeRule 一致），子页面挂在 basename 之下。
- 内部请求直接用主应用传入的 `http`（或 `window.__http`），**不重复建 Axios 实例**（§9.3）。

### 独立运行性是硬性约定（§9「子应用须支持独立运行」）

**每个 app 是独立交付单元**——可能由其他团队开发、只跑本应用 dev server 测试。因此独立运行（`pnpm dev:<appName>` 直开 :端口，宿主不存在、props 为 undefined）必须是**一等公民场景**，不是兼容分支：

- **props 全经兼容层消费，业务层无 props 分支**：新建 `src/utils/http.ts`（每 app 一份，勿放 packages——拦截器语义可按 app 联调需要微调；iam 参考实现：`apps/iam-web/src/utils/http.ts`，与 portal-web 同名同位置），模块内判 `props.http` 是否存在：集成态透传宿主 http（只读共享实例），独立态本地兜底 axios + envelope 解包（语义对齐宿主拦截器：成功返 data、失败 reject `Error(msg)`）。业务组件只 import 兼容层的函数（如 `post` / `onLoginSuccess`），**不出现 `props.http ? ... : ...` 散落分支**。
- **独立态行为对齐集成态语义**：401 兜底、登录会话回传（`localStorage` 持会话 + pushState）、envelope 解包——能力对齐宿主同名拦截器/回调，保证两种形态下业务行为一致。
- **独立态样式自持**：子应用须有自己的 CSS 入口（tailwind + daisyUI + 主题 token，iam 参考实现 `apps/iam-web/src/index.css`——集成态样式由宿主注入，该入口只服务独立 dev）。从 `packages/ui` 扫描的组件类名须显式 `@source`（见 [目录结构](./directory-structure.md) Warning）。
- **mock 自持**：子应用自身接口的 MSW handler 放自己 `src/mocks/`（handler 是子应用的 mock 契约，**不跨应用共享、宿主不代持**）；独立态由本应用 worker 直拦，集成态经宿主配置代理转发回来后仍由本应用 worker 拦截（`vite-plugin-qiankun` 下 worker 与独立分支均可启动，同一进程只 start 一次）。
- **`/functions/v1` 调用收敛在 `src/api/` 层**：子应用所有 `/functions/v1/...` 调用必须走自己的 `src/api/`（按域拆文件，形态参照 portal-web `src/api/auth.ts`：命名空间对象 + 层内完成路径拼装、双形态归一化、成功判定、错误语义），页面/组件不出现路径字面量、不写 envelope 成功判定。路径常量（含集成态代理前缀）集中在**零依赖**的 `src/api/endpoints.ts`（零依赖是硬要求：MSW worker 也会 import 它，引入应用入口会把整包拖进 worker bundle），**mock handler 从同一常量派生**（`pagePaths(p) = [p, INTEGRATION_PREFIX + p]`），不逐字复刻——路径漂移在结构上不可能发生。`INTEGRATION_PREFIX` 须与基座 `config.js` 的 activeRule 同步（改 activeRule 两处一起改）；运行时前缀仍从 `props.basename` 派生（独立运行性，见上「props 派生值缺省有义」）。
- **props 派生值缺省有义**：从 `props.basename` 等派生的 API 前缀/路由前缀，独立态（props 为空）时缺省值必须让请求直落本 dev server、路由挂 `/`——不能独立态一跑就请求打到不存在的宿主路径上。

#### Wrong vs Correct

#### Wrong（业务层散落 props 分支，独立态不可跑）

```tsx
// LoginPage.tsx —— 独立运行（props.http undefined）时直接抛错
const res = await getProps().http!.post('/api/v1/auth/otp/send', body);  // 非空断言裸用
```

```tsx
// 每个组件各自判空 —— 分支散落，独立态行为漂移
if (props.http) await props.http.post(url, body);
else /* 各写各的兜底 */;
```

#### Correct（兼容层单点收敛，业务层零感知）

```tsx
// src/utils/http.ts（每 app 一份）
export async function post(path: string, body?: unknown): Promise<unknown> {
  const hostHttp = getProps().http as HostHttp | undefined;
  if (typeof hostHttp?.post === 'function') return hostHttp.post(path, body);
  return getLocalHttp().post(path, body);   // 独立态本地 axios + envelope 解包
}
```

```tsx
// src/api/auth.ts —— 路径常量 + 契约在 api 层，页面只拿领域对象
import { post } from '../utils/http';
import { OTP_SEND_PATH } from './endpoints';
const res = await post(`${apiPrefix()}${OTP_SEND_PATH}`, { email });
```

> **Warning（独立态 401 兜底只跳本应用路由）**：兼容层（`src/utils/http.ts`）的 401 分支 `window.location.replace('/login')` 在**集成态下不能触发**（集成态 401 由宿主拦截器 rejectSessionExpired 承担，独立态本地 RequestClient 根本不在集成态请求链路上——集成态透传 props.http）。若集成态误走本地 axios（`props.http` 判定失效），401 会整页跳到宿主 loginPath 之外的本应用 `/login`，表现为「集成态登录页无输出直跳 /login」。排查集成态 401 异常跳转时先确认请求确实经兼容层判定走了宿主 http。

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
- 全局状态推送**整对象比对**投影子集：投影函数每次返回新对象，引用恒不等 → 无关偏好变更（sidebar collapsed 等）全部误判为推送。必须逐字段比对（`pushIfChanged`，外观字段清单比对与 token/user/permissions/locale 并列）。
- props 与快照**两处复刻** `SubAppPreferences` 字段清单：契约漂移隐患，必须共用 `subAppPreferences()` 单一投影。
- **子应用业务层散落 props 判空分支**（`props.http ? ... : ...`）：独立态行为漂移、判空遗漏即抛错。props 消费单点收敛在 `src/utils/http.ts`（见「独立运行性是硬性约定」）；接口调用再上一层收敛在 `src/api/`（mock handler 与 api 层共用 `src/api/endpoints.ts` 常量）。
- **宿主 worker 代子应用持有 mock 契约**（iam 的 handler 登记进 portal handlers.ts）：子应用接口的 mock 是子应用自身契约，放子应用 `src/mocks/`；宿主调子应用接口一律经配置代理转发（见 [目录结构](./directory-structure.md)——apps 间不共享代码）。
