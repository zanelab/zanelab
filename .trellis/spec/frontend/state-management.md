# 状态管理

> 全部状态用 zustand，`src/stores/` 一文件一 store：**auth**（登录态/token）、**menu**（菜单树/权限码）与壳内部状态（布局/偏好/标签栏/时区）同库同目录（design §2 边界：**壳组件只经 props 收数据；业务代码不 import 壳 store**）。组件内部 UI 状态用本地 `useState`，不塞进全局 store。

## Store 划分

`src/stores/` 下按 store 文件拆分（`auth-store.ts`、`menu-store.ts`），action 定义在 store 接口上（既有约定参照 `tabbar-store.ts`）：

- **auth**：`token`、`refreshToken`、`user`；`setAuth`/`setToken`/`setUser`/`logout` 等 action。token 同时持久化在 `localStorage`（键 `config.auth.tokenKey` / `refreshTokenKey`），并同步到 store 与 qiankun 全局状态（§5.1、§9.4）。不接 persist 中间件——localStorage 读写由 main.tsx / bootstrapSession / handleLogout 手动完成。
- **menu**：`menus: MenuItem[]`、`permissions: string[]`；`setMenus`（派生权限）/`mergePermissions`（外部并入）/`clearMenus`（重置）。

消费方式：React 组件用 `useAuthStore(s => s.xxx)` selector（默认 `Object.is` 比较，选基础字段无需 shallow）；非 React 模块用 `useAuthStore.getState().token` / `.setToken(...)`；跨模块订阅用 `useXxxStore.subscribe(cb)`。

不要把以下放全局 store：表单输入、弹窗开关、需要低频率变化的 UI 态——用本地 state 即可。

## 菜单加载（MVP 实现）

MVP 未把拉取做进 store action，拉取与副作用拆在两处（§6.2 的简化落地）：

- `src/micro/register.ts` 的 `bootstrapSession(token, refreshToken?, user?)`：登录后编排——存 localStorage → `setAuth` → `fetchMenus()` → `setMenus`。
- `src/main.tsx` 的会话恢复：localStorage 有 token 时 `setToken` → `fetchMenus` → `setMenus`（菜单拉取失败由 401 链路兜底登出）。

`setMenus` action 内部用 `flattenPermissions` 递归提取权限码；外部权限源用 `mergePermissions` 并入。若后续把拉取收进 store，保持「权限派生在 `setMenus` 内、注册副作用在其外」的边界即可。

## 菜单视图分流（menuType，09-08）

`MenuItem.menuType` 可选字段决定条目的**渲染目标**（契约定义在 `src/types/index.ts`）：

- 缺省 / `'normal'`：侧边栏/顶栏导航 + 全局搜索（现状，存量数据零影响）。
- `'user-dropdown'`：用户下拉框自定义菜单，**支持多级**（09-08 嵌套扩展）——`children` 递归消费：有 children 的项为目录语义（悬停级联弹出子菜单、自身不导航，daisyUI `dropdown-hover dropdown-left`——下拉框在 header 最右缘，向左弹防溢出），叶子跳转 `path`；子树内层级不再判定 `menuType`；不与 `appName` 组合。

分流不变式（改动前必读）：

- `useMenuStore` 的 `menus` 永远存**全量原始契约**，不在 store 里按类型过滤——分流是视图关注点，不是数据关注点。
- 分流收敛在 App.tsx 装配层，经 `src/utils/menu-views.ts` 纯函数：`toShellMenus`（壳菜单，剔 user-dropdown 子树，侧边栏/顶栏/搜索数据源）、`collectDropdownMenus`（收集下拉菜单项）。壳组件/`buildMenuRoutes` 不感知 `menuType`。
- 路由生成与 route-meta 注册走**全量**菜单树——user-dropdown 页面照常产路由、受 RouteGuard 权限控制、tabbar 标题/面包屑正常。
- 可见性仍由后端控制（接口返回即有权），下拉框不做二次权限过滤。

菜单多语（09-09）：`i18nKey` 随全量契约一并入 store（与 `name` 同级透传，不单独建索引）；**翻译在渲染期经 `menuTitle` 解析**（`src/locales/i18n.ts`，无 key/缺条目回退 `name`，见 [国际化 i18n](./i18n-guidelines.md)）——store 与 menuType 分流不变式均不受影响；tabbar 持久化同样只存 `name`/`i18nKey` 原始值，标题在渲染层解析。

## 权限码的来源

权限码**单一来源是后端菜单**（`menu.permission` 递归提取），可再并入独立权限接口返回的额外码（§6.2）。页面守卫与按钮权限都只读 `useMenuStore` 的 `permissions`。

## 登出清理

登出要清干净，见 `src/utils/auth.ts` 的 `handleLogout`（§5.3）：

1. `localStorage.removeItem(tokenKey)` / `removeItem(refreshTokenKey)`
2. `useAuthStore.getState().logout()`、`useMenuStore.getState().clearMenus()`
3. `window.dispatchEvent(new CustomEvent('global-logout'))` → 根组件跳登录页

> **Warning**：`global-logout` 的监听方（`watchGlobalLogout`）**只做导航**。事件本身由 `handleLogout` 派发、清理已完成；监听里再调 `handleLogout()` 会再次派发同一事件 → 无限循环。

## qiankun 全局状态同步

主应用建快照并订阅三个 store（auth/menu/preferences）推送给子应用（§9.4，实现在 `src/micro/register.ts` 的 `setupHostState`，`main.tsx` 调用一次，幂等）。**多订阅共用同一 snapshot + 比对函数**：

```ts
const snapshot = () => ({
  token: useAuthStore.getState().token,
  user: useAuthStore.getState().user,
  permissions: useMenuStore.getState().permissions,
  locale: usePreferencesStore.getState().app.locale,
  preferences: subAppPreferences(usePreferencesStore.getState()), // 外观子集（见 microfrontend-guidelines）
});
const pushIfChanged = () => {
  const next = snapshot();
  // 顶层字段引用比对 + preferences 外观子集**逐字段**比对，任一真变才派发
};
useAuthStore.subscribe(pushIfChanged);
useMenuStore.subscribe(pushIfChanged);
usePreferencesStore.subscribe(pushIfChanged);
```

- zustand `subscribe` 无 selector 时每次 `setState` 都触发，由 `pushIfChanged` 的快照比对兜住（`permissions` 每次重算为新数组，引用比对即够）。
- 子应用经 `props.getHostState()`（读快照）/ `props.onHostStateChange(cb)`（订阅）消费；偏好设置外观子集契约见 [微前端与子应用](./microfrontend-guidelines.md) 的「偏好设置下发契约」。
- **preferences 子集不能整对象比对**：投影函数每次返回新对象，引用恒不等 → 无关偏好变更（sidebar collapsed 等）全部误推。必须逐字段比对外观子集（`pushIfChanged` 内实现）。
- 推送内容**只**包含需要共享的跨应用数据，别把整个 store state 灌进去；订阅触发注意按需更新，避免子应用无谓重渲染（§12）。

## 反面模式

- 两个地方各存一份权限/菜单并手动同步——菜单在 store，别复制到组件 state。
- token 只放 localStorage 不同步 store，或只放 store 不持久化导致刷新丢失登录态。
- 在任意组件里私自再调一次 `setupMicroApps` / `registerMicroApps`（重复注册）。
