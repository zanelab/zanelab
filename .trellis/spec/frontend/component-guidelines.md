# 组件规范

> 函数组件 + Hooks；样式与组件一律用 **Tailwind CSS 4 + daisyUI 5** 类名。本项目最关键的组件模式是「路由守卫」和「按钮级权限」。

## 强约束（写 JSX 前必读）

- **写任何 JSX/HTML 之前，先加载 `daisyui` 技能**（已安装到项目 skills），按其 SKILL.md 的「组件发现协议」选组件，并读目标组件的组件指南拿到准确类名；不确定时读多个候选再选。
- 只使用当前 daisyUI 类名 + Tailwind 工具类；daisyUI 没有的组件用 Tailwind 拼，能不用自定义 CSS 就不用（daisyui usage 规则）。
- 颜色只用 daisyUI **语义色**（`primary`、`base-100`、`text-base-content` 等），不要在 daisyUI 颜色上用 `dark:`，也不要用 Tailwind 固定色当文字色——主题由 `data-theme` 驱动（daisyui colors 规则）。
- 用默认变体：没要求就不要 `btn btn-primary`；`primary` 每页只用于最重要的一个元素（usage 规则 12）。
- 后端菜单 `icon` 字段只是**标识符**：一律经单一入口 `<AppIcon name={...}/>`（`src/components/icons/app-icon.tsx`）解析，不要直接把字符串当图标渲染。解析顺序：运行时注册表（config.js `icons` / `iconPackUrl` JSON / `window.__registerIcons`，`src/stores/icon-store.ts`）→ 内置表（`builtin-icons.ts`）→ `svg:` 前缀直通（标识符即 path data，多段用 `|` 分隔）→ null（未命中无图标）。**只收 path-data（`{ viewBox?, paths: string[] }`），永不收任意 SVG 文本**（XSS 边界）。菜单组件的双态 icon 用 `renderMenuIcon(icon, className)`（string 解析 / ReactNode 原样）；增改图标改配置或远端 JSON 即可，免重编译。
- **新增 UI 图标一律入 `BUILTIN_ICONS` 经 `<AppIcon name/>` 渲染，不留内联 SVG**（09-08-icon-consolidation）。图标本身需要交互（如 tabbar 关闭/图钉）用 AppIcon 的 `onClick` 透传；尺寸用 `size-N` className，不用 width/height 属性。近形字形刻意不合并（`home`≠`home-outline`、`moon`≠`moon-star`、`system`≠`sun-moon`、`pin`≠`pin-filled`、`pin-off`≠`pin-off-filled`、`refresh-cw`≠`rotate-cw`）。**保留内联 SVG 白名单**（机制无法表达，勿收拢）：`icons/app-icon.tsx`（渲染器本体）、`theme-toggle/theme-button.tsx`（mask+CSS 动画）、`preferences/icons/` 8 个布局预览插画（多色 104×66）、`authentication/` brand/slogan 品牌插画、`tabs-chrome.tsx` 装饰角（7×7 fill 过渡）、`color-toggle.tsx`（实心色点/Radix 勾）、`menu/menu.tsx` 横三点（fill 实心）。

## 通用约定

- 全部函数组件 + Hooks；不用 class 组件。
- 给用户的提示用 daisyUI `alert`，错误类提示置于 `.toast` 定位（见 [HTTP 与数据请求](./http-api-guidelines.md) 的 notify 约定）。
- 组件需要配置值时通过 `useConfig()`（见 [Hook 规范](./hook-guidelines.md)），不要直接读 `window.__APP_CONFIG__`。

## 本项目 antd → daisyUI 速查

| 原 antd 用法 | 现在用 daisyUI |
|------|------|
| 侧边栏 `Menu`（SidebarMenu） | `menu` 组件，放在 `drawer`（或 `navbar`）里 |
| `message.error(...)` | `alert alert-error`，放进 `.toast` 定位 |
| `Spin`（路由懒加载/按钮加载） | `loading loading-spinner loading-*` |
| `Button` | `btn`（可用在 `<button>/<a>/<input>`） |
| 主题 `dark/light`（config） | `<html data-theme="dark">` 等 daisyUI 主题名 |
| 带图标的菜单项 | `menu` 里 `<li><a>`/`<button>` 前放图标 |

## 页面级权限：路由守卫

从菜单生成的动态路由，每个元素都用 `<RouteGuard>` 包裹，`permission` 来自菜单项（§7.1、§7.2）。

```tsx
<RouteGuard permission={menu.permission}>{loadComponent(menu)}</RouteGuard>
```

守卫语义（`RouteGuard.tsx`，对应 §7.2，与 UI 库无关）：

- `!token` → `<Navigate to={`${loginPath}?from=${encodeURIComponent(pathname+search)}`} replace />`（路径来自 `appConfig.auth.loginPath`，登录后由登录页读 `from` 回跳）。
- **防御（09-07-guard-from-hardening）**：守卫若已在 `loginPath` 上（被误挂载到登录页），跳**裸 `loginPath` 不带 `from`**——否则每次重定向把登录页 URL（含 `from`）再编码进 `from`，指数嵌套直至请求超限（431）。认证页必须渲染在守卫外（`App.tsx`），本防御只是兜底。
- 有 `permission` 但不在权限列表 → `<Navigate to={forbiddenPath} replace />`。
- 否则渲染 children。

## 按钮级权限：Permission

隐藏 / 禁用两种模式不变（§7.4）：

```tsx
interface PermissionProps {
  permission: string;
  children: React.ReactElement;
  fallback?: React.ReactNode;   // mode='hide' 时无权限的替代
  mode?: 'hide' | 'disabled';   // 默认 'hide'
}
```

- `mode='hide'`：无权限渲染 `fallback`（默认 null）。
- `mode='disabled'`：无权限时 `React.cloneElement(children, { disabled: true })`。目标元素是带 `btn` 的原生 `<button>/<a>`；具体禁用实现（原生 `disabled` 属性 / `btn-disabled` 类 / `aria-disabled`）按 daisyui `button` 指南执行。
- 判断依据是 `state.menu.permissions`（后端菜单提取 + 外部合并的权限码，见 [状态管理](./state-management.md)）；无 `permission`（空）视为放行。

## 侧边栏与布局

用 daisyUI `drawer` 组装：桌面常驻 `lg:drawer-open`，小屏通过 `drawer-toggle` 复选框切换（daisyui `drawer` 指南）。`drawer-content` 里放 navbar 与内容区：

```tsx
<div className="drawer lg:drawer-open">
  <input id="app-drawer" type="checkbox" className="drawer-toggle" />
  <div className="drawer-content">{/* navbar + <Outlet/> 内容 */}</div>
  <div className="drawer-side">
    <label htmlFor="app-drawer" aria-label="关闭侧边栏" className="drawer-overlay" />
    <SidebarMenu />
  </div>
</div>
```

`SidebarMenu` 由 store 的 `state.menu.menus` 递归渲染 `menu`：有 `children` 的项用 `<details>` 做可折叠子菜单，叶子项用 `<li><a>`（onClick 里 `preventDefault()` + `useNavigate()(path)`），当前路径加 `menu-active`。按 daisyui `menu` 指南取类名与结构。

## 子应用挂载容器

菜单项 `appName` 非 `portal`（也不为空）时渲染**纯容器 `div`**，由 qiankun 挂子应用（§4.5）；本地代码不要 import 子应用：

```tsx
const microAppConfig = appConfig.microApps[menu.appName];
const containerId = microAppConfig?.container?.replace('#', '') || `subapp-${menu.appName}`;
return <div id={containerId} style={{ width: '100%', height: '100%' }} />;
```

## 路由与懒加载

- 本地页面用 `lazy(() => import('../pages/${componentPath}'))` 包裹 `<Suspense>`，fallback 用 daisyUI `loading`：`<span className="loading loading-spinner loading-lg" />`（§7.1）。
- 兜底路由由动态路由生成追加：`config.route.forbiddenPath`、404 兜底 `*`，首页 `'/'` 重定向 `config.route.homePath`（§7.1）。

## 主题

- 主题由 daisyUI 主题系统提供：按项目 CSS（见 [目录结构](./directory-structure.md)）启用的主题，在 `<html data-theme="...">` 上切换；默认随 `config.layout.theme`（如 `dark`/`light`）。
- 需要用户手动切主题时用 daisyUI `theme-controller`（checkbox 的 `value` = 主题名）；不用自己写一套暗色变量。

> **Warning（嵌套 `.dark` 遮蔽运行时选色，09-08 修复）**：`usePreferencesRuntime` 把运行时可配置的变量（`--primary` + ramp、`--success/--warning/--destructive`、`--radius`、`--font-size-base`）内联写在 `<html>` 上；这些变量的默认值只定义在**根锚点**（light 块的 `:root` 与 `index.css` 的 `:root.dark` 块），**不能**放进 `.dark` 块——认证页（`authentication.tsx`）和半暗侧栏（`sidebar.tsx`）会在子树挂嵌套 `.dark` 类，CSS 自定义属性取最近祖先声明，嵌套块会用静态默认值遮蔽 `<html>` 上的内联值，表现为「亮色跟色、暗色无效」。给嵌套 `.dark` 区域新增 token 时，运行时管理的动态变量一律走 `:root(.dark)`。
> 另注：daisyUI 组件圆角不消费 `--radius`（那是 Tailwind `rounded-*` 的源），而是 `--radius-field/-selector/-box`——`usePreferencesRuntime` 已做同步映射（field = radius/2，其余 = radius），改圆角逻辑时两边都要动。

## 反面模式

- 组件里硬编码权限码集合，而不是读 `state.menu.permissions`。
- 引入另一套组件库或自造「样式组件」包装（daisyUI 是类名，不是需要二次封装的 React API）。
- 用 `dark:` 前缀或 Tailwind 固定色（`text-gray-800`）做文字颜色，破坏深色主题可读性。
- 在无权限 `disabled` 场景直接改 children 内部状态绕过禁用。
